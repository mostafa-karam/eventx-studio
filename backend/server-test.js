const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Test server is running!' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server is running on port ${PORT}`);
});

