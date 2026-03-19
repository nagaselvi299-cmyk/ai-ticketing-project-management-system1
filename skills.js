const express = require('express');
const router = express.Router();
const TeamMember = require('../models/TeamMember');
const Task = require('../models/Task');
const Certificate = require('../models/Certificate');

// ─── Get composite skill profile ────────────────────────────────────
router.get('/:memberId', async (req, res) => {
    try {
        const member = await TeamMember.findById(req.params.memberId);
        if (!member) return res.status(404).json({ message: 'Member not found' });

        // Combine qualities + skills for a unified view
        const manualSkills = (member.skills || []).filter(s => s.source === 'manual');
        const certSkills = (member.skills || []).filter(s => s.source === 'certificate');
        const inferredSkills = (member.skills || []).filter(s => s.source === 'inferred');

        // Also include legacy qualities
        const qualitySkills = (member.qualities || []).map(q => ({
            name: q, level: 'intermediate', source: 'manual', isLegacy: true
        }));

        res.json({
            memberId: member._id,
            name: member.name,
            manualSkills,
            certSkills,
            inferredSkills,
            qualitySkills,
            allSkills: [...manualSkills, ...certSkills, ...inferredSkills, ...qualitySkills],
            totalSkillCount: manualSkills.length + certSkills.length + inferredSkills.length + qualitySkills.length
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Add/update manual skills ───────────────────────────────────────
router.post('/:memberId', async (req, res) => {
    try {
        const { skills } = req.body; // [{ name, level }]
        const member = await TeamMember.findById(req.params.memberId);
        if (!member) return res.status(404).json({ message: 'Member not found' });

        const existingSkills = member.skills || [];

        for (const newSkill of skills) {
            const idx = existingSkills.findIndex(
                s => s.name.toLowerCase() === newSkill.name.toLowerCase() && s.source === 'manual'
            );
            if (idx >= 0) {
                // Update existing
                existingSkills[idx].level = newSkill.level || 'intermediate';
                existingSkills[idx].verifiedDate = new Date();
            } else {
                // Add new
                existingSkills.push({
                    name: newSkill.name,
                    level: newSkill.level || 'intermediate',
                    source: 'manual',
                    verifiedDate: new Date()
                });
            }
        }

        // Also add to qualities for backward compat
        const existingQualities = member.qualities || [];
        for (const s of skills) {
            if (!existingQualities.some(q => q.toLowerCase() === s.name.toLowerCase())) {
                existingQualities.push(s.name);
            }
        }

        member.skills = existingSkills;
        member.qualities = existingQualities;
        await member.save();

        res.json({ message: 'Skills updated', skills: member.skills });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Delete a skill ─────────────────────────────────────────────────
router.delete('/:memberId/:skillName', async (req, res) => {
    try {
        const member = await TeamMember.findById(req.params.memberId);
        if (!member) return res.status(404).json({ message: 'Member not found' });

        const skillNameLower = decodeURIComponent(req.params.skillName).toLowerCase();

        member.skills = (member.skills || []).filter(
            s => s.name.toLowerCase() !== skillNameLower
        );
        member.qualities = (member.qualities || []).filter(
            q => q.toLowerCase() !== skillNameLower
        );
        await member.save();

        res.json({ message: 'Skill removed', skills: member.skills });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Full AI-generated profile ──────────────────────────────────────
router.get('/:memberId/profile', async (req, res) => {
    try {
        const member = await TeamMember.findById(req.params.memberId).populate('certificates');
        if (!member) return res.status(404).json({ message: 'Member not found' });

        // Get task history
        const allTasks = await Task.find({ assignedTo: req.params.memberId });
        const completedTasks = allTasks.filter(t => t.status === 'completed');
        const onTimeTasks = completedTasks.filter(t =>
            t.completedAt && t.deadline && new Date(t.completedAt) <= new Date(t.deadline)
        );

        // Infer additional skills from task history
        const taskSkills = {};
        for (const task of completedTasks) {
            for (const q of (task.requiredQualities || [])) {
                const ql = q.toLowerCase();
                if (!taskSkills[ql]) taskSkills[ql] = { count: 0, onTime: 0 };
                taskSkills[ql].count++;
                if (onTimeTasks.includes(task)) taskSkills[ql].onTime++;
            }
        }

        // Create inferred skills from successful task completions
        const inferredSkills = Object.entries(taskSkills)
            .filter(([_, data]) => data.count >= 2) // at least 2 completed tasks with this skill
            .map(([name, data]) => ({
                name,
                level: data.count >= 5 ? 'expert' : data.count >= 3 ? 'advanced' : 'intermediate',
                source: 'inferred',
                taskCount: data.count,
                successRate: data.count > 0 ? Math.round((data.onTime / data.count) * 100) : 0
            }));

        // Certificate count
        const certCount = await Certificate.countDocuments({ memberId: req.params.memberId, status: 'processed' });

        res.json({
            member: {
                _id: member._id,
                name: member.name,
                email: member.email,
                qualities: member.qualities,
                skills: member.skills,
                workStyle: member.workStyle,
                performanceMetrics: member.performanceMetrics
            },
            inferredSkills,
            certificateCount: certCount,
            taskHistory: {
                total: allTasks.length,
                completed: completedTasks.length,
                onTime: onTimeTasks.length,
                onTimeRate: completedTasks.length > 0 ? Math.round((onTimeTasks.length / completedTasks.length) * 100) : 0
            }
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
