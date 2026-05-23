export default function PageLoader({ message = 'Loading…' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '62vh', gap: 20,
    }}>
      {/* Triple-ring spinner */}
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <div style={{
          position: 'absolute', inset: 0,
          border: '3px solid transparent', borderTopColor: '#1a56db',
          borderRadius: '50%', animation: 'pl-spin 1s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 8,
          border: '3px solid transparent', borderTopColor: '#0d9488',
          borderRadius: '50%', animation: 'pl-spin .75s linear infinite reverse',
        }} />
        <div style={{
          position: 'absolute', inset: 16,
          border: '3px solid transparent', borderTopColor: '#7c3aed',
          borderRadius: '50%', animation: 'pl-spin .5s linear infinite',
        }} />
        {/* Centre dot */}
        <div style={{
          position: 'absolute', inset: '50%', transform: 'translate(-50%,-50%)',
          width: 8, height: 8, borderRadius: '50%',
          background: 'linear-gradient(135deg,#1a56db,#0d9488)',
          animation: 'pl-pulse 1s ease-in-out infinite',
        }} />
      </div>

      {/* EP logo + message */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: 'linear-gradient(135deg,#1a56db,#0d9488)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 13, color: 'white',
          animation: 'pl-pulse 1.5s ease-in-out infinite',
        }}>EP</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>{message}</div>
      </div>

      <style>{`
        @keyframes pl-spin  { to { transform: rotate(360deg); } }
        @keyframes pl-pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
      `}</style>
    </div>
  );
}
