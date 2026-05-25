import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getChatRooms, getOrCreateDirectRoom, createGroupRoom,
  getChatMessages, sendChatMessage, deleteChatMessage,
  markChatRoomRead, getChatUnreadCount, getUsers,
} from '../api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)  return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const fmtSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
};

const fileIcon = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return '🖼';
  if (['pdf'].includes(ext)) return '📄';
  if (['doc','docx'].includes(ext)) return '📝';
  if (['xls','xlsx'].includes(ext)) return '📊';
  if (['zip','rar','7z'].includes(ext)) return '🗜';
  if (['mp4','mov','avi'].includes(ext)) return '🎬';
  return '📎';
};

// ── Avatar ────────────────────────────────────────────────────────────────────
function Av({ initials = '?', size = 32, color = 'linear-gradient(135deg,#1a56db,#0d9488)' }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * .35, fontWeight: 700, color: 'white', flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ── Room Name helper ──────────────────────────────────────────────────────────
function roomLabel(room, myId) {
  if (room.room_type === 'group') return room.name || 'Group';
  const other = room.members_info?.find(m => m.id !== myId);
  return other?.name || 'Chat';
}

function roomInitials(room, myId) {
  if (room.room_type === 'group') return (room.name || 'G')[0].toUpperCase();
  const other = room.members_info?.find(m => m.id !== myId);
  return other?.initials || '?';
}

// ── New Chat Modal ────────────────────────────────────────────────────────────
function NewChatModal({ users, myId, onClose, onOpen }) {
  const [tab, setTab]         = useState('dm');
  const [search, setSearch]   = useState('');
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected]   = useState(new Set());
  const [busy, setBusy]       = useState(false);

  const filtered = users.filter(u => u.id !== myId && u.name.toLowerCase().includes(search.toLowerCase()));
  const toggle   = (id) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleDM = async (userId) => {
    setBusy(true);
    try { const r = await getOrCreateDirectRoom(userId); onOpen(r.data); onClose(); }
    catch {} finally { setBusy(false); }
  };

  const handleGroup = async () => {
    if (!groupName.trim() || selected.size === 0) return;
    setBusy(true);
    try {
      const r = await createGroupRoom({ name: groupName.trim(), member_ids: [...selected] });
      onOpen(r.data); onClose();
    } catch {} finally { setBusy(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 18, width: 420, maxWidth: '94vw', boxShadow: '0 24px 80px rgba(0,0,0,.2)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>💬 New Conversation</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
          {['dm', 'group'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px', border: 'none', background: tab === t ? '#eff6ff' : 'white', color: tab === t ? '#1a56db' : 'var(--text2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', borderBottom: tab === t ? '2px solid #1a56db' : '2px solid transparent', fontFamily: 'inherit' }}>
              {t === 'dm' ? '👤 Direct Message' : '👥 Group Chat'}
            </button>
          ))}
        </div>
        {/* Body */}
        <div style={{ padding: '16px 20px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…"
            style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box', outline: 'none' }} autoFocus />

          {tab === 'group' && (
            <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name *"
              style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box', outline: 'none' }} />
          )}

          <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filtered.map(u => (
              <div key={u.id}
                onClick={() => tab === 'dm' ? handleDM(u.id) : toggle(u.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, cursor: busy ? 'wait' : 'pointer', background: tab === 'group' && selected.has(u.id) ? '#eff6ff' : 'transparent', border: tab === 'group' && selected.has(u.id) ? '1.5px solid #93c5fd' : '1.5px solid transparent', transition: 'all .12s' }}
                onMouseEnter={e => { if (!selected.has(u.id)) e.currentTarget.style.background = 'var(--surface2)'; }}
                onMouseLeave={e => { if (!selected.has(u.id)) e.currentTarget.style.background = 'transparent'; }}>
                <Av initials={u.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>{u.role || u.team}</div>
                </div>
                {tab === 'group' && selected.has(u.id) && <span style={{ color: '#1a56db', fontSize: 16 }}>✓</span>}
              </div>
            ))}
          </div>

          {tab === 'group' && selected.size > 0 && (
            <button onClick={handleGroup} disabled={busy || !groupName.trim()}
              style={{ width: '100%', marginTop: 14, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#1a56db,#0d9488)', color: 'white', fontWeight: 700, fontSize: 13, cursor: busy || !groupName.trim() ? 'not-allowed' : 'pointer', opacity: !groupName.trim() ? .5 : 1, fontFamily: 'inherit' }}>
              {busy ? 'Creating…' : `Create Group with ${selected.size + 1} members`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ChatWidget ───────────────────────────────────────────────────────────
export default function ChatWidget() {
  const { user } = useAuth();

  // ── Widget state ─────────────────────────────────────────────────────────
  const [open,       setOpen]       = useState(false);
  const [minimized,  setMinimized]  = useState(false);
  const [pos,        setPos]        = useState(null); // {x, y} — null = use default CSS
  const [rooms,      setRooms]      = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages,   setMessages]   = useState([]);
  const [unread,     setUnread]     = useState(0);
  const [users,      setUsers]      = useState([]);
  const [newChat,    setNewChat]    = useState(false);
  const [text,       setText]       = useState('');
  const [sending,    setSending]    = useState(false);
  const [roomSearch, setRoomSearch] = useState('');

  // ── Drag state ────────────────────────────────────────────────────────────
  const dragRef  = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const panelRef = useRef(null);
  const threadRef= useRef(null);
  const fileRef  = useRef(null);
  const lastMsgTs= useRef(null);
  const pollRef  = useRef(null);

  // ── Initial unread count + users ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    getUsers().then(r => setUsers(r.data)).catch(() => {});
    const tick = () => getChatUnreadCount().then(r => setUnread(r.data.total_unread)).catch(() => {});
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [user]);

  // ── Load rooms when widget opens ─────────────────────────────────────────
  const loadRooms = useCallback(async () => {
    try { const r = await getChatRooms(); setRooms(r.data); } catch {}
  }, []);

  useEffect(() => { if (open) loadRooms(); }, [open, loadRooms]);

  // ── Load messages + poll when a room is active ────────────────────────────
  const loadMessages = useCallback(async (roomId, since) => {
    try {
      const r = await getChatMessages(roomId, since);
      if (r.data.length) {
        setMessages(prev => {
          const ids = new Set(prev.map(m => m.id));
          const fresh = r.data.filter(m => !ids.has(m.id));
          return since ? [...prev, ...fresh] : r.data;
        });
        lastMsgTs.current = r.data[r.data.length - 1].created_at;
      }
    } catch {}
  }, []);

  useEffect(() => {
    clearInterval(pollRef.current);
    if (!activeRoom) return;
    lastMsgTs.current = null;
    loadMessages(activeRoom.id, null);
    markChatRoomRead(activeRoom.id).catch(() => {});
    pollRef.current = setInterval(() => {
      loadMessages(activeRoom.id, lastMsgTs.current);
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [activeRoom, loadMessages]);

  // ── Auto-scroll thread to bottom ─────────────────────────────────────────
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages]);

  // ── Dragging (mouse) ──────────────────────────────────────────────────────
  const onDragStart = (e) => {
    if (e.button !== 0) return;
    const rect = panelRef.current?.getBoundingClientRect();
    dragRef.current = {
      active: true,
      startX: e.clientX, startY: e.clientY,
      origX: rect?.left ?? 0, origY: rect?.top ?? 0,
    };
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup',   onDragEnd);
    e.preventDefault();
  };

  const onDragMove = (e) => {
    if (!dragRef.current.active) return;
    const { startX, startY, origX, origY } = dragRef.current;
    const newX = Math.max(0, Math.min(window.innerWidth  - 380, origX + e.clientX - startX));
    const newY = Math.max(0, Math.min(window.innerHeight - 60,  origY + e.clientY - startY));
    setPos({ x: newX, y: newY });
  };

  const onDragEnd = () => {
    dragRef.current.active = false;
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup',   onDragEnd);
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async (file) => {
    if (!activeRoom || (!text.trim() && !file)) return;
    setSending(true);
    try {
      const fd = new FormData();
      if (text.trim()) fd.append('text', text.trim());
      if (file) fd.append('attachment', file);
      const r = await sendChatMessage(activeRoom.id, fd);
      setMessages(prev => [...prev, r.data]);
      lastMsgTs.current = r.data.created_at;
      setText('');
      loadRooms();
    } catch {} finally { setSending(false); }
  };

  const handleDelete = async (msgId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await deleteChatMessage(msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch {}
  };

  // ── Open a room ───────────────────────────────────────────────────────────
  const openRoom = (room) => {
    setActiveRoom(room);
    setMessages([]);
    setRooms(prev => prev.map(r => r.id === room.id ? { ...r, unread_count: 0 } : r));
    setUnread(u => Math.max(0, u - (room.unread_count || 0)));
  };

  if (!user) return null;

  // ── Default position (bottom-right above toast stack) ────────────────────
  const defaultX = window.innerWidth  - 400;
  const defaultY = window.innerHeight - 640;
  const px = pos?.x ?? defaultX;
  const py = pos?.y ?? defaultY;

  const bubbleStyle = {
    position: 'fixed', bottom: 24, right: 24, zIndex: 9990,
    width: 52, height: 52, borderRadius: '50%',
    background: 'linear-gradient(135deg,#1a56db,#0d9488)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', boxShadow: '0 4px 20px rgba(26,86,219,.45)',
    fontSize: 22, transition: 'transform .15s, box-shadow .15s',
    userSelect: 'none',
  };

  const panelStyle = {
    position: 'fixed', left: px, top: py, zIndex: 9990,
    width: 380, borderRadius: 18,
    background: 'white', boxShadow: '0 16px 60px rgba(0,0,0,.2)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    border: '1.5px solid var(--border)',
    userSelect: 'none',
  };

  const filteredRooms = rooms.filter(r =>
    roomLabel(r, user.id).toLowerCase().includes(roomSearch.toLowerCase())
  );

  // ── Minimized bubble ──────────────────────────────────────────────────────
  if (!open || minimized) {
    return (
      <>
        <div
          ref={panelRef}
          style={open && minimized ? {
            ...panelStyle, height: 48, top: py, left: px,
          } : bubbleStyle}
          onMouseDown={open && minimized ? onDragStart : undefined}
          onClick={open && minimized ? () => setMinimized(false) : () => setOpen(true)}
          onMouseEnter={e => { if (!open || minimized) { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(26,86,219,.55)'; }}}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = open && minimized ? '' : '0 4px 20px rgba(26,86,219,.45)'; }}
        >
          {open && minimized ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', height: '100%', cursor: 'pointer' }}>
              <span style={{ fontSize: 16 }}>💬</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Messages</span>
              {unread > 0 && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, background: '#dc2626', color: 'white', padding: '2px 7px', borderRadius: 10 }}>{unread}</span>}
              <button onClick={e => { e.stopPropagation(); setOpen(false); setMinimized(false); }} style={{ marginLeft: 4, background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
            </div>
          ) : (
            <>
              <span>💬</span>
              {unread > 0 && (
                <span style={{ position: 'absolute', top: 0, right: 0, fontSize: 10, fontWeight: 800, background: '#dc2626', color: 'white', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </>
          )}
        </div>
        {newChat && <NewChatModal users={users} myId={user.id} onClose={() => setNewChat(false)} onOpen={(room) => { openRoom(room); loadRooms(); }} />}
      </>
    );
  }

  // ── Full panel ────────────────────────────────────────────────────────────
  return (
    <>
      <div ref={panelRef} style={panelStyle}>

        {/* ── Panel header (drag handle) ── */}
        <div
          onMouseDown={onDragStart}
          style={{ background: 'linear-gradient(135deg,#1a56db,#0d9488)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'grab', flexShrink: 0 }}>
          <span style={{ fontSize: 18 }}>💬</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'white', flex: 1 }}>
            {activeRoom ? roomLabel(activeRoom, user.id) : 'Messages'}
          </span>
          {activeRoom && (
            <button onClick={() => { setActiveRoom(null); setMessages([]); }}
              style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 7, padding: '3px 9px', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              ← Back
            </button>
          )}
          <button onClick={() => setNewChat(true)}
            style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 7, padding: '3px 9px', color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
            ✏️
          </button>
          <button onClick={() => setMinimized(true)}
            style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 7, padding: '3px 9px', color: 'white', fontSize: 14, cursor: 'pointer', lineHeight: 1 }}>
            —
          </button>
          <button onClick={() => { setOpen(false); setActiveRoom(null); setMinimized(false); }}
            style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 7, padding: '3px 9px', color: 'white', fontSize: 14, cursor: 'pointer', lineHeight: 1 }}>
            ×
          </button>
        </div>

        {/* ── Room list ── */}
        {!activeRoom && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 520 }}>
            {/* Search */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <input value={roomSearch} onChange={e => setRoomSearch(e.target.value)} placeholder="Search conversations…"
                style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            {/* Rooms */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredRooms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>No conversations yet</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Click ✏️ to start a new chat</div>
                </div>
              ) : filteredRooms.map(room => {
                const label    = roomLabel(room, user.id);
                const initials = roomInitials(room, user.id);
                const last     = room.last_message;
                return (
                  <div key={room.id} onClick={() => openRoom(room)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background .12s', background: 'white' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <Av initials={initials} size={38} color={room.room_type === 'group' ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'linear-gradient(135deg,#1a56db,#0d9488)'} />
                      {room.room_type === 'group' && (
                        <span style={{ position: 'absolute', bottom: -1, right: -1, fontSize: 10, background: 'white', borderRadius: '50%', border: '1px solid #e2e8f0', padding: '0 1px' }}>👥</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                        <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0, marginLeft: 6 }}>{last ? fmtTime(last.created_at) : ''}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {last ? `${room.room_type === 'group' ? last.sender_name + ': ' : ''}${last.text}` : 'No messages yet'}
                      </div>
                    </div>
                    {(room.unread_count ?? 0) > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 800, background: '#1a56db', color: 'white', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {room.unread_count > 9 ? '9+' : room.unread_count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Message thread ── */}
        {activeRoom && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 520 }}>
            {/* Messages */}
            <div ref={threadRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)', fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>👋</div>
                  Send the first message!
                </div>
              ) : messages.map((m, i) => {
                const isMine    = m.sender_id === user.id;
                const showName  = !isMine && (activeRoom.room_type === 'group' || i === 0 || messages[i-1]?.sender_id !== m.sender_id);
                const showTime  = i === messages.length - 1 || messages[i+1]?.sender_id !== m.sender_id;

                return (
                  <div key={m.id} style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end', marginBottom: showTime ? 8 : 2 }}>
                    {!isMine && (
                      <Av initials={m.sender_initials} size={26} color="linear-gradient(135deg,#6d28d9,#a855f7)" />
                    )}
                    <div style={{ maxWidth: '72%' }}>
                      {showName && <div style={{ fontSize: 10, fontWeight: 700, color: '#6d28d9', marginBottom: 2, paddingLeft: 4 }}>{m.sender_name}</div>}
                      <div
                        style={{ background: isMine ? 'linear-gradient(135deg,#1a56db,#0d9488)' : 'var(--surface2)', color: isMine ? 'white' : 'var(--text)', borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '8px 12px', fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word', position: 'relative' }}
                        onMouseEnter={e => { if (isMine) e.currentTarget.querySelector('.del-btn')?.style && (e.currentTarget.querySelector('.del-btn').style.opacity = 1); }}
                        onMouseLeave={e => { if (isMine) e.currentTarget.querySelector('.del-btn')?.style && (e.currentTarget.querySelector('.del-btn').style.opacity = 0); }}
                      >
                        {m.text && <div>{m.text}</div>}
                        {m.attachment_url && (
                          <a href={m.attachment_url} target="_blank" rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: m.text ? 6 : 0, padding: '6px 10px', borderRadius: 8, background: isMine ? 'rgba(255,255,255,.15)' : '#e2e8f0', color: isMine ? 'white' : '#1a56db', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                            <span style={{ fontSize: 16 }}>{fileIcon(m.attachment_name)}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{m.attachment_name}</span>
                            {m.attachment_size > 0 && <span style={{ fontSize: 10, opacity: .7 }}>{fmtSize(m.attachment_size)}</span>}
                          </a>
                        )}
                        {isMine && (
                          <button className="del-btn" onClick={() => handleDelete(m.id)}
                            style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#dc2626', border: 'none', color: 'white', fontSize: 9, cursor: 'pointer', opacity: 0, transition: 'opacity .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                            ×
                          </button>
                        )}
                      </div>
                      {showTime && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, textAlign: isMine ? 'right' : 'left', paddingLeft: 4, paddingRight: 4 }}>{fmtTime(m.created_at)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input bar */}
            <div style={{ borderTop: '1px solid var(--border)', padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0, background: 'white' }}>
              <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleSend(e.target.files[0]); e.target.value = ''; }} />
              <button onClick={() => fileRef.current?.click()}
                style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                title="Attach file">
                📎
              </button>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a message… (Enter to send)"
                rows={1}
                style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', maxHeight: 80, overflowY: 'auto', lineHeight: 1.5 }}
              />
              <button onClick={() => handleSend()} disabled={!text.trim() || sending}
                style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: text.trim() ? 'linear-gradient(135deg,#1a56db,#0d9488)' : 'var(--surface2)', color: text.trim() ? 'white' : 'var(--text3)', fontSize: 16, cursor: text.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {sending ? '⏳' : '➤'}
              </button>
            </div>
          </div>
        )}
      </div>

      {newChat && (
        <NewChatModal users={users} myId={user.id} onClose={() => setNewChat(false)}
          onOpen={(room) => { openRoom(room); loadRooms(); setNewChat(false); }} />
      )}
    </>
  );
}
