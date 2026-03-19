const express = require('express');
const router = express.Router();
const TeamMember = require('../models/TeamMember');

// Get all team members
router.get('/', async (req, res) => {
    try {
        const members = await TeamMember.find().sort({ name: 1 });
        res.json(members);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get single member
router.get('/:id', async (req, res) => {
    try {
        const member = await TeamMember.findById(req.params.id);
        if (!member) return res.status(404).json({ message: 'Member not found' });
        res.json(member);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Add new team member
router.post('/', async (req, res) => {
    try {
        const { name, email, qualities, maxTasks } = req.body;
        const member = new TeamMember({ name, email, qualities: qualities || [], maxTasks: maxTasks || 5 });
        await member.save();
        res.status(201).json(member);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Update team member
router.put('/:id', async (req, res) => {
    try {
        const member = await TeamMember.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!member) return res.status(404).json({ message: 'Member not found' });
        res.json(member);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Delete team member
router.delete('/:id', async (req, res) => {
    try {
        await TeamMember.findByIdAndDelete(req.params.id);
        res.json({ message: 'Member deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
