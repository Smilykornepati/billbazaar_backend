const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/database');
require('dotenv').config();

const app = express();

// Connect to MySQL
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/printers', require('./routes/printers'));

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    message: 'BillBazar API is running!',
    database: 'MySQL',
    status: 'Connected',
    endpoints: {
      auth: '/api/auth',
      bills: '/api/bills',
      printers: '/api/printers'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
});
