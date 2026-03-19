const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');
const { verifyToken } = require('../middleware/auth');

// ─── Get profile by user ID ────────────────────────────────────────
router.get('/:userId', async (req, res) => {
    try {
        const profile = await Profile.findOne({ userId: req.params.userId });
        if (!profile) return res.json(null);
        res.json(profile);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Create or Update profile (upsert) ─────────────────────────────
router.put('/:userId', verifyToken, async (req, res) => {
    try {
        const { headline, about, profilePhoto, location, skills, experience } = req.body;

        const profile = await Profile.findOneAndUpdate(
            { userId: req.params.userId },
            {
                headline, about, profilePhoto, location,
                skills: skills || [],
                experience: experience || [],
                updatedAt: new Date()
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json(profile);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── AI Bio Generator ──────────────────────────────────────────────
router.post('/generate-bio', verifyToken, async (req, res) => {
    try {
        const { name, role, skills, experience, tone } = req.body;

        const bio = generateProfessionalBio(name, role, skills, experience, tone);
        res.json({ bio });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── AI Bio Generation Engine ──────────────────────────────────────
function generateProfessionalBio(name, role, skills, experience, tone) {
    const skillList = skills || [];
    const exp = experience || '';
    const isProfessional = tone !== 'casual';

    // Opening line
    const openings = isProfessional ? [
        `${name} is a dedicated ${role || 'professional'} with a passion for delivering exceptional results.`,
        `As a seasoned ${role || 'professional'}, ${name} brings a unique blend of technical expertise and creative problem-solving.`,
        `${name} is a results-driven ${role || 'professional'} committed to pushing the boundaries of innovation.`,
        `With a strong foundation in ${role || 'technology'}, ${name} excels at transforming complex challenges into elegant solutions.`
    ] : [
        `Hey! I'm ${name}, a ${role || 'tech enthusiast'} who loves building amazing things.`,
        `I'm ${name} — a passionate ${role || 'developer'} who thrives on solving real-world problems.`,
        `Hi there! ${name} here, a ${role || 'professional'} who believes great work comes from great collaboration.`
    ];

    // Skills section
    let skillPart = '';
    if (skillList.length > 0) {
        const topSkills = skillList.slice(0, 5);
        if (isProfessional) {
            skillPart = ` Proficient in ${topSkills.slice(0, -1).join(', ')}${topSkills.length > 1 ? ', and ' + topSkills[topSkills.length - 1] : topSkills[0]}, ${name.split(' ')[0]} consistently delivers high-quality work that drives team success.`;
        } else {
            skillPart = ` My toolkit includes ${topSkills.join(', ')}, and I'm always eager to learn more!`;
        }
    }

    // Experience section
    let expPart = '';
    if (exp) {
        if (isProfessional) {
            expPart = ` With experience ${exp}, ${name.split(' ')[0]} has developed a deep understanding of industry best practices and emerging trends.`;
        } else {
            expPart = ` I've spent time ${exp}, which has shaped how I approach challenges today.`;
        }
    }

    // Closing
    const closings = isProfessional ? [
        ` Always seeking new opportunities to innovate and collaborate on impactful projects.`,
        ` Driven by a commitment to continuous learning and professional excellence.`,
        ` Passionate about leveraging technology to create meaningful impact and drive organizational growth.`
    ] : [
        ` Outside of work, you'll find me exploring new technologies and contributing to the community.`,
        ` Always up for a new challenge and a good cup of coffee! ☕`,
        ` Let's connect and build something awesome together! 🚀`
    ];

    const opening = openings[Math.floor(Math.random() * openings.length)];
    const closing = closings[Math.floor(Math.random() * closings.length)];

    return opening + skillPart + expPart + closing;
}

module.exports = router;
