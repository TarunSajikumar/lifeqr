const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const crypto = require('crypto');
const User = require('../models/User');

const router = express.Router();

async function generateShortQrCodeId() {
  let id;
  do {
    id = crypto.randomBytes(4).toString('hex');
  } while (await User.findOne({ qrCodeId: id }));
  return id;
}

// Register route
router.post('/register', async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      role,
      // Patient fields
      age,
      bloodGroup,
      healthIssues,
      allergies,
      medications,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      // Doctor fields
      specialization,
      licenseNumber,
      hospital,
      // Crew fields
      vehicleNumber,
      crewType,
      station,
      // Common fields
      phone,
      address,
      city,
      state
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare user data
    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      address,
      city,
      state
    };

    // Add role-specific data
    if (role === 'patient') {
      userData.age = age;
      userData.bloodGroup = bloodGroup;
      userData.healthIssues = healthIssues;
      userData.allergies = allergies;
      userData.medications = medications;
      
      if (emergencyContactName && emergencyContactPhone) {
        userData.emergencyContact = {
          name: emergencyContactName,
          phone: emergencyContactPhone,
          relationship: emergencyContactRelationship
        };
      }
      
      // Generate unique short QR code ID
      const qrCodeId = await generateShortQrCodeId();
      userData.qrCodeId = qrCodeId;
      
      // Generate QR code with URL that links to emergency access page
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
      const qrUrl = `${frontendUrl}/emergency_access.html?id=${qrCodeId}`;
      
      const qrCodeDataURL = await QRCode.toDataURL(qrUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      userData.qrCode = qrCodeDataURL;
    } else if (role === 'doctor') {
      userData.specialization = specialization;
      userData.licenseNumber = licenseNumber;
      userData.hospital = hospital;
    } else if (role === 'crew') {
      userData.vehicleNumber = vehicleNumber;
      userData.crewType = crewType;
      userData.station = station;
    }

    // Create user
    const user = await User.create(userData);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        qrCode: user.qrCode,
        qrCodeId: user.qrCodeId
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '7d' }
    );

    res.json({ 
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        qrCode: user.qrCode,
        qrCodeId: user.qrCodeId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Verify token route
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      valid: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        qrCode: user.qrCode,
        qrCodeId: user.qrCodeId
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
