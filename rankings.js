const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const TeamMember = require('../models/TeamMember');

// ─── Points Configuration ──────────────────────────────────────────────
const POINTS = {
    completedTask: 10,
    onTimeDelivery: 5,
    highPriorityTask: 8,
    bugFix: 6
};

// ─── Benefits Configuration ────────────────────────────────────────────
const BENEFITS = {
    1: {
        rank: 1,
        emoji: '🥇',
        title: 'Gold Champion',
        rewards: [
            'Bonus Leave (2 days)',
            'Performance Badge',
            'Company Recognition',
            'Certificate of Excellence'
        ]
    },
    2: {
        rank: 2,
        emoji: '🥈',
        title: 'Silver Achiever',
        rewards: [
            '1 Bonus Leave',
            'Silver Badge',
            'Team Recognition'
        ]
    },
    3: {
        rank: 3,
        emoji: '🥉',
        title: 'Bronze Star',
        rewards: [
            'Bronze Badge',
            'Appreciation Certificate'
        ]
    }
};

// ─── Calculate points for a single member ──────────────────────────────
async function calculatePoints(memberId) {
    const tasks = await Task.find({ assignedTo: memberId });

    let points = 0;
    let breakdown = {
        completedTasks: 0,
        onTimeDeliveries: 0,
        highPriorityTasks: 0,
        bugFixes: 0
    };

    for (const task of tasks) {
        if (task.status === 'completed') {
            // +10 for completing a task
            points += POINTS.completedTask;
            breakdown.completedTasks++;

            // +5 for on-time delivery
            if (task.completedAt && task.deadline && new Date(task.completedAt) <= new Date(task.deadline)) {
                points += POINTS.onTimeDelivery;
                breakdown.onTimeDeliveries++;
            }

            // +8 for high/critical priority tasks
            if (task.priority === 'high' || task.priority === 'critical') {
                points += POINTS.highPriorityTask;
                breakdown.highPriorityTasks++;
            }

            // +6 for bug fixes
            if (task.isBugFix) {
                points += POINTS.bugFix;
                breakdown.bugFixes++;
            }
        }
    }

    return { points, breakdown, totalTasks: tasks.length };
}

// ─── GET /api/rankings/leaderboard ─────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
    try {
        const members = await TeamMember.find();
        const rankings = [];

        for (const member of members) {
            const { points, breakdown, totalTasks } = await calculatePoints(member._id);
            rankings.push({
                member: {
                    _id: member._id,
                    name: member.name,
                    email: member.email,
                    qualities: member.qualities
                },
                points,
                breakdown,
                totalTasks
            });
        }

        // Sort by points descending
        rankings.sort((a, b) => b.points - a.points);

        // Assign ranks and badges
        rankings.forEach((r, i) => {
            r.rank = i + 1;
            if (i < 3) {
                r.badge = BENEFITS[i + 1];
            } else {
                r.badge = null;
            }
        });

        res.json({ rankings, pointsConfig: POINTS });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── GET /api/rankings/member/:id ──────────────────────────────────────
router.get('/member/:id', async (req, res) => {
    try {
        const member = await TeamMember.findById(req.params.id);
        if (!member) return res.status(404).json({ message: 'Member not found' });

        const { points, breakdown, totalTasks } = await calculatePoints(member._id);

        // Calculate rank
        const allMembers = await TeamMember.find();
        const allScores = [];
        for (const m of allMembers) {
            const { points: p } = await calculatePoints(m._id);
            allScores.push({ id: m._id.toString(), points: p });
        }
        allScores.sort((a, b) => b.points - a.points);
        const rank = allScores.findIndex(s => s.id === req.params.id) + 1;

        const badge = rank <= 3 ? BENEFITS[rank] : null;

        res.json({
            member: {
                _id: member._id,
                name: member.name,
                email: member.email,
                qualities: member.qualities
            },
            points,
            breakdown,
            totalTasks,
            rank,
            badge
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── GET /api/rankings/benefits ────────────────────────────────────────
router.get('/benefits', (req, res) => {
    res.json({ benefits: BENEFITS, pointsConfig: POINTS });
});

module.exports = router;
