const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// Get tasks grouped by status
router.get('/', async (req, res) => {
    try {
        const tasks = await Task.find().populate('assignedTo');

        const now = new Date();
        // Auto-mark overdue tasks
        for (const task of tasks) {
            if (task.status !== 'completed' && new Date(task.deadline) < now && task.status !== 'due') {
                task.status = 'due';
                await task.save();
            }
        }

        const grouped = {
            todo: tasks.filter(t => t.status === 'todo'),
            ongoing: tasks.filter(t => t.status === 'ongoing'),
            completed: tasks.filter(t => t.status === 'completed'),
            due: tasks.filter(t => t.status === 'due')
        };

        res.json(grouped);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Update task status
router.put('/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const updateData = { status };

        // Set completedAt when marking as completed
        if (status === 'completed') {
            updateData.completedAt = new Date();
        }

        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Add timeline event
        const timelineActions = {
            'todo': 'Task Assigned',
            'ongoing': 'Work Started',
            'completed': 'Task Completed',
            'due': 'Task Overdue'
        };
        if (timelineActions[status]) {
            task.timeline.push({ action: timelineActions[status], timestamp: new Date() });
        }

        task.status = status;
        if (status === 'completed') task.completedAt = new Date();
        await task.save();

        const populated = await Task.findById(task._id).populate('assignedTo');

        // If completed, decrement member task count
        if (status === 'completed' && populated.assignedTo) {
            const TeamMember = require('../models/TeamMember');
            await TeamMember.findByIdAndUpdate(populated.assignedTo._id, { $inc: { currentTaskCount: -1 } });
        }

        res.json(populated);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get notifications: tasks within 1 hour of deadline
router.get('/notifications', async (req, res) => {
    try {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

        const tasks = await Task.find({
            status: { $in: ['todo', 'ongoing'] },
            deadline: { $lte: oneHourLater, $gte: now },
            notified: false
        }).populate('assignedTo');

        res.json(tasks);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Respond to notification: mark completed or due
router.post('/notifications/:id/respond', async (req, res) => {
    try {
        const { completed } = req.body;
        const status = completed ? 'completed' : 'due';
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            { status, notified: true },
            { new: true }
        ).populate('assignedTo');

        if (!task) return res.status(404).json({ message: 'Task not found' });

        if (completed && task.assignedTo) {
            const TeamMember = require('../models/TeamMember');
            await TeamMember.findByIdAndUpdate(task.assignedTo._id, { $inc: { currentTaskCount: -1 } });
        }

        res.json(task);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
