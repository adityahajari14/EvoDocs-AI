const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const uploadRouter = require('./routes/upload');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/dist')));

// API Routes
app.use('/api', uploadRouter);

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Catch-all route to serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.log('Unhandled Rejection:', err);
  process.exit(1);
});
