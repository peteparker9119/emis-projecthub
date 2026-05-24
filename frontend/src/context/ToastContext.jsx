import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

const TYPE_STYLES = {
  success: { bg: '#065f46', border: '#6ee7b7', icon: '✅' },
  error:   { bg: '#dc2626', border: '#fecaca', icon: '❌' },
  warning: { bg: '#b45309', border: '#fde68a', icon: '⚠️' },
  info:    { bg: '#1a56db', border: '#93c5fd', icon: '📢' },
};

let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = ++nextId;
    setToasts(prev => [...prev.slice(-4), { id, message, type }]); // keep max 5
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Stack — fixed bottom-right */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', pointerEvents: 'none' }}>
        {toasts.map(t => {
          const s = TYPE_STYLES[t.type] || TYPE_STYLES.info;
          return (
            <div
              key={t.id}
              onClick={() => dismiss(t.id)}
              style={{
                pointerEvents: 'auto',
                background: s.bg,
                border: `1.5px solid ${s.border}`,
                borderRadius: 12,
                padding: '12px 18px',
                minWidth: 260,
                maxWidth: 380,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 8px 32px rgba(0,0,0,.22)',
                cursor: 'pointer',
                animation: 'toastIn .25s ease',
                color: 'white',
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{t.message}</span>
              <span style={{ fontSize: 16, opacity: .7, flexShrink: 0, lineHeight: 1 }}>×</span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toastIn {
          from { transform: translateX(40px); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx.showToast;
}
