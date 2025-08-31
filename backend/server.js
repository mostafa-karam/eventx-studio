const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: FRONTEND_ORIGIN,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const connectDB = async () => {
  try {
    // For development, we'll use a local MongoDB connection
    // In production, this would be MongoDB Atlas
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventx-studio';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const ticketRoutes = require('./routes/tickets');
const analyticsRoutes = require('./routes/analytics');
const paymentRoutes = require('./routes/payments');
const bookingRoutes = require('./routes/booking');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const supportRoutes = require('./routes/support');
const marketingRoutes = require('./routes/marketing');
const categoriesRoutes = require('./routes/categories');

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/categories', categoriesRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'EventX Studio API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();

