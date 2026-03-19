const express = require('express');
const router = express.Router();
const TeamMember = require('../models/TeamMember');
const Task = require('../models/Task');

// ─── Learning Resources Catalog ─────────────────────────────────────
const LEARNING_RESOURCES = {
    javascript: [
        { title: 'JavaScript: The Complete Guide', type: 'course', url: 'https://www.udemy.com/course/javascript-the-complete-guide/', provider: 'Udemy' },
        { title: 'JavaScript Certification', type: 'certification', url: 'https://www.w3schools.com/js/js_certification.asp', provider: 'W3Schools' },
        { title: 'MDN JavaScript Guide', type: 'documentation', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', provider: 'MDN' }
    ],
    react: [
        { title: 'React - The Complete Guide', type: 'course', url: 'https://www.udemy.com/course/react-the-complete-guide/', provider: 'Udemy' },
        { title: 'React Official Tutorial', type: 'documentation', url: 'https://react.dev/learn', provider: 'React.dev' },
        { title: 'Meta Front-End Developer Certificate', type: 'certification', url: 'https://www.coursera.org/professional-certificates/meta-front-end-developer', provider: 'Coursera' }
    ],
    python: [
        { title: 'Python for Everybody', type: 'course', url: 'https://www.coursera.org/specializations/python', provider: 'Coursera' },
        { title: 'PCEP Certification', type: 'certification', url: 'https://pythoninstitute.org/pcep', provider: 'Python Institute' },
        { title: 'Python Official Docs', type: 'documentation', url: 'https://docs.python.org/3/tutorial/', provider: 'Python.org' }
    ],
    nodejs: [
        { title: 'Node.js - The Complete Guide', type: 'course', url: 'https://www.udemy.com/course/nodejs-the-complete-guide/', provider: 'Udemy' },
        { title: 'OpenJS Node.js Certification', type: 'certification', url: 'https://openjsf.org/certification/', provider: 'OpenJS' },
        { title: 'Node.js Docs', type: 'documentation', url: 'https://nodejs.org/en/docs/', provider: 'Node.js' }
    ],
    typescript: [
        { title: 'Understanding TypeScript', type: 'course', url: 'https://www.udemy.com/course/understanding-typescript/', provider: 'Udemy' },
        { title: 'TypeScript Handbook', type: 'documentation', url: 'https://www.typescriptlang.org/docs/handbook/', provider: 'TypeScript' }
    ],
    mongodb: [
        { title: 'MongoDB University', type: 'course', url: 'https://university.mongodb.com/', provider: 'MongoDB' },
        { title: 'MongoDB Developer Certification', type: 'certification', url: 'https://university.mongodb.com/certification', provider: 'MongoDB' }
    ],
    docker: [
        { title: 'Docker Mastery', type: 'course', url: 'https://www.udemy.com/course/docker-mastery/', provider: 'Udemy' },
        { title: 'Docker Certified Associate', type: 'certification', url: 'https://training.mirantis.com/dca-certification-exam/', provider: 'Mirantis' }
    ],
    aws: [
        { title: 'AWS Cloud Practitioner', type: 'course', url: 'https://www.aws.training/', provider: 'AWS' },
        { title: 'AWS Solutions Architect', type: 'certification', url: 'https://aws.amazon.com/certification/certified-solutions-architect-associate/', provider: 'AWS' }
    ],
    testing: [
        { title: 'Software Testing Masterclass', type: 'course', url: 'https://www.udemy.com/course/learn-software-testing/', provider: 'Udemy' },
        { title: 'ISTQB Foundation Level', type: 'certification', url: 'https://www.istqb.org/', provider: 'ISTQB' }
    ],
    design: [
        { title: 'UI/UX Design Bootcamp', type: 'course', url: 'https://www.udemy.com/course/complete-web-designer/', provider: 'Udemy' },
        { title: 'Google UX Design Certificate', type: 'certification', url: 'https://grow.google/certificates/ux-design/', provider: 'Google' }
    ],
    frontend: [
        { title: 'Complete Web Development Bootcamp', type: 'course', url: 'https://www.udemy.com/course/the-complete-web-development-bootcamp/', provider: 'Udemy' },
        { title: 'freeCodeCamp Responsive Web Design', type: 'certification', url: 'https://www.freecodecamp.org/learn/responsive-web-design/', provider: 'freeCodeCamp' }
    ],
    backend: [
        { title: 'Backend Development with Node.js', type: 'course', url: 'https://www.udemy.com/course/nodejs-the-complete-guide/', provider: 'Udemy' },
        { title: 'Backend Architecture Patterns', type: 'documentation', url: 'https://martinfowler.com/eaaCatalog/', provider: 'Martin Fowler' }
    ],
    security: [
        { title: 'Web Security Fundamentals', type: 'course', url: 'https://www.edx.org/course/web-security-fundamentals', provider: 'edX' },
        { title: 'CompTIA Security+', type: 'certification', url: 'https://www.comptia.org/certifications/security', provider: 'CompTIA' }
    ]
};

// Default resources for unknown skills
const DEFAULT_RESOURCES = [
    { title: 'LinkedIn Learning', type: 'course', url: 'https://www.linkedin.com/learning/', provider: 'LinkedIn' },
    { title: 'Coursera Professional Certificates', type: 'certification', url: 'https://www.coursera.org/professional-certificates', provider: 'Coursera' },
    { title: 'freeCodeCamp', type: 'documentation', url: 'https://www.freecodecamp.org/', provider: 'freeCodeCamp' }
];

// ─── Analyze skill gaps for a member ────────────────────────────────
router.get('/:memberId', async (req, res) => {
    try {
        const member = await TeamMember.findById(req.params.memberId);
        if (!member) return res.status(404).json({ message: 'Member not found' });

        // Get all tasks assigned to this member
        const allTasks = await Task.find({ assignedTo: req.params.memberId });
        const completedTasks = allTasks.filter(t => t.status === 'completed');

        // Build member's known skills (all sources)
        const memberSkills = new Set([
            ...(member.qualities || []).map(q => q.toLowerCase()),
            ...(member.skills || []).map(s => s.name.toLowerCase())
        ]);

        // Analyze gaps from task history
        const skillAnalysis = {};

        for (const task of allTasks) {
            for (const req_quality of (task.requiredQualities || [])) {
                const skill = req_quality.toLowerCase();
                if (!skillAnalysis[skill]) {
                    skillAnalysis[skill] = {
                        skill,
                        totalTasks: 0,
                        completedTasks: 0,
                        overdueTasks: 0,
                        avgDuration: 0,
                        durations: [],
                        hasSkill: memberSkills.has(skill)
                    };
                }

                skillAnalysis[skill].totalTasks++;
                if (task.status === 'completed') {
                    skillAnalysis[skill].completedTasks++;
                    if (task.completionDuration) {
                        skillAnalysis[skill].durations.push(task.completionDuration);
                    }
                    // Check if overdue
                    if (task.completedAt && task.deadline && new Date(task.completedAt) > new Date(task.deadline)) {
                        skillAnalysis[skill].overdueTasks++;
                    }
                } else if (task.status === 'due') {
                    skillAnalysis[skill].overdueTasks++;
                }
            }
        }

        // Calculate gaps
        const gaps = [];
        for (const [skill, data] of Object.entries(skillAnalysis)) {
            data.avgDuration = data.durations.length
                ? Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length * 10) / 10
                : 0;

            // Determine gap severity
            let severity = 'none';
            let gapReason = '';

            if (!data.hasSkill && data.totalTasks > 0) {
                severity = 'high';
                gapReason = `Missing skill: ${data.totalTasks} task(s) required this skill but it's not in your profile`;
            } else if (data.overdueTasks > 0 && data.totalTasks >= 2) {
                const overdueRate = data.overdueTasks / data.totalTasks;
                if (overdueRate > 0.5) {
                    severity = 'high';
                    gapReason = `${Math.round(overdueRate * 100)}% of tasks with this skill were overdue`;
                } else if (overdueRate > 0.25) {
                    severity = 'medium';
                    gapReason = `${Math.round(overdueRate * 100)}% of tasks with this skill were overdue`;
                }
            } else if (data.completedTasks > 0 && data.avgDuration > 0) {
                // Compare with estimated time averages
                const taskAvgEstimated = allTasks
                    .filter(t => (t.requiredQualities || []).map(q => q.toLowerCase()).includes(skill))
                    .reduce((acc, t) => acc + (t.estimatedTime || 0), 0) / data.totalTasks;

                if (data.avgDuration > taskAvgEstimated * 1.5 && data.totalTasks >= 2) {
                    severity = 'medium';
                    gapReason = `Tasks take ${Math.round((data.avgDuration / taskAvgEstimated) * 100)}% of estimated time`;
                }
            }

            if (severity !== 'none') {
                gaps.push({
                    skill,
                    severity,
                    reason: gapReason,
                    hasSkill: data.hasSkill,
                    totalTasks: data.totalTasks,
                    completedTasks: data.completedTasks,
                    overdueTasks: data.overdueTasks,
                    avgDuration: data.avgDuration,
                    recommendations: LEARNING_RESOURCES[skill] || DEFAULT_RESOURCES
                });
            }
        }

        // Sort: high severity first
        gaps.sort((a, b) => {
            const sev = { high: 3, medium: 2, low: 1 };
            return (sev[b.severity] || 0) - (sev[a.severity] || 0);
        });

        res.json({
            memberId: member._id,
            memberName: member.name,
            currentSkills: [...memberSkills],
            gaps,
            totalGaps: gaps.length,
            highSeverityCount: gaps.filter(g => g.severity === 'high').length,
            mediumSeverityCount: gaps.filter(g => g.severity === 'medium').length,
            analyzedTasks: allTasks.length
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Get recommendations for a specific skill ───────────────────────
router.get('/:memberId/recommendations', async (req, res) => {
    try {
        const member = await TeamMember.findById(req.params.memberId);
        if (!member) return res.status(404).json({ message: 'Member not found' });

        // Return all available resources mapped to member's gap areas
        const memberSkills = new Set([
            ...(member.qualities || []).map(q => q.toLowerCase()),
            ...(member.skills || []).map(s => s.name.toLowerCase())
        ]);

        const allRecommendations = {};
        for (const [skill, resources] of Object.entries(LEARNING_RESOURCES)) {
            allRecommendations[skill] = {
                hasSkill: memberSkills.has(skill),
                resources
            };
        }

        res.json({ memberId: member._id, recommendations: allRecommendations });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
