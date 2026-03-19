const express = require('express');
const router = express.Router();

// ─── Priority keywords mapped to priority levels ───────────────────────────
const PRIORITY_RULES = [
    { keywords: ['client', 'customer', 'delivery', 'deploy', 'production', 'launch', 'demo', 'presentation', 'pitch', 'investor'], priority: 'high' },
    { keywords: ['academic', 'submission', 'exam', 'assignment', 'thesis', 'report', 'deadline', 'final'], priority: 'high' },
    { keywords: ['bug', 'error', 'crash', 'fix', 'broken', 'urgent', 'critical', 'hotfix', 'security', 'vulnerability'], priority: 'high' },
    { keywords: ['meeting', 'review', 'discussion', 'sync', 'standup', 'retrospective', 'planning', 'sprint'], priority: 'medium' },
    { keywords: ['update', 'modify', 'change', 'implement', 'develop', 'build', 'code', 'feature', 'integrate'], priority: 'medium' },
    { keywords: ['test', 'testing', 'qa', 'quality', 'check', 'verify', 'validate'], priority: 'medium' },
    { keywords: ['learn', 'learning', 'study', 'explore', 'research', 'experiment', 'tutorial', 'course'], priority: 'low' },
    { keywords: ['improve', 'improvement', 'refactor', 'optimize', 'cleanup', 'enhance', 'optional', 'nice to have'], priority: 'low' },
    { keywords: ['documentation', 'docs', 'readme', 'comment', 'wiki', 'knowledge base'], priority: 'low' }
];

// ─── Deadline rules based on task nature ───────────────────────────────────
const DEADLINE_RULES = [
    { keywords: ['meeting', 'call', 'standup', 'sync', 'demo', 'presentation', 'pitch'], daysOffset: 1, label: 'next working day' },
    { keywords: ['submission', 'deliver', 'delivery', 'deploy', 'launch', 'release', 'deadline', 'due'], daysOffset: 1, label: 'next working day' },
    { keywords: ['bug', 'fix', 'crash', 'error', 'hotfix', 'critical', 'urgent', 'security'], daysOffset: 1, label: 'next working day' },
    { keywords: ['review', 'feedback', 'approve', 'sign off', 'test', 'qa'], daysOffset: 2, label: 'within 2 days' },
    { keywords: ['develop', 'build', 'implement', 'code', 'feature', 'integrate', 'design'], daysOffset: 4, label: 'within 3-5 days' },
    { keywords: ['plan', 'planning', 'research', 'design', 'architect', 'prototype', 'explore'], daysOffset: 4, label: 'within 3-5 days' },
    { keywords: ['learn', 'study', 'tutorial', 'course', 'improve', 'refactor', 'optimize', 'documentation'], daysOffset: 10, label: 'within 7-14 days' }
];

// ─── Helper: Get next working day offset ───────────────────────────────────
function getWorkingDayDate(daysOffset) {
    const date = new Date();
    let added = 0;
    while (added < daysOffset) {
        date.setDate(date.getDate() + 1);
        const day = date.getDay();
        if (day !== 0 && day !== 6) { // Skip weekends
            added++;
        }
    }
    // Set to end of work day (6 PM)
    date.setHours(18, 0, 0, 0);
    return date;
}

// ─── Predict priority from text ────────────────────────────────────────────
function predictPriority(text) {
    const lower = text.toLowerCase();
    let bestPriority = 'medium'; // default
    let bestScore = 0;

    for (const rule of PRIORITY_RULES) {
        let score = 0;
        for (const keyword of rule.keywords) {
            if (lower.includes(keyword)) {
                score += keyword.length; // longer matches = more specific
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestPriority = rule.priority;
        }
    }
    return bestPriority;
}

// ─── Predict deadline from text ────────────────────────────────────────────
function predictDeadline(text) {
    const lower = text.toLowerCase();
    let bestOffset = 3; // default: 3 working days
    let bestScore = 0;

    for (const rule of DEADLINE_RULES) {
        let score = 0;
        for (const keyword of rule.keywords) {
            if (lower.includes(keyword)) {
                score += keyword.length;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestOffset = rule.daysOffset;
        }
    }

    return getWorkingDayDate(bestOffset);
}

// ─── Generate concise title from text ──────────────────────────────────────
function generateTitle(text) {
    // Clean up the text
    const cleaned = text.trim().replace(/\s+/g, ' ');

    // Try to extract the core action/subject
    const words = cleaned.split(' ');

    if (words.length <= 6) {
        // Short enough, capitalize and use as-is
        return capitalize(cleaned);
    }

    // Take first meaningful phrase (up to 8 words), removing filler
    const fillerWords = ['i', 'need', 'to', 'want', 'please', 'can', 'you', 'we', 'should', 'must',
        'have', 'has', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be',
        'do', 'does', 'did', 'will', 'would', 'could', 'shall', 'may', 'might',
        'there', 'it', 'that', 'this', 'those', 'these', 'so', 'also', 'just', 'like', 'basically'];

    // Find the first action verb/noun phrase
    let startIdx = 0;
    for (let i = 0; i < Math.min(words.length, 5); i++) {
        if (!fillerWords.includes(words[i].toLowerCase())) {
            startIdx = i;
            break;
        }
    }

    const meaningful = words.slice(startIdx, startIdx + 7).join(' ');
    // Remove trailing conjunctions/prepositions
    const trimmed = meaningful.replace(/\s+(and|or|but|with|for|from|to|in|on|at|by)\s*$/i, '');

    return capitalize(trimmed);
}

// ─── Generate professional description ─────────────────────────────────────
function generateDescription(text, priority, deadline) {
    const cleaned = text.trim().replace(/\s+/g, ' ');
    const deadlineStr = deadline.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    let priorityContext = '';
    switch (priority) {
        case 'high':
            priorityContext = 'This is a high-priority task that requires immediate attention and timely completion.';
            break;
        case 'medium':
            priorityContext = 'This task has a standard priority level and should be completed within the allocated timeframe.';
            break;
        case 'low':
            priorityContext = 'This is a low-priority task that can be scheduled flexibly around higher-priority work.';
            break;
    }

    return `${capitalize(cleaned)}.\n\n${priorityContext} Target completion date: ${deadlineStr}.`;
}

// ─── Helper: Capitalize first letter ───────────────────────────────────────
function capitalize(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── POST /api/voice-task/parse ────────────────────────────────────────────
router.post('/parse', (req, res) => {
    try {
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ message: 'No text provided' });
        }

        const priority = predictPriority(text);
        const deadline = predictDeadline(text);
        const title = generateTitle(text);
        const description = generateDescription(text, priority, deadline);

        res.json({
            title,
            description,
            priority,
            deadline: deadline.toISOString(),
            estimatedTime: priority === 'high' ? 4 : priority === 'medium' ? 6 : 8,
            rawText: text.trim()
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
