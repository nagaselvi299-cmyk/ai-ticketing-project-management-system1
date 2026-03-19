import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API = 'http://localhost:5000/api';

// ─── Speech Recognition Setup ──────────────────────────────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// ─── NLP: Parse voice text into structured task fields ─────────────────
function parseVoiceInput(text) {
    const result = { title: '', priority: null, deadline: null, isBugFix: false };
    let remaining = text;

    // Detect priority keywords
    const priorityPatterns = [
        { regex: /\b(critical|urgent)\b/i, value: 'critical' },
        { regex: /\bhigh\s*priority\b/i, value: 'high' },
        { regex: /\blow\s*priority\b/i, value: 'low' },
        { regex: /\bmedium\s*priority\b/i, value: 'medium' },
        { regex: /\bcritical\s*priority\b/i, value: 'critical' },
        { regex: /\bhigh\b/i, value: 'high' },
        { regex: /\blow\b/i, value: 'low' },
    ];
    for (const p of priorityPatterns) {
        if (p.regex.test(remaining)) {
            result.priority = p.value;
            remaining = remaining.replace(p.regex, '').trim();
            break;
        }
    }

    // Detect deadline keywords
    const now = new Date();
    const deadlinePatterns = [
        { regex: /\b(today)\b/i, days: 0 },
        { regex: /\b(tomorrow)\b/i, days: 1 },
        { regex: /\b(day after tomorrow)\b/i, days: 2 },
        { regex: /\b(next week)\b/i, days: 7 },
        { regex: /\b(next month)\b/i, days: 30 },
        { regex: /\bin\s*(\d+)\s*days?\b/i, daysGroup: 1 },
        { regex: /\bin\s*(\d+)\s*hours?\b/i, hoursGroup: 1 },
    ];
    for (const d of deadlinePatterns) {
        const match = remaining.match(d.regex);
        if (match) {
            const target = new Date(now);
            if (d.daysGroup) {
                target.setDate(target.getDate() + parseInt(match[d.daysGroup]));
            } else if (d.hoursGroup) {
                target.setHours(target.getHours() + parseInt(match[d.hoursGroup]));
            } else {
                target.setDate(target.getDate() + d.days);
            }
            target.setHours(17, 0, 0, 0); // default to 5 PM
            result.deadline = target.toISOString().slice(0, 16); // datetime-local format
            remaining = remaining.replace(d.regex, '').trim();
            break;
        }
    }

    // Detect bug fix
    if (/\bbug\b/i.test(remaining)) {
        result.isBugFix = true;
    }

    // Clean up extra words and use as title
    result.title = remaining
        .replace(/\b(priority|set|create|add|task|please|the|a|an)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

    return result;
}

// ─── Mic Button Component ──────────────────────────────────────────────
function MicButton({ onResult, onError, fieldName }) {
    const [listening, setListening] = useState(false);
    const [interim, setInterim] = useState('');
    const recognitionRef = useRef(null);

    const startListening = useCallback(() => {
        if (!SpeechRecognition) {
            onError('Speech Recognition is not supported in this browser. Please use Chrome.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setListening(true);

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            if (interimTranscript) setInterim(interimTranscript);
            if (finalTranscript) {
                setInterim('');
                onResult(finalTranscript.trim());
            }
        };

        recognition.onerror = (event) => {
            setListening(false);
            setInterim('');
            if (event.error === 'no-speech') {
                onError('No speech detected. Please try again.');
            } else if (event.error === 'not-allowed') {
                onError('Microphone permission denied. Please allow microphone access.');
            } else {
                onError(`Speech recognition error: ${event.error}`);
            }
        };

        recognition.onend = () => {
            setListening(false);
            setInterim('');
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [onResult, onError]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }, []);

    return (
        <div className="mic-wrapper">
            <button
                type="button"
                className={`mic-btn ${listening ? 'recording' : ''}`}
                onClick={listening ? stopListening : startListening}
                title={listening ? 'Stop recording' : `Voice input for ${fieldName}`}
            >
                {listening ? (
                    <span className="mic-recording-icon">
                        <span className="mic-pulse"></span>
                        🔴
                    </span>
                ) : '🎤'}
            </button>
            {listening && <span className="mic-status">Listening...</span>}
            {interim && <span className="mic-interim">{interim}</span>}
        </div>
    );
}

// ─── Main Task Component ───────────────────────────────────────────────
function Task({ user }) {
    const [tasks, setTasks] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [members, setMembers] = useState([]);
    const [form, setForm] = useState({
        title: '', description: '', deadline: '', estimatedTime: 1,
        requiredQualities: '', assignedTo: '', project: 'General', isBugFix: false
    });
    const [prediction, setPrediction] = useState(null);
    const [voiceError, setVoiceError] = useState('');
    const [voiceParsed, setVoiceParsed] = useState(null);

    useEffect(() => { fetchTasks(); fetchMembers(); }, []);

    // Clear voice error after 4 seconds
    useEffect(() => {
        if (voiceError) {
            const t = setTimeout(() => setVoiceError(''), 4000);
            return () => clearTimeout(t);
        }
    }, [voiceError]);

    // Clear parsed info after 5 seconds
    useEffect(() => {
        if (voiceParsed) {
            const t = setTimeout(() => setVoiceParsed(null), 5000);
            return () => clearTimeout(t);
        }
    }, [voiceParsed]);

    const fetchTasks = async () => {
        const { data } = await axios.get(API + '/tasks');
        setTasks(data);
    };

    const fetchMembers = async () => {
        const { data } = await axios.get(API + '/team');
        setMembers(data);
    };

    // Voice result handler for Title — uses NLP parsing
    const handleTitleVoice = useCallback((text) => {
        const parsed = parseVoiceInput(text);
        const updates = { title: parsed.title };
        if (parsed.priority) updates.priority = parsed.priority;
        if (parsed.deadline) updates.deadline = parsed.deadline;
        if (parsed.isBugFix) updates.isBugFix = true;

        setForm(prev => ({ ...prev, ...updates }));
        setVoiceParsed(parsed);
    }, []);

    // Voice result handler for Description — appends text directly
    const handleDescVoice = useCallback((text) => {
        setForm(prev => ({
            ...prev,
            description: prev.description ? prev.description + ' ' + text : text
        }));
    }, []);

    const handleVoiceError = useCallback((msg) => setVoiceError(msg), []);

    const handlePredict = async () => {
        if (!form.deadline) return;
        const { data } = await axios.post(API + '/tasks/predict', {
            deadline: form.deadline,
            requiredQualities: form.requiredQualities.split(',').map(q => q.trim()).filter(Boolean)
        });
        setPrediction(data);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        await axios.post(API + '/tasks', {
            ...form,
            estimatedTime: Number(form.estimatedTime),
            requiredQualities: form.requiredQualities.split(',').map(q => q.trim()).filter(Boolean),
            assignedTo: form.assignedTo || undefined
        });
        setShowModal(false);
        setForm({ title: '', description: '', deadline: '', estimatedTime: 1, requiredQualities: '', assignedTo: '', project: 'General', isBugFix: false });
        setPrediction(null);
        setVoiceParsed(null);
        fetchTasks();
    };

    const handleDelete = async (id) => {
        await axios.delete(API + '/tasks/' + id);
        fetchTasks();
    };

    const getPriorityClass = (p) => {
        const map = { critical: 'priority-critical', high: 'priority-high', medium: 'priority-medium', low: 'priority-low' };
        return map[p] || '';
    };

    const getStatusClass = (s) => {
        const map = { completed: 'status-completed', ongoing: 'status-ongoing', todo: 'status-todo', due: 'status-due' };
        return map[s] || '';
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>📋 Tasks</h1>
                {user?.role === 'Employee' && <button className="add-btn" onClick={() => setShowModal(true)}>+ Add Task</button>}
            </div>

            <div className="tasks-grid">
                {tasks.map(task => (
                    <div key={task._id} className="task-card">
                        <div className="task-card-header">
                            <Link to={`/tasks/${task._id}`} className="task-title-link">
                                <h3>{task.title}</h3>
                            </Link>
                            <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
                                {task.priority}
                            </span>
                        </div>
                        {task.project && <span className="task-project">📁 {task.project}</span>}
                        <p className="task-desc">{task.description || 'No description'}</p>
                        <div className="task-meta">
                            <span className={`status-badge ${getStatusClass(task.status)}`}>{task.status}</span>
                            <span>⏰ {new Date(task.deadline).toLocaleDateString()}</span>
                            {task.assignedTo && <span>👤 {task.assignedTo.name}</span>}
                        </div>
                        <div className="task-actions">
                            <Link to={`/tasks/${task._id}`} className="view-btn">View</Link>
                            {user?.role === 'Employee' && <button className="delete-btn" onClick={() => handleDelete(task._id)}>🗑️</button>}
                        </div>
                    </div>
                ))}
                {tasks.length === 0 && <div className="empty-state">No tasks yet. Create your first task!</div>}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create New Task</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        {/* Voice Error Banner */}
                        {voiceError && (
                            <div className="voice-error">
                                <span>⚠️ {voiceError}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="task-form">
                            {/* Title with Mic */}
                            <div className="form-group">
                                <label>Title</label>
                                <div className="input-with-mic">
                                    <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder='e.g. "Fix login API bug tomorrow high priority"' />
                                    <MicButton onResult={handleTitleVoice} onError={handleVoiceError} fieldName="Title" />
                                </div>
                            </div>

                            {/* Voice Parsed Info */}
                            {voiceParsed && (
                                <div className="voice-parsed-info">
                                    <span className="parsed-label">🤖 AI Extracted:</span>
                                    <div className="parsed-items">
                                        <span className="parsed-chip">📝 {voiceParsed.title || '—'}</span>
                                        {voiceParsed.priority && <span className={`parsed-chip ${getPriorityClass(voiceParsed.priority)}`}>🎯 {voiceParsed.priority}</span>}
                                        {voiceParsed.deadline && <span className="parsed-chip">📅 {new Date(voiceParsed.deadline).toLocaleDateString()}</span>}
                                        {voiceParsed.isBugFix && <span className="parsed-chip">🐛 Bug Fix</span>}
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Project</label>
                                <input type="text" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} placeholder="Project name" />
                            </div>

                            {/* Description with Mic */}
                            <div className="form-group">
                                <label>Description</label>
                                <div className="input-with-mic textarea-mic">
                                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the task or use the mic..." />
                                    <MicButton onResult={handleDescVoice} onError={handleVoiceError} fieldName="Description" />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Deadline</label>
                                    <input type="datetime-local" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Est. Hours</label>
                                    <input type="number" min="1" value={form.estimatedTime} onChange={e => setForm({ ...form, estimatedTime: e.target.value })} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Required Qualities (comma-separated)</label>
                                <input type="text" value={form.requiredQualities} onChange={e => setForm({ ...form, requiredQualities: e.target.value })} placeholder="frontend, design, testing" />
                            </div>
                            <div className="form-group">
                                <label>Assign To</label>
                                <select value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
                                    <option value="">Auto-assign (AI)</option>
                                    {members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group checkbox-group">
                                <label>
                                    <input type="checkbox" checked={form.isBugFix} onChange={e => setForm({ ...form, isBugFix: e.target.checked })} />
                                    🐛 Bug Fix Task
                                </label>
                            </div>
                            <button type="button" className="predict-btn" onClick={handlePredict}>🤖 AI Predict</button>
                            {prediction && (
                                <div className="prediction-result">
                                    <p>Priority: <span className={`priority-badge ${getPriorityClass(prediction.predictedPriority)}`}>{prediction.predictedPriority}</span></p>
                                    {prediction.predictedMember && (
                                        <p>Best Match: <strong>{prediction.predictedMember.member.name}</strong> (Score: {prediction.predictedMember.totalScore}%)</p>
                                    )}
                                </div>
                            )}
                            <button type="submit" className="submit-btn">Create Task</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Task;
