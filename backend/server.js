const express = require("express");
const mongoose = require("mongoose");
const dns = require("dns");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const socketIo = require("socket.io");
const { getFrontendUrl, isSecureUrl } = require("./utils/frontendUrl");
require("dotenv").config();

const app = express();
app.set('trust proxy', 1);

// Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.material.com", "https://fonts.googleapis.com/css2"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://lifeqr-new.onrender.com", "/uploads/photos/", "/uploads/reports/"],
      connectSrc: ["'self'", "https://lifeqr-new.onrender.com", "ws:", "wss:", "http://localhost:5000", "https://localhost:5000"]
    }
  }
}));

// CORS Configuration
const allowedOrigins = [
  getFrontendUrl(),
  "https://lifeqr-new.onrender.com",
  "http://localhost:5000",
  "https://localhost:5000"
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again after 15 minutes"
});
app.use("/api/v1/auth/login", authLimiter);
app.use("/api/v1/auth/register", authLimiter);
app.use("/api/v1/auth/forgot-password", authLimiter);

// Payload limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '50kb', extended: true }));
app.use(cookieParser());

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Version 1 Routes
const authRoutes = require("./routes/v1/auth");
const patientProfileRoutes = require("./routes/v1/patientProfile");
const sosRoutes = require("./routes/v1/sos");
const reportsRoutes = require("./routes/v1/reports");
const medicalHistoryRoutes = require("./routes/v1/medicalHistory");
const doctorAccessRoutes = require("./routes/v1/doctorAccess");
const adminRoutes = require("./routes/v1/admin");

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/patient", patientProfileRoutes);
app.use("/api/v1/sos", sosRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use("/api/v1/history", medicalHistoryRoutes);
app.use("/api/v1/doctor-access", doctorAccessRoutes);
app.use("/api/v1/admin", adminRoutes);

// Health check route
app.get("/api/v1/health", (req, res) => {
  res.json({ 
    status: "healthy",
    message: "LifeQR API v1 is fully operational 🚑",
    timestamp: new Date().toISOString()
  });
});

// API error handler to return generic JSON error to clients
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (req.originalUrl.startsWith('/api')) {
    const isProd = process.env.NODE_ENV === 'production';
    return res.status(500).json({ 
      error: isProd ? 'An internal server error occurred' : err.message,
      correlationId: req.headers['x-request-id'] || 'N/A'
    });
  }
  next(err);
});

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Fail fast if critical environment variables are missing
    if (!process.env.MONGO_URI) {
      console.error('❌ Error: MONGO_URI is required in all environments. Please set it in your environment variables or .env file.');
      process.exit(1);
    }
    if (!process.env.JWT_SECRET) {
      console.error('❌ Error: JWT_SECRET is required. Please set it in your environment variables or .env file.');
      process.exit(1);
    }

    const mongoURI = process.env.MONGO_URI;

    if (mongoURI.startsWith('mongodb+srv://')) {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      console.log('🔎 Using public DNS servers for Atlas SRV resolution');
    }

    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    
    console.log("✅ MongoDB Connected Successfully");

    // Start server - listen on all network interfaces
    const frontendUrl = getFrontendUrl();
    const useHttps = false; // Force HTTP locally and let proxies (Render, etc.) handle SSL

    let server;
    if (useHttps) {
      // Check if HTTPS certificates exist locally
      const certPath = path.join(__dirname, 'certs', 'server.crt');
      const keyPath = path.join(__dirname, 'certs', 'server.key');
      const secureConfig = fs.existsSync(certPath) && fs.existsSync(keyPath);

      if (secureConfig) {
        const options = {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath)
        };
        server = https.createServer(options, app);
      } else {
        server = http.createServer(app);
      }
    } else {
      server = http.createServer(app);
    }

    // Integrate Socket.IO with server instance
    const io = socketIo(server, {
      cors: {
        origin: allowedOrigins,
        credentials: true
      }
    });

    // Make Socket.IO available to routes
    app.set('io', io);

    io.on('connection', (socket) => {
      console.log(`🔌 New client connected to Socket.IO: ${socket.id}`);
      
      socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`👤 Client joined notification room: ${room}`);
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🏥 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    server.on('error', (listenErr) => {
      if (listenErr.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use.`);
      } else {
        console.error('❌ Server listen failed:', listenErr);
      }
      process.exit(1);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, closing server gracefully...');
      await mongoose.connection.close();
      process.exit(0);
    });

  } catch (err) {
    console.error("❌ Server failed to start:", err);
    process.exit(1);
  }
};

startServer();
