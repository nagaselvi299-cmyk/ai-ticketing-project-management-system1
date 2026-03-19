const express = require('express');
const router = express.Router();

// ─── FAQ Knowledge Base ────────────────────────────────────────────────────
const FAQ_DATABASE = [
    {
        keywords: ['create task', 'add task', 'new task', 'make task'],
        reply: '📋 To create a new task:\n1. Go to the Tasks page\n2. Click the "➕ Add Task" button\n3. Fill in the title, description, deadline, and estimated time\n4. Optionally select required qualities for AI-based auto-assignment\n5. Click "✅ Create Task"\n\nTip: Use the 🤖 Predict button to let AI suggest the best team member!',
        category: 'tasks'
    },
    {
        keywords: ['assign task', 'assign member', 'auto assign', 'predict assignment'],
        reply: '👤 Task Assignment Options:\n• **Manual**: Select a team member from the dropdown when creating a task\n• **AI Auto-assign**: Leave the assignment blank and select required qualities — the AI will predict the best match based on skills and capacity\n• Use the "🤖 Predict Assignment & Priority" button to see AI recommendations before creating',
        category: 'tasks'
    },
    {
        keywords: ['delete task', 'remove task'],
        reply: '🗑️ To delete a task:\n1. Go to the Tasks page\n2. Find the task card you want to remove\n3. Click the 🗑 button on the task card\n\nNote: This will also update the assigned team member\'s task count automatically.',
        category: 'tasks'
    },
    {
        keywords: ['priority', 'priorities', 'task priority', 'set priority'],
        reply: '🎯 Task Priority Levels:\n• 🟢 **Low** — Non-urgent, can be done over time\n• 🔵 **Medium** — Standard tasks with reasonable deadlines\n• 🟡 **High** — Important tasks needing prompt attention\n• 🔴 **Critical** — Urgent! Deadline is within 6 hours\n\nPriority is auto-predicted by AI based on your deadline. Closer deadlines = higher priority!',
        category: 'tasks'
    },
    {
        keywords: ['deadline', 'due date', 'overdue', 'due task'],
        reply: '📅 Deadline Management:\n• Set deadlines when creating tasks using the datetime picker\n• Tasks automatically move to "Due" status when the deadline passes\n• You\'ll receive notifications 1 hour before a deadline\n• Overdue tasks are highlighted in the Status Board\n\nTip: Be realistic with deadlines — the AI uses them to predict priority!',
        category: 'tasks'
    },
    {
        keywords: ['status', 'status board', 'kanban', 'task status', 'track'],
        reply: '📊 Status Board (Kanban View):\n• **Todo** — Tasks not yet started\n• **Ongoing** — Tasks currently in progress\n• **Completed** — Finished tasks ✅\n• **Due** — Tasks that missed their deadline ⚠️\n\nUse the Status Board page to see all tasks organized by their current status. You can change task status from the task detail page.',
        category: 'status'
    },
    {
        keywords: ['team', 'member', 'add member', 'team member'],
        reply: '👥 Team Management:\n• Go to the Team page to view all team members\n• Each member has qualities/skills listed (e.g., frontend, backend, design)\n• The capacity bar shows how many tasks each member can handle\n• AI uses these qualities to auto-assign the best person for each task\n\nTo add a new member, use the team management form on the Team page.',
        category: 'team'
    },
    {
        keywords: ['notification', 'alert', 'remind', 'reminder'],
        reply: '🔔 Notifications:\n• The system automatically checks for approaching deadlines every minute\n• You\'ll see a toast notification 1 hour before a task deadline\n• Notifications ask if the task is completed — respond with "Yes" or "No"\n• If "No", the task is marked as "Due"\n\nNotifications appear as overlay toasts in the top-right corner.',
        category: 'notifications'
    },
    {
        keywords: ['login', 'sign in', 'account', 'register', 'sign up'],
        reply: '🔐 Login & Registration:\n• **Login**: Enter your username and password on the login page\n• **Register**: Click "Sign Up" to create a new account\n• Your session is saved locally — you stay logged in until you log out\n\nTroubleshooting:\n• If login fails, make sure the backend server is running on port 5000\n• Check that your username and password are correct',
        category: 'auth'
    },
    {
        keywords: ['voice', 'speech', 'microphone', 'voice task', 'speak'],
        reply: '🎤 Voice Task Creation:\n1. Go to the "Voice Task" page from the sidebar\n2. Click the microphone button to start recording\n3. Speak your task description naturally\n4. The AI will automatically generate:\n   • Task Title\n   • Detailed Description\n   • Priority (predicted from context)\n   • Deadline (predicted from task type)\n5. Review the result and click "Create Task" to save it!',
        category: 'voice'
    },
    {
        keywords: ['not working', 'error', 'bug', 'problem', 'issue', 'broken'],
        reply: '🔧 Common Troubleshooting:\n1. **Backend not connecting**: Make sure the server is running (`node index.js` in the backend folder)\n2. **Tasks not loading**: Check if MongoDB is connected (look for ✅ in terminal)\n3. **Blank page**: Try refreshing or clearing browser cache\n4. **Login failing**: Verify backend is running on port 5000\n5. **Notifications not showing**: They only appear 1 hour before deadline\n\nIf the issue persists, try restarting both frontend and backend servers.',
        category: 'troubleshooting'
    },
    {
        keywords: ['help', 'how to', 'what can', 'guide', 'tutorial'],
        reply: '📖 ProManage Quick Guide:\n• 📋 **Tasks** — Create, view, and manage project tasks\n• 👥 **Team** — Add team members with skills for AI assignment\n• 📊 **Status Board** — Kanban view of all task statuses\n• 🎤 **Voice Task** — Create tasks by speaking\n• 🔔 **Notifications** — Auto alerts before deadlines\n\nAsk me about any specific feature and I\'ll explain in detail!',
        category: 'general'
    },
    {
        keywords: ['predict', 'ai', 'artificial intelligence', 'smart', 'auto'],
        reply: '🤖 AI Features in ProManage:\n1. **Priority Prediction** — Automatically sets task priority based on deadline proximity\n2. **Team Assignment** — Matches tasks to the best team member using skill matching + capacity analysis\n3. **Voice Task Parsing** — Converts speech to structured tasks with smart title, description, priority & deadline\n4. **Deadline Monitoring** — Cron job automatically tracks overdue tasks\n\nAll AI runs locally — no external API keys required!',
        category: 'ai'
    },
    {
        keywords: ['hai', 'hello', 'hi', 'hey', 'good morning', 'good evening', 'good afternoon'],
        reply: '👋 Hello! Welcome to ProManage Assistant!\n\nI\'m here 24/7 to help you with:\n• 📋 Task management\n• 👥 Team operations\n• 📊 Status tracking\n• 🔧 Troubleshooting\n\nWhat can I help you with today?',
        category: 'greeting'
    },
    {
        keywords: ['vanakkam', 'வணக்கம்', 'nandri', 'நன்றி', 'tamil'],
        reply: '🙏 வணக்கம்! ProManage உதவியாளருக்கு வரவேற்கிறோம்!\n\nHello! Welcome to ProManage Assistant!\nI\'m here to help you with all your project management needs. Feel free to ask in English — I\'ll be happy to assist!\n\nWhat can I help you with? 😊',
        category: 'greeting'
    },
    {
        keywords: ['thank', 'thanks', 'thank you', 'appreciate'],
        reply: '😊 You\'re welcome! Happy to help!\n\nFeel free to ask me anything else about ProManage. I\'m available 24/7!\n\n🙏 நன்றி (Nandri)!',
        category: 'greeting'
    },
    {
        keywords: ['bye', 'goodbye', 'see you', 'quit', 'exit'],
        reply: '👋 Goodbye! Have a productive day!\n\nRemember, I\'m always here whenever you need help with ProManage. Just click the chat bubble! 🚀\n\nமீண்டும் சந்திப்போம்! (See you again!)',
        category: 'greeting'
    }
];

// ─── Default suggestions by context ────────────────────────────────────────
const DEFAULT_SUGGESTIONS = [
    'How to create a task?',
    'What are priority levels?',
    'How does AI assignment work?',
    'Show troubleshooting tips'
];

const CATEGORY_SUGGESTIONS = {
    tasks: ['How to assign tasks?', 'What are priority levels?', 'How to set deadlines?'],
    status: ['How to change task status?', 'What does "Due" mean?', 'Show all features'],
    team: ['How does AI assignment work?', 'Show all features', 'How to create a task?'],
    notifications: ['How do deadlines work?', 'Show troubleshooting tips', 'Show all features'],
    auth: ['Show troubleshooting tips', 'How to create a task?', 'Show all features'],
    voice: ['How to create a task?', 'What are priorities?', 'Show all features'],
    troubleshooting: ['How to create a task?', 'Show all features', 'Login help'],
    general: ['How to create a task?', 'Team management', 'Voice task creation'],
    ai: ['How to create a task?', 'Voice task creation', 'Team management'],
    greeting: ['How to create a task?', 'Show all features', 'What can you help with?']
};

// ─── Smart matching engine ─────────────────────────────────────────────────
function findBestMatch(userMessage) {
    const msg = userMessage.toLowerCase().trim();

    // Score each FAQ entry
    let bestMatch = null;
    let bestScore = 0;

    for (const faq of FAQ_DATABASE) {
        let score = 0;
        for (const keyword of faq.keywords) {
            if (msg.includes(keyword)) {
                // Exact phrase match scores higher
                score += keyword.split(' ').length * 2;
            } else {
                // Check individual word overlap
                const keywordWords = keyword.split(' ');
                const msgWords = msg.split(/\s+/);
                const overlap = keywordWords.filter(w => msgWords.includes(w)).length;
                if (overlap > 0) {
                    score += overlap;
                }
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = faq;
        }
    }

    return { match: bestMatch, score: bestScore };
}

// ─── POST /api/chatbot ─────────────────────────────────────────────────────
router.post('/', (req, res) => {
    try {
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.json({
                reply: '🤔 I didn\'t catch that. Could you please type your question?',
                suggestions: DEFAULT_SUGGESTIONS
            });
        }

        const { match, score } = findBestMatch(message);

        if (match && score >= 2) {
            const suggestions = CATEGORY_SUGGESTIONS[match.category] || DEFAULT_SUGGESTIONS;
            return res.json({
                reply: match.reply,
                suggestions
            });
        }

        // Fallback: no good match found
        res.json({
            reply: '🤔 I\'m not sure about that, but here are some things I can help you with:\n\n• **Task Management** — creating, assigning, deleting tasks\n• **Team Operations** — managing team members and skills\n• **Status Tracking** — understanding the Kanban board\n• **Troubleshooting** — fixing common issues\n• **AI Features** — predictions, voice tasks, auto-assignment\n\nTry asking about any of these topics!',
            suggestions: DEFAULT_SUGGESTIONS
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
