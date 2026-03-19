const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// ─── POST /api/timeline/:taskId ── Add timeline event ──────────────────
router.post('/:taskId', async (req, res) => {
    try {
        const { action } = req.body;
        if (!action) return res.status(400).json({ message: 'Action is required' });

        const task = await Task.findById(req.params.taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        task.timeline.push({ action, timestamp: new Date() });
        await task.save();

        res.json(task.timeline);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── GET /api/timeline/:taskId ── Get timeline for a task ──────────────
router.get('/:taskId', async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId).populate('assignedTo');
        if (!task) return res.status(404).json({ message: 'Task not found' });

        res.json({
            taskTitle: task.title,
            taskId: task._id,
            assignedTo: task.assignedTo,
            timeline: task.timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── GET /api/timeline/member/:memberId ── Today's timeline ────────────
router.get('/member/:memberId', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const tasks = await Task.find({
            assignedTo: req.params.memberId,
            'timeline.timestamp': { $gte: today, $lt: tomorrow }
        }).populate('assignedTo');

        const events = [];
        for (const task of tasks) {
            for (const event of task.timeline) {
                if (new Date(event.timestamp) >= today && new Date(event.timestamp) < tomorrow) {
                    events.push({
                        taskTitle: task.title,
                        taskId: task._id,
                        action: event.action,
                        timestamp: event.timestamp
                    });
                }
            }
        }

        events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
