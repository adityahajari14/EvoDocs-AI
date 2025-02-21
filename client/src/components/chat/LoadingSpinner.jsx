import React from 'react';
import './loadingSpinner.css';

const LoadingSpinner = () => {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p className="loading-text">Processing your request...</p>
    </div>
  );
};

export default LoadingSpinner;
