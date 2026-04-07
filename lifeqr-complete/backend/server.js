const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      // Allow requests from non-browser clients or file:// local pages
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS policy violation: origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
const authRoutes = require("./routes/auth");
const patientRoutes = require("./routes/patient");

app.use("/api/auth", authRoutes);
app.use("/api/patient", patientRoutes);

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy",
    message: "LifeQR backend is running 🚑",
    timestamp: new Date().toISOString()
  });
});

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Check if MongoDB URI is provided
    if (!process.env.MONGO_URI) {
      console.warn('⚠️  MONGO_URI not found in .env file');
      console.log('📝 Using default MongoDB connection string for development');
      console.log('💡 For production, please set MONGO_URI in your .env file');
    }

    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifeqr';

    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log("✅ MongoDB Connected Successfully");

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 API endpoint: http://localhost:${PORT}/api`);
      console.log(`🌐 Frontend: http://localhost:${PORT}`);
      console.log(`🏥 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error("❌ Server failed to start:", err.message);
    
    if (err.name === 'MongooseServerSelectionError') {
      console.log('\n💡 MongoDB Connection Tips:');
      console.log('1. Make sure MongoDB is running locally, or');
      console.log('2. Set MONGO_URI in .env with your MongoDB Atlas connection string');
      console.log('3. Check your network connection and firewall settings');
    }
    
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

startServer();
