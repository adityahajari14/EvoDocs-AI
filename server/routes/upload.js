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
    console.log('Want summary:', req.body.wantSummary);

    const files = req.files;
    const userPrompt = req.body.prompt;
    const wantSummary = req.body.wantSummary === 'true';
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const processResults = [];

    for (const file of files) {
      console.log('Processing file:', file.originalname);
      
      const summary = new Chat({
        originalName: file.originalname,
        userPrompt,
        messages: [{
          role: 'user',
          content: `Uploaded file: ${file.originalname} with prompt: ${userPrompt}`
        }]
      });

      // Run gemini.py
      const geminiResult = await new Promise((resolve, reject) => {
        const tempFileName = `temp_${Date.now()}${path.extname(file.originalname)}`;
        
        const pythonProcess = spawn('python', [
          path.join(__dirname, '../../llm-server/gemini.py'),
          tempFileName,
          userPrompt || ''
        ]);

        let pythonOutput = '';
        let pythonError = '';

        pythonProcess.stdin.write(file.buffer);
        pythonProcess.stdin.end();

        pythonProcess.stdout.on('data', (data) => {
          pythonOutput += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          pythonError += data.toString();
        });

        pythonProcess.on('close', async (code) => {
          if (code !== 0) {
            reject(new Error(`Python process failed: ${pythonError}`));
            return;
          }

          try {
            const cleanOutput = pythonOutput.trim().replace(/\0/g, '');
            const result = JSON.parse(cleanOutput);

            if (!result.success) {
              reject(new Error(result.error || 'Processing failed'));
              return;
            }

            let finalOutput = result.formatted_output;  // This will only contain folder info

            if (!wantSummary) {
              summary.category = result.category;
              summary.messages.push({
                role: 'assistant',
                content: finalOutput
              });
              await summary.save();
              resolve({
                ...result,
                formatted_output: finalOutput
              });
            } else {
              // Run summary.py if summary is requested
              const summaryArgs = [
                path.join(__dirname, '../../llm-server/summary.py')
              ];
              
              // Only add user prompt if it's not empty
              if (userPrompt?.trim()) {
                summaryArgs.push(userPrompt.trim());
              }

              const summaryProcess = spawn('python', summaryArgs);

              // Add error handler for summary process
              summaryProcess.stderr.on('data', (data) => {
                console.error('Summary process error:', data.toString());
              });

              let summaryOutput = '';
              summaryProcess.stdin.write(result.summary);
              summaryProcess.stdin.end();

              summaryProcess.stdout.on('data', (data) => {
                summaryOutput += data.toString();
              });

              summaryProcess.on('close', async (summaryCode) => {
                if (summaryCode !== 0) {
                  reject(new Error('Summary generation failed'));
                  return;
                }

                const summaryResult = JSON.parse(summaryOutput);
                if (!summaryResult.success) {
                  reject(new Error(summaryResult.error));
                  return;
                }

                // Combine folder and summary in the formatted output with proper line breaks
                finalOutput = `${result.formatted_output}\nSummary:\n${summaryResult.summary}`;

                summary.category = result.category;
                summary.summary = summaryResult.summary;
                summary.messages.push({
                  role: 'assistant',
                  content: finalOutput
                });
                await summary.save();
                
                resolve({
                  ...result,
                  summary: summaryResult.summary,
                  formatted_output: finalOutput
                });
              });
            }
          } catch (error) {
            reject(new Error('Failed to parse Python output'));
          }
        });
      });

      processResults.push(geminiResult);
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
