const express = require('express');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const User = require('../models/User');

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get patient profile by ID (for emergency access via QR)
router.get('/profile/:qrCodeId', async (req, res) => {
  try {
    const { qrCodeId } = req.params;
    
    const patient = await User.findOne({ qrCodeId, role: 'patient' }).select('-password -__v');
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json({
      name: patient.name,
      age: patient.age,
      bloodGroup: patient.bloodGroup,
      allergies: patient.allergies,
      healthIssues: patient.healthIssues,
      medications: patient.medications,
      emergencyContact: patient.emergencyContact,
      phone: patient.phone
    });
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    res.status(500).json({ error: 'Failed to fetch patient profile' });
  }
});

// Get authenticated user's full profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -__v');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update patient profile
router.put('/update', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      age,
      bloodGroup,
      healthIssues,
      allergies,
      medications,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      phone,
      address,
      city,
      state
    } = req.body;

    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (city) user.city = city;
    if (state) user.state = state;

    if (user.role === 'patient') {
      if (age) user.age = age;
      if (bloodGroup) user.bloodGroup = bloodGroup;
      if (healthIssues !== undefined) user.healthIssues = healthIssues;
      if (allergies !== undefined) user.allergies = allergies;
      if (medications !== undefined) user.medications = medications;
      
      if (emergencyContactName || emergencyContactPhone) {
        user.emergencyContact = {
          name: emergencyContactName || user.emergencyContact?.name,
          phone: emergencyContactPhone || user.emergencyContact?.phone,
          relationship: emergencyContactRelationship || user.emergencyContact?.relationship
        };
      }

      // Regenerate QR code with updated data
      const qrData = JSON.stringify({
        id: user.qrCodeId,
        name: user.name,
        bloodGroup: user.bloodGroup,
        allergies: user.allergies,
        emergencyContact: user.emergencyContact?.phone,
        url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/patient/${user.qrCodeId}`
      });
      
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#6818f4',
          light: '#ffffff'
        }
      });
      
      user.qrCode = qrCodeDataURL;
    }

    await user.save();

    res.json({ 
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        qrCode: user.qrCode
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Regenerate QR code
router.post('/regenerate-qr', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user || user.role !== 'patient') {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/emergency_access.html?id=${user.qrCodeId}`;
    
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
    
    user.qrCode = qrCodeDataURL;
    await user.save();

    res.json({ 
      message: 'QR code regenerated successfully',
      qrCode: user.qrCode
    });
  } catch (error) {
    console.error('Error regenerating QR code:', error);
    res.status(500).json({ error: 'Failed to regenerate QR code' });
  }
});

module.exports = router;
