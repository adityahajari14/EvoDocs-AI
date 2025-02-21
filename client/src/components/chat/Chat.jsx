import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import LoadingSpinner from './LoadingSpinner'
import { FiUpload, FiSend, FiDownload, FiX, FiFile } from 'react-icons/fi';
import "./chat.css"

const Chat = () => {
  const [files, setFiles] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/conversations');
      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(file => 
      file.type === 'application/pdf' || file.type === 'text/plain'
    );
    
    if (validFiles.length !== selectedFiles.length) {
      alert('Only PDF and TXT files are allowed');
    }
    
    setFiles(prevFiles => [...prevFiles, ...validFiles]);
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async () => {
    if (files.length === 0 && !prompt) {
      alert('Please provide a prompt or upload files');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('prompt', prompt || '');

    try {
      const response = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        await fetchConversations();
        setFiles([]);
        setPrompt('');
      } else {
        throw new Error(data.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to process files: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (content, type) => {
    switch(type) {
      case 'pdf':
        exportToPDF(content);
        break;
      case 'docx':
        exportToDocx(content);
        break;
      case 'txt':
        exportToTXT(content);
        break;
      default:
        console.error('Unsupported export type');
    }
  };

  return (
    <main className={`chat-main`}>
      <h1 className="chat-heading">Paper Trail AI</h1>

      <div className="chat-container">
        {files.length > 0 && (
          <div className="chat-files-wrapper">
            <h3 className="chat-files-title">Selected Files:</h3>
            <div className="chat-files">
              {files.map((file, index) => (
                <div key={index} className="chat-file">
                  <div className="chat-file-info">
                    <FiFile className="file-icon" />
                    <span className="chat-file-name" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                  <button 
                    className="chat-file-remove"
                    onClick={() => removeFile(index)}
                    title="Remove file"
                  >
                    <FiX />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="chat-inputContainer">
          <input 
            type="text" 
            className="chat-input" 
            placeholder="Instructions for summarization..." 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="chat-buttons">
            <input
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              onChange={handleFileChange}
              id="file-upload"
              className="chat-file-input"
              multiple
            />
            <label htmlFor="file-upload" className="chat-file-label">
              <FiUpload />
              <span>Choose Files</span>
            </label>
            <button className="chat-submitButton" onClick={handleSubmit} disabled={isLoading}>
              <FiSend />
              <span>{isLoading ? 'Processing...' : 'Submit'}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Chat
