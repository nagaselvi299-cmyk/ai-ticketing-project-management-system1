const mongoose = require('mongoose');

const TeamMemberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String },
    qualities: [{ type: String }],          // e.g. ["frontend", "design", "testing"]
    capacity: { type: Number, default: 100 }, // percentage available (0-100)
    currentTaskCount: { type: Number, default: 0 },
    maxTasks: { type: Number, default: 5 },

    // ─── Enhanced Skills (manual + certificate + inferred) ──────────
    skills: [{
        name: { type: String, required: true },
        level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], default: 'intermediate' },
        source: { type: String, enum: ['manual', 'certificate', 'inferred'], default: 'manual' },
        verifiedDate: { type: Date, default: Date.now }
    }],

    // ─── Certificates reference ─────────────────────────────────────
    certificates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Certificate' }],

    // ─── Work Style Analysis ────────────────────────────────────────
    workStyle: {
        type: { type: String, enum: ['fast', 'deep-focus', 'collaborator', 'balanced'], default: 'balanced' },
        avgCompletionSpeed: { type: Number, default: 1 },      // ratio: actual / estimated
        focusDuration: { type: Number, default: 0 },            // avg hours per task session
        collaborationScore: { type: Number, default: 0 },       // 0-100
        lastAnalyzedAt: { type: Date }
    },

    // ─── Performance Metrics ────────────────────────────────────────
    performanceMetrics: {
        totalCompleted: { type: Number, default: 0 },
        onTimeRate: { type: Number, default: 0 },               // 0-100 percentage
        avgCompletionTime: { type: Number, default: 0 },        // hours
        successRate: { type: Number, default: 0 },               // 0-100 percentage
        lastUpdatedAt: { type: Date }
    },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TeamMember', TeamMemberSchema);
