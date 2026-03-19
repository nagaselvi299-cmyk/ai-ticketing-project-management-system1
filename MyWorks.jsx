import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API = 'http://localhost:5000/api';

function MyWorks({ user }) {
    const [tasks, setTasks] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [aiQuery, setAiQuery] = useState('');
    const [aiSolution, setAiSolution] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [tasksRes, notifRes] = await Promise.all([
                axios.get(API + '/tasks'),
                axios.get(API + '/status/notifications')
            ]);
            setTasks(tasksRes.data);
            setNotifications(notifRes.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const fetchNotifications = async () => {
        try {
            const { data } = await axios.get(API + '/status/notifications');
            setNotifications(data);
        } catch { }
    };

    // Summary calculations
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'ongoing').length;
    const pending = tasks.filter(t => t.status === 'todo').length;
    const overdue = tasks.filter(t => t.status === 'due').length;
    const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // AI Solution Generator
    const generateSolution = () => {
        if (!aiQuery.trim()) return;
        setAiLoading(true);
        setTimeout(() => {
            const solutions = {
                'login': ['Check authentication middleware configuration', 'Verify JWT token expiry and refresh logic', 'Ensure CORS settings allow credential headers', 'Check that bcrypt compare is working with hashed passwords'],
                'api': ['Verify endpoint URL and HTTP method', 'Check request body format (JSON content-type)', 'Review middleware order in Express pipeline', 'Inspect network tab for response error details'],
                'database': ['Check MongoDB connection string', 'Verify model schema matches data structure', 'Ensure indexes exist for queried fields', 'Check for unhandled promise rejections'],
                'ui': ['Check component state lifecycle', 'Verify CSS class names and specificity', 'Ensure proper import of components', 'Check React key props in list renders'],
                'performance': ['Implement lazy loading for heavy components', 'Add memoization with useMemo/useCallback', 'Optimize database queries with proper indexes', 'Consider pagination for large data sets'],
                'error': ['Add try-catch blocks around async operations', 'Implement global error boundary for React', 'Add proper error logging middleware', 'Check console/network tab for stack traces']
            };

            const query = aiQuery.toLowerCase();
            let matched = solutions['error']; // default
            for (const [key, value] of Object.entries(solutions)) {
                if (query.includes(key)) { matched = value; break; }
            }

            setAiSolution({
                bug: aiQuery,
                suggestions: matched,
                timestamp: new Date().toLocaleTimeString()
            });
            setAiLoading(false);
        }, 1500);
    };

    if (loading) return <div className="page-container"><div className="loading">Loading your dashboard...</div></div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>📊 My Works</h1>
                <p className="page-subtitle">Welcome back, <strong>{user?.username || 'Developer'}</strong>!</p>
            </div>

            {/* Summary Cards */}
            <div className="summary-grid">
                <div className="summary-card total">
                    <div className="summary-icon">📋</div>
                    <div className="summary-info">
                        <span className="summary-number">{total}</span>
                        <span className="summary-label">Total Tasks</span>
                    </div>
                </div>
                <div className="summary-card completed">
                    <div className="summary-icon">✅</div>
                    <div className="summary-info">
                        <span className="summary-number">{completed}</span>
                        <span className="summary-label">Completed</span>
                    </div>
                </div>
                <div className="summary-card in-progress">
                    <div className="summary-icon">🔄</div>
                    <div className="summary-info">
                        <span className="summary-number">{inProgress}</span>
                        <span className="summary-label">In Progress</span>
                    </div>
                </div>
                <div className="summary-card pending">
                    <div className="summary-icon">⏳</div>
                    <div className="summary-info">
                        <span className="summary-number">{pending}</span>
                        <span className="summary-label">Pending</span>
                    </div>
                </div>
                {overdue > 0 && (
                    <div className="summary-card overdue">
                        <div className="summary-icon">🔴</div>
                        <div className="summary-info">
                            <span className="summary-number">{overdue}</span>
                            <span className="summary-label">Overdue</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="progress-section">
                <div className="progress-header">
                    <h2>📈 Task Completion</h2>
                    <span className="progress-percent">{completionPercent}%</span>
                </div>
                <div className="progress-bar-container">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${completionPercent}%` }}
                    >
                        <span className="progress-bar-text">{completionPercent}%</span>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            {notifications.length > 0 && (
                <div className="notifications-section">
                    <h2>🔔 Notifications</h2>
                    <div className="notification-list">
                        {notifications.map(n => (
                            <div key={n._id} className="notification-item">
                                <span className="notif-icon">⚠️</span>
                                <div className="notif-content">
                                    <strong>{n.title}</strong> — Deadline approaching!
                                    <span className="notif-time">{new Date(n.deadline).toLocaleString()}</span>
                                </div>
                                <Link to={`/tasks/${n._id}`} className="notif-action">View →</Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Task List Table */}
            <div className="task-table-section">
                <h2>📋 Task List</h2>
                <div className="table-wrapper">
                    <table className="task-table">
                        <thead>
                            <tr>
                                <th>Task Name</th>
                                <th>Project</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Deadline</th>
                                <th>Assigned To</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(task => (
                                <tr key={task._id}>
                                    <td>
                                        <Link to={`/tasks/${task._id}`} className="task-name-link">
                                            {task.title}
                                        </Link>
                                    </td>
                                    <td><span className="project-tag">{task.project || 'General'}</span></td>
                                    <td>
                                        <span className={`status-dot status-${task.status}`}>
                                            {task.status === 'completed' ? '🟢' : task.status === 'ongoing' ? '🟡' : task.status === 'due' ? '🔴' : '⚪'} {task.status}
                                        </span>
                                    </td>
                                    <td><span className={`priority-badge priority-${task.priority}`}>{task.priority}</span></td>
                                    <td>{new Date(task.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                                    <td>{task.assignedTo?.name || '—'}</td>
                                </tr>
                            ))}
                            {tasks.length === 0 && (
                                <tr><td colSpan="6" className="empty-table">No tasks found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* AI Auto Solution Generator */}
            <div className="ai-solution-section">
                <h2>🧠 AI Auto Solution Generator</h2>
                <p className="ai-subtitle">Describe a bug and get instant fix suggestions</p>
                <div className="ai-input-group">
                    <input
                        type="text"
                        value={aiQuery}
                        onChange={e => setAiQuery(e.target.value)}
                        placeholder="e.g. Login API error, Database connection failed..."
                        className="ai-input"
                        onKeyDown={e => e.key === 'Enter' && generateSolution()}
                    />
                    <button
                        className="ai-generate-btn"
                        onClick={generateSolution}
                        disabled={aiLoading}
                    >
                        {aiLoading ? '⏳ Analyzing...' : '🤖 Get Solution'}
                    </button>
                </div>

                {aiSolution && (
                    <div className="ai-result-card">
                        <div className="ai-result-header">
                            <span className="ai-bug-label">🐛 Bug:</span>
                            <span>{aiSolution.bug}</span>
                        </div>
                        <div className="ai-suggestions">
                            <h4>💡 Suggested Fix:</h4>
                            <ul>
                                {aiSolution.suggestions.map((s, i) => (
                                    <li key={i}>{s}</li>
                                ))}
                            </ul>
                        </div>
                        <span className="ai-timestamp">Generated at {aiSolution.timestamp}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyWorks;
