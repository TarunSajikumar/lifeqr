const mongoose = require("mongoose");

const patientProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  age: {
    type: Number,
    min: 0,
    max: 150
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '']
  },
  healthIssues: String,
  allergies: String,
  medications: String,
  emergencyContacts: [
    {
      name: String,
      phone: String,
      relationship: String,
      priority: {
        type: Number,
        default: 1
      }
    }
  ],
  qrCode: String,
  qrCodeId: {
    type: String,
    required: true,
    unique: true
  },
  lastLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date
  },
  publicProfile: {
    type: Boolean,
    default: true
  },
  reports: [
    {
      filename: String,
      originalName: String,
      mimeType: String,
      url: String,
      category: String,
      description: String,
      uploadedAt: Date
    }
  ],
  activities: [
    {
      type: {
        type: String
      },
      title: String,
      description: String,
      metadata: mongoose.Schema.Types.Mixed,
      timestamp: Date
    }
  ],
  sosAlerts: [
    {
      status: {
        type: String,
        default: 'sent',
        enum: ['sent', 'acknowledged', 'resolved']
      },
      location: {
        lat: Number,
        lng: Number
      },
      message: String,
      sentTo: [String],
      acknowledgedBy: {
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        timestamp: Date
      },
      createdAt: Date
    }
  ],
  authorizedDoctors: [
    {
      doctorId: mongoose.Schema.Types.ObjectId,
      name: String,
      email: String,
      grantedAt: Date
    }
  ],
  medicalHistory: [
    {
      type: {
        type: String,
        enum: ['treatment', 'vital', 'symptom']
      },
      title: String,
      description: String,
      author: {
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        role: String
      },
      timestamp: Date
    }
  ]
}, {
  timestamps: true
});

patientProfileSchema.index({ qrCodeId: 1 });

module.exports = mongoose.model("PatientProfile", patientProfileSchema);
