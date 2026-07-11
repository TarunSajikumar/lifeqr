const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['patient', 'doctor', 'crew', 'admin'],
    default: 'patient'
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', ''],
    lowercase: true,
    trim: true,
    default: ''
  },
  phone: String,
  address: String,
  city: String,
  state: String,
  profilePhoto: {
    type: String,
    default: ''
  },
  verified: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

module.exports = mongoose.model("User", userSchema);
