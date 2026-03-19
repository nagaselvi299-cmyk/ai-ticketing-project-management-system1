import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5000/api';

function TaskDetail() {
    const { id } = useParams();
    const [task, setTask] = useState(null);
    const [timeline, setTimeline] = useState([]);

    useEffect(() => {
        fetchTask();
        fetchTimeline();
    }, [id]);

    const fetchTask = async () => {
        const { data } = await axios.get(API + '/tasks/' + id);
        setTask(data);
    };

    const fetchTimeline = async () => {
        try {
            const { data } = await axios.get(API + '/timeline/' + id);
            setTimeline(data.timeline || []);
        } catch { setTimeline([]); }
    };

    if (!task) return <div className="page-container"><div className="loading">Loading...</div></div>;

    return (
        <div className="page-container">
            <Link to="/tasks" className="back-link">← Back to Tasks</Link>

            <div className="detail-card">
                <div className="detail-header">
                    <h1>{task.title}</h1>
                    <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
                </div>

                {task.project && <div className="detail-project">📁 {task.project}</div>}
                <p className="detail-desc">{task.description || 'No description provided'}</p>

                <div className="detail-grid">
                    <div className="detail-item">
                        <span className="detail-label">Status</span>
                        <span className={`status-badge status-${task.status}`}>{task.status}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Deadline</span>
                        <span>{new Date(task.deadline).toLocaleString()}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Estimated Time</span>
                        <span>{task.estimatedTime}h</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Assigned To</span>
                        <span>{task.assignedTo?.name || 'Unassigned'}</span>
                    </div>
                    {task.isBugFix && (
                        <div className="detail-item">
                            <span className="detail-label">Type</span>
                            <span>🐛 Bug Fix</span>
                        </div>
                    )}
                </div>

                {task.requiredQualities?.length > 0 && (
                    <div className="detail-qualities">
                        <h3>Required Qualities</h3>
                        <div className="quality-tags">
                            {task.requiredQualities.map((q, i) => <span key={i} className="quality-tag">{q}</span>)}
                        </div>
                    </div>
                )}

                {timeline.length > 0 && (
                    <div className="detail-timeline">
                        <h3>📅 Work Timeline</h3>
                        <div className="timeline-list">
                            {timeline.map((event, i) => (
                                <div key={i} className="timeline-event">
                                    <div className="timeline-dot"></div>
                                    <div className="timeline-content">
                                        <span className="timeline-action">{event.action}</span>
                                        <span className="timeline-time">
                                            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TaskDetail;
