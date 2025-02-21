const express = require('express');
const router = express.Router();
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const Chat = require('../models/Chat');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.array('files', 5), async (req, res) => {
  try {
    console.log('Received files:', req.files?.length);
    console.log('Received prompt:', req.body.prompt);

    const files = req.files;
    const userPrompt = req.body.prompt;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const processResults = [];

    for (const file of files) {
      console.log('Processing file:', file.originalname);
      
      const summary = new Summary({
        originalName: file.originalname,
        userPrompt,
        messages: [{
          role: 'user',
          content: `Uploaded file: ${file.originalname} with prompt: ${userPrompt}`
        }]
      });

     
      const pythonResult = await new Promise((resolve, reject) => {
        const tempFileName = `temp_${Date.now()}${path.extname(file.originalname)}`;
        
        const pythonProcess = spawn('python', [
          path.join(__dirname, '../../llm-server/summarizer.py'),
          tempFileName,
          userPrompt || ''
        ]);

        let pythonOutput = '';
        let pythonError = '';

        pythonProcess.stdin.on('error', (error) => {
          console.error('stdin error:', error);
          reject(new Error('Failed to write to Python process'));
        });

        pythonProcess.stdout.on('data', (data) => {
          pythonOutput += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          pythonError += data.toString();
        });

        pythonProcess.on('error', (error) => {
          console.error('Process error:', error);
          reject(error);
        });

        pythonProcess.on('close', async (code) => {
          console.log('Python process finished with code:', code);
          if (code !== 0) {
            console.error('Python error output:', pythonError);
            reject(new Error(`Python process failed: ${pythonError}`));
            return;
          }
          
          try {
            const result = JSON.parse(pythonOutput);
            if (!result.success) {
              reject(new Error(result.error || 'Processing failed'));
              return;
            }

            summary.extractedText = result.extractedText;
            summary.summary = result.summary;
            summary.messages.push({
              role: 'assistant',
              content: result.summary
            });
            await summary.save();
            resolve(result);
          } catch (error) {
            console.error('Parse error:', error, 'Output:', pythonOutput);
            reject(new Error('Failed to parse Python output'));
          }
        });

        try {
          pythonProcess.stdin.write(file.buffer);
          pythonProcess.stdin.end();
        } catch (error) {
          console.error('Write error:', error);
          reject(new Error('Failed to write file to Python process'));
        }
      });

      processResults.push(pythonResult);
    }

    res.json({ 
      success: true, 
      results: processResults
    });

  } catch (error) {
    console.error('Upload route error:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/conversations', async (req, res) => {
  try {
    const conversations = await Chat.find()
      .select('messages createdAt originalName')
      .sort('-createdAt')
      .limit(50);
    res.json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
