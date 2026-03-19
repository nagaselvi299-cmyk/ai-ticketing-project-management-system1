const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember', required: true },
    fileName: { type: String, required: true },
    fileData: { type: Buffer, required: true },
    mimeType: { type: String, required: true },

    // ─── OCR Extracted Data ─────────────────────────────────────────
    extractedData: {
        certName: { type: String, default: '' },
        skills: [{ type: String }],
        issuer: { type: String, default: '' },
        completionDate: { type: String, default: '' },
        rawText: { type: String, default: '' }
    },

    status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
    uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Certificate', CertificateSchema);
