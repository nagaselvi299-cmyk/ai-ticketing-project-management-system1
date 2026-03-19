const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    project: { type: String, default: 'General' },
    deadline: { type: Date, required: true },
    estimatedTime: { type: Number, required: true }, // in hours
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['todo', 'ongoing', 'completed', 'due'], default: 'todo' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember' },
    requiredQualities: [{ type: String }],
    notified: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
    isBugFix: { type: Boolean, default: false },
    timeline: [{
        action: { type: String },
        timestamp: { type: Date, default: Date.now }
    }],

    // ─── AI Assignment Tracking ─────────────────────────────────────
    completionDuration: { type: Number },           // actual hours taken
    feedbackScore: { type: Number, min: 1, max: 5 }, // quality rating
    reassignedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember' },
    reassignmentReason: { type: String },
    aiAssignmentReport: {
        predictedMember: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember' },
        scores: [{
            memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember' },
            memberName: { type: String },
            totalScore: { type: Number },
            skillScore: { type: Number },
            successScore: { type: Number },
            speedScore: { type: Number },
            workloadScore: { type: Number },
            styleScore: { type: Number }
        }],
        workloadCheck: {
            isOverloaded: { type: Boolean },
            reason: { type: String },
            activeTaskCount: { type: Number },
            highPriorityCount: { type: Number }
        },
        reassigned: { type: Boolean, default: false }
    },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', TaskSchema);
