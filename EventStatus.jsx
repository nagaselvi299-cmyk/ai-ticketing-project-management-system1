import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

function EventStatus() {
    const [grouped, setGrouped] = useState({ todo: [], ongoing: [], completed: [], due: [] });

    useEffect(() => { fetchStatus(); }, []);

    const fetchStatus = async () => {
        const { data } = await axios.get(API + '/status');
        setGrouped(data);
    };

    const moveTask = async (taskId, newStatus) => {
        await axios.put(API + '/status/' + taskId, { status: newStatus });
        fetchStatus();
    };

    const columns = [
        { key: 'todo', title: '📝 To Do', color: '#64748b' },
        { key: 'ongoing', title: '🔄 In Progress', color: '#f59e0b' },
        { key: 'completed', title: '✅ Completed', color: '#10b981' },
        { key: 'due', title: '🔴 Overdue', color: '#ef4444' }
    ];

    const nextStatus = {
        todo: 'ongoing',
        ongoing: 'completed',
        due: 'ongoing'
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>📌 Status Board</h1>
            </div>

            <div className="kanban-board">
                {columns.map(col => (
                    <div key={col.key} className="kanban-column">
                        <div className="kanban-header" style={{ borderTopColor: col.color }}>
                            <h3>{col.title}</h3>
                            <span className="kanban-count">{grouped[col.key]?.length || 0}</span>
                        </div>
                        <div className="kanban-cards">
                            {grouped[col.key]?.map(task => (
                                <div key={task._id} className="kanban-card">
                                    <h4>{task.title}</h4>
                                    <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
                                    <p className="kanban-deadline">⏰ {new Date(task.deadline).toLocaleDateString()}</p>
                                    {task.assignedTo && <p className="kanban-member">👤 {task.assignedTo.name}</p>}
                                    {nextStatus[col.key] && (
                                        <button className="move-btn" onClick={() => moveTask(task._id, nextStatus[col.key])}>
                                            Move → {nextStatus[col.key]}
                                        </button>
                                    )}
                                </div>
                            ))}
                            {(!grouped[col.key] || grouped[col.key].length === 0) && (
                                <div className="kanban-empty">No tasks</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default EventStatus;
