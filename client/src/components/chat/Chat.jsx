import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import LoadingSpinner from './LoadingSpinner'
import { FiUpload, FiSend, FiDownload, FiX, FiFile, FiFolder } from 'react-icons/fi';
import { exportToPDF, exportToDocx, exportToTXT } from '../../utils/exportUtils'
import "./chat.css"

const Chat = () => {
  const [files, setFiles] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [wantSummary, setWantSummary] = useState(false);
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
    if (files.length === 0) {
      alert('Please upload files');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('wantSummary', wantSummary);
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
            <button
              className={`chat-summary-toggle ${wantSummary ? 'active' : ''}`}
              onClick={() => {
                setWantSummary(!wantSummary);
                if (wantSummary) setPrompt('');
              }}
            >
              <span>Summarize {wantSummary ? '✓' : '?'}</span>
            </button>
          </div>

          {wantSummary && (
            <input 
              type="text" 
              className="chat-input" 
              placeholder="Instructions for summarization..." 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          )}
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="chat-conversations">
            {conversations.map((conv, index) => (
              <div key={index} className="chat-conversation">
                <div className="chat-conversation-header">
                  <div className="chat-conversation-title">
                    <span className="file-name">{conv.originalName}</span>
                    <span className="chat-date">{new Date(conv.createdAt).toLocaleString()}</span>
                  </div>
                  {conv.driveFolderUrl && (
                    <div className="chat-drive-links">
                      <a href={conv.driveFolderUrl} target="_blank" rel="noopener noreferrer">
                        <FiFolder /> View in Drive
                      </a>
                      {conv.driveFileUrl && (
                        <a href={conv.driveFileUrl} target="_blank" rel="noopener noreferrer">
                          <FiFile /> View File
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="chat-messages">
                  {conv.messages.map((msg, msgIndex) => (
                    <div 
                      key={msgIndex} 
                      className={`chat-message ${msg.role === 'user' ? 'user' : 'assistant'}`}
                    >
                      {msg.role === 'user' ? (
                        <p>{msg.content}</p>
                      ) : (
                        <>
                          <ReactMarkdown 
                            className="markdown-content"
                            components={{
                              p: ({node, ...props}) => <p className="message-paragraph" {...props} />,
                              ul: ({node, ...props}) => <ul className="message-list" {...props} />,
                              li: ({node, ...props}) => <li className="message-list-item" {...props} />,
                              blockquote: ({node, ...props}) => <blockquote className="message-quote" {...props} />
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                          <div className="export-buttons">
                            <button onClick={() => handleExport(msg.content, 'pdf')}>
                              <FiDownload /> PDF
                            </button>
                            <button onClick={() => handleExport(msg.content, 'docx')}>
                              <FiDownload /> DOCX
                            </button>
                            <button onClick={() => handleExport(msg.content, 'txt')}>
                              <FiDownload /> TXT
                            </button>
                          </div>
                        </>
                      )}
                      <span className="message-time">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default Chat
