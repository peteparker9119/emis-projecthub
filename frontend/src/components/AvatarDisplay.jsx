import { useAvatar } from '../context/AvatarContext';

export default function AvatarDisplay({ initials, size = 36, fontSize, style: extraStyle = {} }) {
  const { avatar } = useAvatar();
  const fs = fontSize || Math.round(size * 0.35);

  const base = {
    width: size, height: size, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, overflow: 'hidden', fontWeight: 700, color: 'white',
    background: 'var(--accent)', ...extraStyle,
  };

  if (avatar?.type === 'image' && avatar.value) {
    return (
      <div style={{ ...base, background: 'transparent' }}>
        <img src={avatar.value} alt="av" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
      </div>
    );
  }
  if (avatar?.type === 'emoji') {
    return <div style={{ ...base, fontSize: Math.round(size * 0.55), background: 'var(--surface2)' }}>{avatar.value}</div>;
  }
  return <div style={{ ...base, fontSize: fs }}>{initials}</div>;
}
