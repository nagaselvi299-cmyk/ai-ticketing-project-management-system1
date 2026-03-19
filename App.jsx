import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import axios from 'axios';

import Login from './pages/Login';
import Task from './pages/Task';
import TaskDetail from './pages/TaskDetail';
import Team from './pages/Team';
import EventStatus from './pages/EventStatus';
import MyWorks from './pages/MyWorks';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import AIAssignment from './pages/AIAssignment';
import SkillProfile from './pages/SkillProfile';
import SkillGap from './pages/SkillGap';
import WorkStyle from './pages/WorkStyle';
import LinkedInProfile from './pages/LinkedInProfile';

function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(() => {
        const u = localStorage.getItem('user');
        return u ? JSON.parse(u) : null;
    });
    const navigate = useNavigate();
    const location = useLocation();

    // Set axios default auth header whenever token changes
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    const handleLogin = (tok, usr) => {
        localStorage.setItem('token', tok);
        localStorage.setItem('user', JSON.stringify(usr));
        setToken(tok);
        setUser(usr);
        navigate('/my-works');
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        navigate('/');
    };

    if (!token) {
        return (
            <Routes>
                <Route path="*" element={<Login onLogin={handleLogin} />} />
            </Routes>
        );
    }

    const isHR = user?.role === 'HR';
    const isEmployee = user?.role === 'Employee' || !user?.role;

    // HR: insight-only (employee profiles, leaderboard, status, work style)
    // Employee: full access to all core operational features
    const navItems = [
        { to: '/my-works', icon: '📊', label: 'My Works', empOnly: true },
        { to: '/tasks', icon: '📋', label: 'Tasks', empOnly: true },
        { to: '/team', icon: '👥', label: 'Team', empOnly: true },
        { to: '/status', icon: '📌', label: 'Status Board', everyone: true },
        { to: '/leaderboard', icon: '🏆', label: 'Leaderboard', everyone: true },
        { to: '/linkedin-profile', icon: '💼', label: 'My Profile', everyone: true },
        { to: '/profile', icon: '👤', label: 'Employee Stats', everyone: true },
        { to: '/ai-assign', icon: '🤖', label: 'AI Assign', empOnly: true },
        { to: '/skill-profile', icon: '📜', label: 'Skills', empOnly: true },
        { to: '/skill-gap', icon: '📈', label: 'Skill Gap', empOnly: true },
        { to: '/work-style', icon: '🧠', label: 'Work Style', everyone: true },
    ].filter(item => item.everyone || (item.empOnly && isEmployee));

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">🚀</div>
                    <h2>ProManage</h2>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`nav-item ${location.pathname === item.to ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">{user?.username?.[0]?.toUpperCase() || '?'}</div>
                        <div className="user-meta">
                            <span className="user-name">{user?.username || 'User'}</span>
                            <span className="user-role-badge">{user?.role || 'Employee'}</span>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        🚪 Logout
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <Routes>
                    <Route path="/my-works" element={isEmployee ? <MyWorks user={user} /> : <Navigate to="/status" />} />
                    <Route path="/tasks" element={isEmployee ? <Task user={user} /> : <Navigate to="/status" />} />
                    <Route path="/tasks/:id" element={isEmployee ? <TaskDetail /> : <Navigate to="/status" />} />
                    <Route path="/team" element={isEmployee ? <Team /> : <Navigate to="/status" />} />
                    <Route path="/status" element={<EventStatus />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/profile" element={<Profile user={user} />} />
                    <Route path="/linkedin-profile" element={<LinkedInProfile user={user} />} />
                    <Route path="/ai-assign" element={isEmployee ? <AIAssignment /> : <Navigate to="/status" />} />
                    <Route path="/skill-profile" element={isEmployee ? <SkillProfile /> : <Navigate to="/status" />} />
                    <Route path="/skill-gap" element={isEmployee ? <SkillGap /> : <Navigate to="/status" />} />
                    <Route path="/work-style" element={<WorkStyle />} />
                    <Route path="*" element={<Navigate to={isHR ? "/status" : "/my-works"} />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;
