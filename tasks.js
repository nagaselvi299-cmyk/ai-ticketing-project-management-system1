const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const TeamMember = require('../models/TeamMember');
const { verifyToken, requireRole } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════════════════
//  ADVANCED AI ASSIGNMENT ENGINE
// ═══════════════════════════════════════════════════════════════════════

// ─── Weights for the 5-factor scoring system ────────────────────────
const WEIGHTS = {
    skillMatch: 0.30,
    successRate: 0.20,
    completionSpeed: 0.15,
    workloadBalance: 0.25,
    workStyleFit: 0.10
};

// ─── Helper: Calculate skill match score ────────────────────────────
function calcSkillScore(member, requiredQualities) {
    if (!requiredQualities || !requiredQualities.length) return 50;

    const memberSkills = [
        ...member.qualities.map(q => q.toLowerCase()),
        ...(member.skills || []).map(s => s.name.toLowerCase())
    ];
    const uniqueSkills = [...new Set(memberSkills)];

    let matchCount = 0;
    let levelBonus = 0;

    for (const req of requiredQualities) {
        const reqLower = req.toLowerCase();
        if (uniqueSkills.includes(reqLower)) {
            matchCount++;
            // Bonus for higher skill levels
            const skill = (member.skills || []).find(s => s.name.toLowerCase() === reqLower);
            if (skill) {
                const levelMap = { beginner: 0, intermediate: 5, advanced: 10, expert: 15 };
                levelBonus += (levelMap[skill.level] || 0);
            }
        }
    }

    const baseScore = (matchCount / requiredQualities.length) * 100;
    return Math.min(baseScore + levelBonus, 100);
}

// ─── Helper: Calculate success rate score ───────────────────────────
function calcSuccessScore(member) {
    const pm = member.performanceMetrics;
    if (!pm || !pm.totalCompleted) return 50; // neutral for new members
    return Math.min(pm.successRate || 0, 100);
}

// ─── Helper: Calculate completion speed score ───────────────────────
function calcSpeedScore(member) {
    const pm = member.performanceMetrics;
    if (!pm || !pm.avgCompletionTime) return 50;
    // Lower avg completion time relative to norm = better
    // Normalize: if avg speed ratio <= 0.5 → 100, >= 2.0 → 0
    const ws = member.workStyle;
    const speedRatio = ws?.avgCompletionSpeed || 1;
    if (speedRatio <= 0.5) return 100;
    if (speedRatio >= 2.0) return 0;
    return Math.round(100 - ((speedRatio - 0.5) / 1.5) * 100);
}

// ─── Helper: Calculate workload balance score ───────────────────────
async function calcWorkloadScore(member) {
    const activeTasks = await Task.find({
        assignedTo: member._id,
        status: { $in: ['todo', 'ongoing'] }
    });

    const taskCount = activeTasks.length;
    const maxTasks = member.maxTasks || 5;

    // Base capacity score
    const capacityScore = maxTasks > 0
        ? ((maxTasks - taskCount) / maxTasks) * 100
        : 0;

    // Penalty for high-priority active tasks
    const highPriorityCount = activeTasks.filter(
        t => t.priority === 'high' || t.priority === 'critical'
    ).length;
    const priorityPenalty = highPriorityCount * 10;

    // Penalty for imminent deadlines (within 24h)
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const imminentCount = activeTasks.filter(t => t.deadline && new Date(t.deadline) <= tomorrow).length;
    const deadlinePenalty = imminentCount * 15;

    return {
        score: Math.max(capacityScore - priorityPenalty - deadlinePenalty, 0),
        isOverloaded: taskCount >= maxTasks || highPriorityCount >= 2 || imminentCount >= 3,
        reason: taskCount >= maxTasks ? 'At maximum task capacity'
            : highPriorityCount >= 2 ? `Handling ${highPriorityCount} high/critical priority tasks`
            : imminentCount >= 3 ? `${imminentCount} tasks due within 24h`
            : null,
        activeTaskCount: taskCount,
        highPriorityCount,
        imminentCount
    };
}

// ─── Helper: Calculate work style fit score ─────────────────────────
function calcStyleScore(member, taskPriority, estimatedTime) {
    const style = member.workStyle?.type || 'balanced';
    let score = 50; // baseline

    if (taskPriority === 'critical' || taskPriority === 'high') {
        if (style === 'fast') score = 90;
        else if (style === 'deep-focus') score = 70;
        else if (style === 'collaborator') score = 40;
    } else if (estimatedTime && estimatedTime > 8) {
        // Long tasks favor deep focus
        if (style === 'deep-focus') score = 90;
        else if (style === 'fast') score = 50;
        else if (style === 'collaborator') score = 60;
    } else {
        if (style === 'balanced') score = 70;
        else if (style === 'collaborator') score = 65;
    }

    return score;
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN AI SCORING FUNCTION
// ═══════════════════════════════════════════════════════════════════════
async function aiScoreMembers(members, requiredQualities, taskPriority, estimatedTime) {
    const results = [];

    for (const member of members) {
        const skillScore = calcSkillScore(member, requiredQualities);
        const successScore = calcSuccessScore(member);
        const speedScore = calcSpeedScore(member);
        const workload = await calcWorkloadScore(member);
        const styleScore = calcStyleScore(member, taskPriority, estimatedTime);

        const totalScore = Math.round(
            skillScore * WEIGHTS.skillMatch +
            successScore * WEIGHTS.successRate +
            speedScore * WEIGHTS.completionSpeed +
            workload.score * WEIGHTS.workloadBalance +
            styleScore * WEIGHTS.workStyleFit
        );

        results.push({
            member,
            memberId: member._id,
            memberName: member.name,
            totalScore,
            skillScore: Math.round(skillScore),
            successScore: Math.round(successScore),
            speedScore: Math.round(speedScore),
            workloadScore: Math.round(workload.score),
            styleScore: Math.round(styleScore),
            workloadCheck: {
                isOverloaded: workload.isOverloaded,
                reason: workload.reason,
                activeTaskCount: workload.activeTaskCount,
                highPriorityCount: workload.highPriorityCount
            }
        });
    }

    return results.sort((a, b) => b.totalScore - a.totalScore);
}

// ─── Helper: Select best available member (with fallback) ───────────
async function selectBestMember(members, requiredQualities, taskPriority, estimatedTime) {
    const scored = await aiScoreMembers(members, requiredQualities, taskPriority, estimatedTime);
    if (!scored.length) return { chosen: null, scores: [], reassigned: false };

    const primary = scored[0];
    let chosen = primary;
    let reassigned = false;
    let reassignmentReason = null;

    // If primary is overloaded, find next available
    if (primary.workloadCheck.isOverloaded) {
        const available = scored.find(s => !s.workloadCheck.isOverloaded);
        if (available) {
            chosen = available;
            reassigned = true;
            reassignmentReason = `Primary candidate (${primary.memberName}) is overloaded: ${primary.workloadCheck.reason}. Reassigned to ${available.memberName}.`;
        }
        // If everyone is overloaded, still pick the best scorer
    }

    return {
        chosen,
        scores: scored.map(s => ({
            memberId: s.memberId,
            memberName: s.memberName,
            totalScore: s.totalScore,
            skillScore: s.skillScore,
            successScore: s.successScore,
            speedScore: s.speedScore,
            workloadScore: s.workloadScore,
            styleScore: s.styleScore
        })),
        reassigned,
        reassignmentReason,
        primaryCandidate: primary
    };
}

// ─── Helper: Predict priority from deadline ─────────────────────────
function predictPriority(deadline) {
    const hoursLeft = (new Date(deadline) - new Date()) / (1000 * 60 * 60);
    if (hoursLeft <= 6) return 'critical';
    if (hoursLeft <= 24) return 'high';
    if (hoursLeft <= 72) return 'medium';
    return 'low';
}

// ─── Helper: Update member performance metrics ─────────────────────
async function updatePerformanceMetrics(memberId) {
    const tasks = await Task.find({ assignedTo: memberId, status: 'completed' });
    if (!tasks.length) return;

    const totalCompleted = tasks.length;
    const onTime = tasks.filter(t => t.completedAt && t.deadline && new Date(t.completedAt) <= new Date(t.deadline)).length;
    const onTimeRate = Math.round((onTime / totalCompleted) * 100);

    const durations = tasks.filter(t => t.completionDuration).map(t => t.completionDuration);
    const avgCompletionTime = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    const scored = tasks.filter(t => t.feedbackScore);
    const successRate = scored.length
        ? Math.round((scored.filter(t => t.feedbackScore >= 3).length / scored.length) * 100)
        : onTimeRate; // fallback to on-time rate

    await TeamMember.findByIdAndUpdate(memberId, {
        performanceMetrics: { totalCompleted, onTimeRate, avgCompletionTime, successRate, lastUpdatedAt: new Date() }
    });
}

// ═══════════════════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════════════════

// ─── Get all tasks ──────────────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
    try {
        // Both HR and Employee can view tasks
        // HR sees all for insight/reporting; Employee sees all for operational use
        const tasks = await Task.find().populate('assignedTo').sort({ deadline: 1 });
        res.json(tasks);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Get single task ────────────────────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id).populate('assignedTo');
        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json(task);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Create task with AI auto-assignment ────────────────────────────
router.post('/', verifyToken, requireRole('Employee'), async (req, res) => {
    try {
        const { title, description, deadline, estimatedTime, requiredQualities, assignedTo, project, isBugFix } = req.body;

        const priority = predictPriority(deadline);
        let assignedMemberId = assignedTo || null;
        let aiReport = null;

        // AI auto-assignment if no member specified
        if (!assignedMemberId && requiredQualities && requiredQualities.length) {
            const members = await TeamMember.find();
            const result = await selectBestMember(members, requiredQualities, priority, estimatedTime);

            if (result.chosen) {
                assignedMemberId = result.chosen.memberId;
                aiReport = {
                    predictedMember: result.primaryCandidate.memberId,
                    scores: result.scores,
                    workloadCheck: result.chosen.workloadCheck,
                    reassigned: result.reassigned
                };
            }
        }

        const task = new Task({
            title, description, deadline, estimatedTime,
            priority, requiredQualities: requiredQualities || [],
            assignedTo: assignedMemberId,
            project: project || 'General',
            isBugFix: isBugFix || false,
            status: 'todo',
            aiAssignmentReport: aiReport,
            reassignedFrom: aiReport?.reassigned ? aiReport.predictedMember : undefined,
            reassignmentReason: aiReport?.reassigned
                ? `Overloaded: ${aiReport.workloadCheck.reason}`
                : undefined
        });
        await task.save();

        if (assignedMemberId) {
            await TeamMember.findByIdAndUpdate(assignedMemberId, { $inc: { currentTaskCount: 1 } });
        }

        const populated = await Task.findById(task._id).populate('assignedTo');
        res.status(201).json(populated);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Update task status ─────────────────────────────────────────────
router.put('/:id', async (req, res) => {
    try {
        // Track completion metrics
        if (req.body.status === 'completed') {
            const existing = await Task.findById(req.params.id);
            if (existing && existing.createdAt) {
                const duration = (new Date() - new Date(existing.createdAt)) / (1000 * 60 * 60);
                req.body.completedAt = new Date();
                req.body.completionDuration = Math.round(duration * 10) / 10;
            }
        }

        const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('assignedTo');
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Update performance metrics on completion
        if (req.body.status === 'completed' && task.assignedTo) {
            await updatePerformanceMetrics(task.assignedTo._id);
            await TeamMember.findByIdAndUpdate(task.assignedTo._id, { $inc: { currentTaskCount: -1 } });
        }

        res.json(task);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Delete task ────────────────────────────────────────────────────
router.delete('/:id', verifyToken, requireRole('Employee'), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        if (task.assignedTo) {
            await TeamMember.findByIdAndUpdate(task.assignedTo, { $inc: { currentTaskCount: -1 } });
        }
        await Task.findByIdAndDelete(req.params.id);
        res.json({ message: 'Task deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── AI Prediction endpoint ────────────────────────────────────────
router.post('/predict', async (req, res) => {
    try {
        const { deadline, requiredQualities, estimatedTime } = req.body;
        const priority = predictPriority(deadline);
        const members = await TeamMember.find();
        const result = await selectBestMember(members, requiredQualities || [], priority, estimatedTime || 4);

        res.json({
            predictedPriority: priority,
            predictedMember: result.chosen ? {
                member: result.chosen.member,
                totalScore: result.chosen.totalScore,
                skillScore: result.chosen.skillScore,
                successScore: result.chosen.successScore,
                speedScore: result.chosen.speedScore,
                workloadScore: result.chosen.workloadScore,
                styleScore: result.chosen.styleScore
            } : null,
            allScores: result.scores,
            reassigned: result.reassigned,
            reassignmentReason: result.reassignmentReason
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── AI Assignment Report endpoint ──────────────────────────────────
router.post('/ai-assign', async (req, res) => {
    try {
        const { requiredQualities, deadline, estimatedTime } = req.body;
        const priority = predictPriority(deadline);
        const members = await TeamMember.find();
        const scored = await aiScoreMembers(members, requiredQualities || [], priority, estimatedTime || 4);

        res.json({
            priority,
            candidates: scored.map(s => ({
                memberId: s.memberId,
                memberName: s.memberName,
                email: s.member.email,
                qualities: s.member.qualities,
                skills: s.member.skills,
                workStyle: s.member.workStyle?.type || 'balanced',
                totalScore: s.totalScore,
                skillScore: s.skillScore,
                successScore: s.successScore,
                speedScore: s.speedScore,
                workloadScore: s.workloadScore,
                styleScore: s.styleScore,
                isOverloaded: s.workloadCheck.isOverloaded,
                overloadReason: s.workloadCheck.reason,
                activeTaskCount: s.workloadCheck.activeTaskCount,
                highPriorityCount: s.workloadCheck.highPriorityCount
            })),
            weights: WEIGHTS
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
