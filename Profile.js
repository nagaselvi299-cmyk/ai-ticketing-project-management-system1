const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    headline: { type: String, default: '' },
    about: { type: String, default: '' },
    profilePhoto: { type: String, default: '' }, // base64 data URL
    location: { type: String, default: '' },
    skills: [{ type: String }],
    experience: [{
        title: { type: String, required: true },
        company: { type: String, required: true },
        startDate: { type: String },
        endDate: { type: String },
        current: { type: Boolean, default: false },
        description: { type: String, default: '' }
    }],
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Profile', ProfileSchema);
