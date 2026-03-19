import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

function Leaderboard() {
    const [rankings, setRankings] = useState([]);
    const [benefits, setBenefits] = useState({});
    const [pointsConfig, setPointsConfig] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [lbRes, benRes] = await Promise.all([
                axios.get(API + '/rankings/leaderboard'),
                axios.get(API + '/rankings/benefits')
            ]);
            setRankings(lbRes.data.rankings);
            setPointsConfig(lbRes.data.pointsConfig);
            setBenefits(benRes.data.benefits);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const getRankEmoji = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    const getRankClass = (rank) => {
        if (rank === 1) return 'rank-gold';
        if (rank === 2) return 'rank-silver';
        if (rank === 3) return 'rank-bronze';
        return '';
    };

    if (loading) return <div className="page-container"><div className="loading">Loading leaderboard...</div></div>;

    const top3 = rankings.slice(0, 3);
    const rest = rankings.slice(3);

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>🏆 Leaderboard</h1>
                <p className="page-subtitle">Top Performers This Month</p>
            </div>

            {/* Points System Info */}
            <div className="points-info-bar">
                <div className="points-chip">✅ Completed = +{pointsConfig.completedTask}pts</div>
                <div className="points-chip">⏰ On Time = +{pointsConfig.onTimeDelivery}pts</div>
                <div className="points-chip">🔥 High Priority = +{pointsConfig.highPriorityTask}pts</div>
                <div className="points-chip">🐛 Bug Fix = +{pointsConfig.bugFix}pts</div>
            </div>

            {/* Top 3 Podium */}
            {top3.length > 0 && (
                <div className="podium-section">
                    <div className="podium">
                        {/* 2nd Place */}
                        {top3[1] && (
                            <div className="podium-item silver">
                                <div className="podium-avatar">{top3[1].member.name[0]?.toUpperCase()}</div>
                                <div className="podium-rank">🥈</div>
                                <h3 className="podium-name">{top3[1].member.name}</h3>
                                <span className="podium-points">{top3[1].points} pts</span>
                                <div className="podium-block silver-block">2nd</div>
                            </div>
                        )}

                        {/* 1st Place */}
                        {top3[0] && (
                            <div className="podium-item gold">
                                <div className="podium-crown">👑</div>
                                <div className="podium-avatar gold-avatar">{top3[0].member.name[0]?.toUpperCase()}</div>
                                <div className="podium-rank">🥇</div>
                                <h3 className="podium-name">{top3[0].member.name}</h3>
                                <span className="podium-points">{top3[0].points} pts</span>
                                <div className="podium-block gold-block">1st</div>
                            </div>
                        )}

                        {/* 3rd Place */}
                        {top3[2] && (
                            <div className="podium-item bronze">
                                <div className="podium-avatar">{top3[2].member.name[0]?.toUpperCase()}</div>
                                <div className="podium-rank">🥉</div>
                                <h3 className="podium-name">{top3[2].member.name}</h3>
                                <span className="podium-points">{top3[2].points} pts</span>
                                <div className="podium-block bronze-block">3rd</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Benefits Section */}
            <div className="benefits-section">
                <h2>🎁 Top 3 Benefits</h2>
                <div className="benefits-grid">
                    {Object.values(benefits).map(b => (
                        <div key={b.rank} className={`benefit-card ${getRankClass(b.rank)}`}>
                            <div className="benefit-emoji">{b.emoji}</div>
                            <h3>{b.title}</h3>
                            <ul className="benefit-rewards">
                                {b.rewards.map((r, i) => (
                                    <li key={i}>✨ {r}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Full Rankings Table */}
            <div className="rankings-table-section">
                <h2>📊 Full Rankings</h2>
                <div className="table-wrapper">
                    <table className="rankings-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Name</th>
                                <th>Points</th>
                                <th>Completed</th>
                                <th>On-Time</th>
                                <th>High Priority</th>
                                <th>Bug Fixes</th>
                                <th>Badge</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rankings.map(r => (
                                <tr key={r.member._id} className={getRankClass(r.rank)}>
                                    <td className="rank-cell">
                                        <span className={`rank-badge ${getRankClass(r.rank)}`}>
                                            {getRankEmoji(r.rank)}
                                        </span>
                                    </td>
                                    <td className="name-cell">
                                        <div className="rank-avatar">{r.member.name[0]?.toUpperCase()}</div>
                                        <span>{r.member.name}</span>
                                    </td>
                                    <td className="points-cell"><strong>{r.points}</strong></td>
                                    <td>{r.breakdown.completedTasks}</td>
                                    <td>{r.breakdown.onTimeDeliveries}</td>
                                    <td>{r.breakdown.highPriorityTasks}</td>
                                    <td>{r.breakdown.bugFixes}</td>
                                    <td>{r.badge ? r.badge.emoji + ' ' + r.badge.title : '—'}</td>
                                </tr>
                            ))}
                            {rankings.length === 0 && (
                                <tr><td colSpan="8" className="empty-table">No rankings yet. Complete some tasks!</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Leaderboard;
