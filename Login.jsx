import React, { useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

function Login({ onLogin }) {
    const [isRegister, setIsRegister] = useState(false);
    const [form, setForm] = useState({ username: '', email: '', password: '', role: 'Employee' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const endpoint = isRegister ? '/auth/register' : '/auth/login';
            const payload = isRegister
                ? { username: form.username, email: form.email, password: form.password, role: form.role }
                : { email: form.email, password: form.password };
            const { data } = await axios.post(API + endpoint, payload);
            onLogin(data.token, data.user);
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
        }
        setLoading(false);
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="login-logo">🚀</div>
                    <h1>ProManage</h1>
                    <p>AI-Powered Project Management</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <h2>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>

                    {isRegister && (
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                placeholder="Enter username"
                                value={form.username}
                                onChange={e => setForm({ ...form, username: e.target.value })}
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="Enter email"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Enter password"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            required
                        />
                    </div>

                    {isRegister && (
                        <div className="form-group">
                            <label>Role</label>
                            <div className="role-selector">
                                <button
                                    type="button"
                                    className={`role-option ${form.role === 'Employee' ? 'active' : ''}`}
                                    onClick={() => setForm({ ...form, role: 'Employee' })}
                                >
                                    <span className="role-icon">👨‍💻</span>
                                    <span className="role-name">Employee</span>
                                </button>
                                <button
                                    type="button"
                                    className={`role-option ${form.role === 'HR' ? 'active' : ''}`}
                                    onClick={() => setForm({ ...form, role: 'HR' })}
                                >
                                    <span className="role-icon">🏢</span>
                                    <span className="role-name">HR Manager</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {error && <div className="error-msg">{error}</div>}

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? '⏳ Please wait...' : isRegister ? '🚀 Register' : '🔑 Sign In'}
                    </button>

                    <p className="toggle-auth">
                        {isRegister ? 'Already have an account?' : "Don't have an account?"}
                        <button type="button" onClick={() => { setIsRegister(!isRegister); setError(''); }}>
                            {isRegister ? 'Sign In' : 'Register'}
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default Login;
