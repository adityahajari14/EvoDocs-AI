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

      // First run gemini.py
      const geminiResult = await new Promise((resolve, reject) => {
        const tempFileName = `temp_${Date.now()}${path.extname(file.originalname)}`;
        
        const pythonProcess = spawn('python', [
          path.join(__dirname, '../../llm-server/gemini.py'),
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
            // Ensure we have valid JSON output
            const cleanOutput = pythonOutput.trim().replace(/\0/g, '');
            const result = JSON.parse(cleanOutput);
            
            if (!result.success) {
              reject(new Error(result.error || 'Processing failed'));
              return;
            }

            // Update the Drive upload process to use the new handler
            const driveUploadProcess = spawn('python', [
              path.join(__dirname, '../../llm-server/utils/drive_handler.py')
            ]);

            driveUploadProcess.stdin.write(JSON.stringify({
              fileName: file.originalname,
              fileContent: file.buffer.toString('base64'),
              folderName: result.category
            }));
            driveUploadProcess.stdin.end();

            let driveResponse = '';
            driveUploadProcess.stdout.on('data', (data) => {
              driveResponse += data.toString();
            });

            driveUploadProcess.on('close', async (uploadCode) => {
              if (uploadCode === 0) {
                const driveResult = JSON.parse(driveResponse);
                if (driveResult.success) {
                  result.driveFileId = driveResult.fileId;
                  result.driveFolderId = driveResult.folderId;
                }
              }

              // Continue with existing logic for summary and saving
              if (!wantSummary) {
                summary.extractedText = result.extractedText;
                summary.summary = result.summary;
                summary.driveFileId = result.driveFileId;
                summary.driveFolderId = result.driveFolderId;
                summary.category = result.category;
                summary.messages.push({
                  role: 'assistant',
                  content: result.summary
                });
                await summary.save();
                resolve(result);
              } else {
                // If summary is requested, run the summary script
                const summaryProcess = spawn('python', [
                  path.join(__dirname, '../../llm-server/summary.py'),
                  userPrompt || ''
                ]);

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
                    reject(new Error(summaryResult.error || 'Summary generation failed'));
                    return;
                  }

                  summary.extractedText = result.extractedText;
                  summary.summary = summaryResult.summary;
                  summary.messages.push({
                    role: 'assistant',
                    content: result.summary
                  }, {
                    role: 'assistant',
                    content: summaryResult.summary
                  });
                  await summary.save();
                  resolve({
                    ...result,
                    summary: summaryResult.summary
                  });
                });
              }
            });
          } catch (error) {
            console.error('Parse error:', error, 'Output:', pythonOutput);
            reject(new Error('Failed to parse Python output'));
          }
        });

        try {
          // Write file buffer directly without encoding
          pythonProcess.stdin.write(file.buffer);
          pythonProcess.stdin.end();
        } catch (error) {
          console.error('Write error:', error);
          reject(new Error('Failed to write file to Python process'));
        }
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
