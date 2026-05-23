import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyTeam, getTeamStandups, getRequirements } from '../api';

// ── Helpers ───────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().slice(0, 10); }

function Avatar({ initials, size = 38, bg = 'linear-gradient(135deg,#1a56db,#0d9488)' }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color: 'white', flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function StatCard({ icon, label, value, color = '#1a56db' }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, margin: '4px 0 2px' }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
    </div>
  );
}

const PRIORITY_COLORS = {
  Critical: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  High:     { bg: '#fff7ed', color: '#ea580c', border: '#fdba74' },
  Medium:   { bg: '#fefce8', color: '#d97706', border: '#fde68a' },
  Low:      { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TeamDashboard() {
  const { user } = useAuth();
  const [team, setTeam]           = useState(null);
  const [date, setDate]           = useState(today());
  const [standupData, setStandupData] = useState(null);
  const [reqs, setReqs]           = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // Load team once
  useEffect(() => {
    getMyTeam()
      .then(r => setTeam(r.data))
      .catch(() => setError('No team found for your account. Are you a Team Lead?'))
      .finally(() => setLoading(false));
  }, []);

  // Load standups when team or date changes
  useEffect(() => {
    if (!team) return;
    getTeamStandups(team.id, date)
      .then(r => { setStandupData(r.data); setSelectedMember(null); })
      .catch(() => setStandupData(null));
  }, [team, date]);

  // Load all requirements once
  useEffect(() => {
    getRequirements().then(r => setReqs(r.data)).catch(() => {});
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: '#1a56db', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontSize: 13, color: 'var(--text2)' }}>Loading your team…</div>
    </div>
  );

  if (error) return (
    <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--text3)' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{error}</div>
    </div>
  );

  const members = standupData?.members || [];
  const submitted = members.filter(m => m.submitted);
  const missing = members.filter(m => !m.submitted);
  const hasBlockers = members.filter(m => m.submitted && m.blockers && m.blockers.trim());

  // Team requirements: filter by assignee membership
  const memberIds = new Set((team?.members_detail || []).map(m => m.id));
  const teamReqs = reqs.filter(r => r.assignee && memberIds.has(r.assignee));

  return (
    <div style={{ padding: '28px 32px', background: 'var(--surface)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
          👥 {team?.name || 'My Team'}
        </h2>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
          {team?.department} Team · {team?.member_count} members · TL: {user?.name}
        </div>
      </div>

      {/* Date picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Standup Date:</label>
        <input
          type="date"
          value={date}
          max={today()}
          onChange={e => setDate(e.target.value)}
          style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
        />
        <button
          onClick={() => setDate(today())}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Today
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 26 }}>
        <StatCard icon="👥" label="Members"      value={members.length}      color="#1a56db" />
        <StatCard icon="✅" label="Submitted"    value={submitted.length}    color="#065f46" />
        <StatCard icon="🔴" label="Missing"      value={missing.length}      color="#dc2626" />
        <StatCard icon="🚧" label="Has Blockers" value={hasBlockers.length}  color="#b45309" />
      </div>

      {/* Member grid + side panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedMember ? '1fr 360px' : '1fr', gap: 20, alignItems: 'start', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            Standups for {date}
          </div>
          {members.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 14, padding: '48px 32px', textAlign: 'center', border: '1px solid var(--border)', color: 'var(--text3)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No members found</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {members.map(m => (
                <div
                  key={m.user_id}
                  onClick={() => setSelectedMember(selectedMember?.user_id === m.user_id ? null : m)}
                  style={{
                    background: selectedMember?.user_id === m.user_id ? (m.submitted ? '#d1fae5' : '#fef2f2') : 'white',
                    border: `1.5px solid ${m.submitted ? '#a7f3d0' : '#fecaca'}`,
                    borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all .15s',
                  }}
                  onMouseEnter={e => { if (selectedMember?.user_id !== m.user_id) e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Avatar
                      initials={m.initials}
                      size={36}
                      bg={m.submitted ? 'linear-gradient(135deg,#065f46,#059669)' : 'linear-gradient(135deg,#dc2626,#ef4444)'}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text2)' }}>{m.role}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                      background: m.submitted ? '#d1fae5' : '#fef2f2',
                      color: m.submitted ? '#065f46' : '#dc2626',
                    }}>
                      {m.submitted ? '✅ Submitted' : '🔴 Missing'}
                    </span>
                    {m.submitted && m.blockers && m.blockers.trim() && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#fef3c7', color: '#b45309' }}>🚧 Blocker</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Side panel */}
        {selectedMember && (
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar
                initials={selectedMember.initials}
                size={42}
                bg={selectedMember.submitted ? 'linear-gradient(135deg,#065f46,#059669)' : 'linear-gradient(135deg,#dc2626,#ef4444)'}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedMember.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{selectedMember.role}</div>
              </div>
              <button onClick={() => setSelectedMember(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>✕</button>
            </div>
            {selectedMember.submitted ? (
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: '📅 Yesterday', key: 'yesterday', color: '#1d4ed8', bg: '#eff6ff' },
                  { label: '⚡ Today',     key: 'today',     color: '#15803d', bg: '#f0fdf4' },
                  { label: '🚧 Blockers',  key: 'blockers',  color: '#dc2626', bg: '#fef2f2' },
                ].map(({ label, key, color, bg }) => (
                  <div key={key}>
                    <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.6, background: bg, borderRadius: 10, padding: '10px 14px', whiteSpace: 'pre-wrap', minHeight: 36, color: 'var(--text)' }}>
                      {selectedMember[key] || <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Not provided</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text3)' }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>📝</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>No standup submitted</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>No standup submitted for {date}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Team Requirements */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          📋 Team Requirements
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', background: 'var(--surface2)', padding: '2px 10px', borderRadius: 10 }}>{teamReqs.length} items</span>
        </div>
        {teamReqs.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 14, padding: '36px 32px', textAlign: 'center', border: '1px solid var(--border)', color: 'var(--text3)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>No requirements assigned to your team</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {teamReqs.slice(0, 30).map(r => {
              const pc = PRIORITY_COLORS[r.priority] || PRIORITY_COLORS.Medium;
              return (
                <div key={r.id} style={{ background: 'white', borderRadius: 12, padding: '12px 18px', border: '1px solid var(--border)', borderLeft: `4px solid ${pc.color}`, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text3)', flexShrink: 0 }}>{r.id}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{r.title}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 11, color: 'var(--text2)' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: pc.bg, color: pc.color, border: `1px solid ${pc.border}` }}>{r.priority}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: 'var(--surface2)', color: 'var(--text2)' }}>{r.status}</span>
                      {r.assignee_name && <span>👤 {r.assignee_name}</span>}
                      {r.sprint_name && <span>🏃 {r.sprint_name}</span>}
                      {r.story_points && <span>⚡ {r.story_points} SP</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
