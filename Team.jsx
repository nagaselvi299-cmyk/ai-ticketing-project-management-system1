import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

function Team() {
    const [members, setMembers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', qualities: '', maxTasks: 5 });

    useEffect(() => { fetchMembers(); }, []);

    const fetchMembers = async () => {
        const { data } = await axios.get(API + '/team');
        setMembers(data);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        await axios.post(API + '/team', {
            ...form,
            qualities: form.qualities.split(',').map(q => q.trim()).filter(Boolean),
            maxTasks: Number(form.maxTasks)
        });
        setShowModal(false);
        setForm({ name: '', email: '', qualities: '', maxTasks: 5 });
        fetchMembers();
    };

    const handleDelete = async (id) => {
        await axios.delete(API + '/team/' + id);
        fetchMembers();
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>👥 Team Members</h1>
                <button className="add-btn" onClick={() => setShowModal(true)}>+ Add Member</button>
            </div>

            <div className="team-grid">
                {members.map(m => (
                    <div key={m._id} className="team-card">
                        <div className="team-avatar">{m.name[0]?.toUpperCase()}</div>
                        <h3>{m.name}</h3>
                        <p className="team-email">{m.email || 'No email'}</p>
                        <div className="team-stats">
                            <span>Tasks: {m.currentTaskCount}/{m.maxTasks}</span>
                            <span>Capacity: {Math.round(((m.maxTasks - m.currentTaskCount) / m.maxTasks) * 100)}%</span>
                        </div>
                        <div className="quality-tags">
                            {m.qualities?.map((q, i) => <span key={i} className="quality-tag">{q}</span>)}
                        </div>
                        <button className="delete-btn small" onClick={() => handleDelete(m._id)}>Remove</button>
                    </div>
                ))}
                {members.length === 0 && <div className="empty-state">No team members yet. Add your first member!</div>}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add Team Member</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreate} className="task-form">
                            <div className="form-group">
                                <label>Name</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Qualities (comma-separated)</label>
                                <input type="text" value={form.qualities} onChange={e => setForm({ ...form, qualities: e.target.value })} placeholder="frontend, backend, design" />
                            </div>
                            <div className="form-group">
                                <label>Max Tasks</label>
                                <input type="number" min="1" value={form.maxTasks} onChange={e => setForm({ ...form, maxTasks: e.target.value })} />
                            </div>
                            <button type="submit" className="submit-btn">Add Member</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Team;
