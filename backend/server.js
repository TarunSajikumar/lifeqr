const express = require("express");
const mongoose = require("mongoose");
const dns = require("dns");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const { getFrontendUrl, isSecureUrl } = require("./utils/frontendUrl");
require("dotenv").config();

const app = express();
app.set('trust proxy', true);

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require("./routes/auth");
const patientRoutes = require("./routes/patient");
const adminRoutes = require("./routes/admin");

app.use("/api/auth", authRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/admin", adminRoutes);

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy",
    message: "LifeQR backend is running 🚑",
    timestamp: new Date().toISOString()
  });
});

// API error handler to return JSON instead of HTML
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (req.originalUrl.startsWith('/api')) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
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
    // Fail fast in production if MongoDB URI is missing
    if (!process.env.MONGO_URI) {
      const message = 'MONGO_URI is required in production. Set it in Render environment variables.';
      console.error(`❌ ${message}`);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
      console.warn('⚠️  MONGO_URI not found in .env file. Using local MongoDB for development only.');
    }

    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifeqr';

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
    const publicHttpsAvailable = isSecureUrl(frontendUrl);

    // Check if HTTPS certificates exist locally
    const certPath = path.join(__dirname, 'certs', 'server.crt');
    const keyPath = path.join(__dirname, 'certs', 'server.key');
    const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);

    let server;

    if (useHttps) {
      const options = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
      };
      server = https.createServer(options, app);
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 HTTPS Server running on port ${PORT}`);
        console.log(`\n🔒 SECURE CONNECTION (HTTPS)`);
        console.log(`📍 Localhost: https://localhost:${PORT}`);
        console.log(`🌐 Public URL: ${frontendUrl}`);
        console.log(`\n📱 Camera access is now enabled on all devices!`);
        console.log(`🏥 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`\n⚠️  Note: You may see a security warning on first visit - this is normal for self-signed certificates. Click "Continue" or "Accept Risk".`);
      });
    } else if (publicHttpsAvailable) {
      server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 HTTP Server running on port ${PORT} behind HTTPS proxy`);
        console.log(`\n🌐 Public URL: ${frontendUrl}`);
        console.log(`📱 Camera access should work when the app is opened through the public HTTPS URL above.`);
        console.log(`🏥 Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    } else {
      server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 HTTP Server running on port ${PORT}`);
        console.log(`\n⚠️  WARNING: Using HTTP - Camera access will NOT work on mobile devices`);
        console.log(`📍 Localhost: http://localhost:${PORT}`);
        console.log(`\n✅ TO FIX CAMERA ACCESS:`);
        console.log(`   1. Stop this server (Ctrl+C)`);
        console.log(`   2. Run: node generate-cert.js`);
        console.log(`   3. Run: npm start (again)`);
        console.log(`4. Access via HTTPS: ${frontendUrl}/emergency_access.html`);
        console.log(`🏥 Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    }

    server.on('error', (listenErr) => {
      if (listenErr.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please stop the process using it or set PORT to a free port.`);
      } else {
        console.error('❌ Server listen failed:', listenErr);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error("❌ Server failed to start:", err);
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Exiting because MongoDB connection failed in production.');
      process.exit(1);
    }

    console.log("\n⚠️  Attempting to start server without MongoDB connection for development only...");
    
    const frontendUrl = getFrontendUrl();
    const publicHttpsAvailable = isSecureUrl(frontendUrl);
    
    // Check if HTTPS certificates exist
    const certPath = path.join(__dirname, 'certs', 'server.crt');
    const keyPath = path.join(__dirname, 'certs', 'server.key');
    const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);
    
    let server;
    
    if (useHttps) {
      const options = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
      };
      server = https.createServer(options, app);
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`\n⚠️  SERVER RUNNING WITHOUT DATABASE (HTTPS)`);
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌐 Public URL: ${frontendUrl}`);
        console.log(`\n💡 Note: Database features won\'t work until MongoDB is connected`);
      });
    } else if (publicHttpsAvailable) {
      server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n⚠️  SERVER RUNNING WITHOUT DATABASE (HTTP)`);
        console.log(`🚀 Server running on port ${PORT} behind HTTPS proxy`);
        console.log(`🌐 Public URL: ${frontendUrl}`);
        console.log(`\n💡 Note: Database features won\'t work until MongoDB is connected`);
      });
    } else {
      server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n⚠️  SERVER RUNNING WITHOUT DATABASE (HTTP)`);
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📍 Localhost: http://localhost:${PORT}`);
        console.log(`\n💡 Note: Database features won\'t work until MongoDB is connected`);
        console.log(`🔒 For camera access on phone, generate HTTPS certificates:`);
        console.log(`   node generate-cert.js && npm start`);
      });
    }

    server.on('error', (listenErr) => {
      if (listenErr.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please stop the process using it or set PORT to a free port.`);
      } else {
        console.error('❌ Server listen failed:', listenErr);
      }
      process.exit(1);
    });
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

startServer();
