const express = require('express');
const User = require('../../models/User');
const PatientProfile = require('../../models/PatientProfile');
const DoctorProfile = require('../../models/DoctorProfile');
const CrewProfile = require('../../models/CrewProfile');
const { authenticateToken } = require('../../middleware/auth');
const { logEvent } = require('../../services/securityLogger');

const router = express.Router();

// Enforce admin permission middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};

// Get admin analytics statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const patientsCount = await User.countDocuments({ role: 'patient' });
    const doctorsCount = await User.countDocuments({ role: 'doctor' });
    const crewCount = await User.countDocuments({ role: 'crew' });

    // Aggregate statistics across patient profiles
    const profiles = await PatientProfile.find({});
    
    let totalScans = 0;
    let totalSos = 0;

    profiles.forEach(p => {
      // Calculate QR scans from activities
      const scans = p.activities.filter(act => act.type && act.type.includes('Scan')).length;
      totalScans += scans;
      
      // Calculate SOS alerts
      totalSos += p.sosAlerts.length;
    });

    res.json({
      users: {
        total: totalUsers,
        patient: patientsCount,
        doctor: doctorsCount,
        crew: crewCount
      },
      stats: {
        scans: totalScans,
        sos: totalSos
      }
    });
  } catch (error) {
    console.error('Failed to aggregate admin stats:', error);
    res.status(500).json({ error: 'Failed to retrieve stats data' });
  }
});

// Retrieve all user records for admin user management table
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users list' });
  }
});

// Activate or Deactivate user account
router.put('/users/:id/toggle-status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (active === undefined) {
      return res.status(400).json({ error: 'Active boolean value is required' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'admin') {
      return res.status(400).json({ error: 'Cannot deactivate admin accounts' });
    }

    targetUser.active = active;
    await targetUser.save();

    logEvent('USER_STATUS_TOGGLED', {
      adminId: req.user.userId,
      targetUserId: targetUser._id,
      active
    });

    res.json({
      message: `User account has been successfully ${active ? 'activated' : 'deactivated'}`,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        active: targetUser.active
      }
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ error: 'Failed to toggle account activation status' });
  }
});

module.exports = router;
