const express = require('express');
const router = express.Router();
const TeamMember = require('../models/TeamMember');
const Task = require('../models/Task');

// ─── Work Style Classification Thresholds ───────────────────────────
const STYLE_THRESHOLDS = {
    fast: { speedRatio: 0.7 },          // completes in < 70% of estimated time
    deepFocus: { avgEstimated: 6 },     // avg estimated time > 6 hours (complex tasks)
    collaborator: { sharedProjectRate: 0.5 } // > 50% tasks in shared projects
};

// ─── Analyze work style for a member ────────────────────────────────
async function analyzeWorkStyle(memberId) {
    const allTasks = await Task.find({ assignedTo: memberId });
    const completedTasks = allTasks.filter(t => t.status === 'completed');

    if (completedTasks.length < 2) {
        return {
            type: 'balanced',
            confidence: 'low',
            reason: 'Not enough task history for analysis',
            metrics: { completedCount: completedTasks.length }
        };
    }

    // ─── Speed Analysis ────────────────────────────────────────────
    let speedRatios = [];
    for (const task of completedTasks) {
        if (task.completionDuration && task.estimatedTime) {
            speedRatios.push(task.completionDuration / task.estimatedTime);
        }
    }
    const avgSpeedRatio = speedRatios.length
        ? speedRatios.reduce((a, b) => a + b, 0) / speedRatios.length
        : 1;

    // ─── Focus Analysis (complex task handling) ─────────────────────
    const avgEstimatedTime = completedTasks.reduce((acc, t) => acc + (t.estimatedTime || 0), 0) / completedTasks.length;
    const highPriorityCount = completedTasks.filter(
        t => t.priority === 'high' || t.priority === 'critical'
    ).length;
    const highPriorityRate = highPriorityCount / completedTasks.length;

    // ─── Collaboration Analysis ─────────────────────────────────────
    // Check how many unique projects and shared projects
    const projects = {};
    for (const task of allTasks) {
        const proj = task.project || 'General';
        if (!projects[proj]) projects[proj] = new Set();
        projects[proj].add(task.assignedTo?.toString());
    }

    // Check if other members share the same projects
    const allProjectTasks = await Task.find({
        project: { $in: Object.keys(projects) },
        assignedTo: { $ne: memberId, $exists: true }
    });

    const sharedProjects = new Set();
    for (const t of allProjectTasks) {
        if (projects[t.project]) sharedProjects.add(t.project);
    }
    const sharedProjectRate = Object.keys(projects).length > 0
        ? sharedProjects.size / Object.keys(projects).length
        : 0;

    // ─── Classify Work Style ────────────────────────────────────────
    let type = 'balanced';
    let confidence = 'medium';
    let reason = '';

    const scores = {
        fast: 0,
        'deep-focus': 0,
        collaborator: 0
    };

    // Fast worker scoring
    if (avgSpeedRatio <= STYLE_THRESHOLDS.fast.speedRatio) {
        scores.fast += 40;
    } else if (avgSpeedRatio <= 0.85) {
        scores.fast += 20;
    }

    // Deep focus scoring
    if (avgEstimatedTime >= STYLE_THRESHOLDS.deepFocus.avgEstimated) {
        scores['deep-focus'] += 30;
    }
    if (highPriorityRate >= 0.4) {
        scores['deep-focus'] += 20;
    }

    // Collaborator scoring
    if (sharedProjectRate >= STYLE_THRESHOLDS.collaborator.sharedProjectRate) {
        scores.collaborator += 30;
    }
    if (Object.keys(projects).length >= 3) {
        scores.collaborator += 10;
    }

    // Determine primary style
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore >= 30) {
        type = Object.entries(scores).find(([_, v]) => v === maxScore)[0];
        confidence = maxScore >= 50 ? 'high' : 'medium';
    }

    // Build reason
    const reasons = [];
    if (type === 'fast') {
        reasons.push(`Avg completion speed: ${Math.round(avgSpeedRatio * 100)}% of estimated time`);
    } else if (type === 'deep-focus') {
        reasons.push(`Handles complex tasks (avg ${Math.round(avgEstimatedTime)}h estimated)`);
        if (highPriorityRate > 0.3) reasons.push(`${Math.round(highPriorityRate * 100)}% high-priority tasks`);
    } else if (type === 'collaborator') {
        reasons.push(`Works across ${Object.keys(projects).length} projects`);
        reasons.push(`${Math.round(sharedProjectRate * 100)}% shared with other team members`);
    } else {
        reasons.push('Balanced work distribution across different task types');
    }
    reason = reasons.join('; ');

    return {
        type,
        confidence,
        reason,
        scores,
        metrics: {
            completedCount: completedTasks.length,
            avgSpeedRatio: Math.round(avgSpeedRatio * 100) / 100,
            avgEstimatedTime: Math.round(avgEstimatedTime * 10) / 10,
            highPriorityRate: Math.round(highPriorityRate * 100),
            sharedProjectRate: Math.round(sharedProjectRate * 100),
            projectCount: Object.keys(projects).length,
            sharedProjectCount: sharedProjects.size
        }
    };
}

// ─── Get work style analysis for a member ───────────────────────────
router.get('/:memberId', async (req, res) => {
    try {
        const member = await TeamMember.findById(req.params.memberId);
        if (!member) return res.status(404).json({ message: 'Member not found' });

        const analysis = await analyzeWorkStyle(req.params.memberId);

        // Update member's workStyle
        await TeamMember.findByIdAndUpdate(req.params.memberId, {
            workStyle: {
                type: analysis.type,
                avgCompletionSpeed: analysis.metrics.avgSpeedRatio,
                focusDuration: analysis.metrics.avgEstimatedTime,
                collaborationScore: analysis.metrics.sharedProjectRate,
                lastAnalyzedAt: new Date()
            }
        });

        res.json({
            memberId: member._id,
            memberName: member.name,
            ...analysis,
            styleDescriptions: {
                fast: { emoji: '⚡', label: 'Fast Worker', desc: 'Completes tasks quickly and efficiently. Best for urgent and time-sensitive tasks.' },
                'deep-focus': { emoji: '🧠', label: 'Deep Focus', desc: 'Handles complex, high-priority tasks with concentration. Best for challenging problems.' },
                collaborator: { emoji: '🤝', label: 'Team Collaborator', desc: 'Works across multiple projects with teammates. Best for team-oriented tasks.' },
                balanced: { emoji: '⚖️', label: 'Balanced', desc: 'Well-rounded work approach across all task types. Adaptable to any assignment.' }
            }
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Get task matches for a member's work style ─────────────────────
router.get('/:memberId/task-matches', async (req, res) => {
    try {
        const member = await TeamMember.findById(req.params.memberId);
        if (!member) return res.status(404).json({ message: 'Member not found' });

        const style = member.workStyle?.type || 'balanced';

        // Find unassigned tasks that match the work style
        let query = { status: 'todo', assignedTo: null };

        if (style === 'fast') {
            query.priority = { $in: ['critical', 'high'] };
        } else if (style === 'deep-focus') {
            query.estimatedTime = { $gte: 4 };
        }

        const matchedTasks = await Task.find(query).sort({ deadline: 1 }).limit(10);

        // Also find all unassigned for balanced/collaborator
        const allUnassigned = style === 'balanced' || style === 'collaborator'
            ? await Task.find({ status: 'todo', assignedTo: null }).sort({ deadline: 1 }).limit(10)
            : [];

        res.json({
            memberId: member._id,
            workStyle: style,
            matchedTasks: matchedTasks.length > 0 ? matchedTasks : allUnassigned,
            matchReason: style === 'fast' ? 'Urgent tasks for fast workers'
                : style === 'deep-focus' ? 'Complex tasks requiring deep concentration'
                : style === 'collaborator' ? 'Team-oriented tasks available'
                : 'All available tasks'
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Batch analyze all team members ─────────────────────────────────
router.post('/analyze-all', async (req, res) => {
    try {
        const members = await TeamMember.find();
        const results = [];

        for (const member of members) {
            const analysis = await analyzeWorkStyle(member._id);

            await TeamMember.findByIdAndUpdate(member._id, {
                workStyle: {
                    type: analysis.type,
                    avgCompletionSpeed: analysis.metrics.avgSpeedRatio,
                    focusDuration: analysis.metrics.avgEstimatedTime,
                    collaborationScore: analysis.metrics.sharedProjectRate,
                    lastAnalyzedAt: new Date()
                }
            });

            results.push({
                memberId: member._id,
                memberName: member.name,
                type: analysis.type,
                confidence: analysis.confidence,
                reason: analysis.reason
            });
        }

        res.json({ analyzed: results.length, results });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
