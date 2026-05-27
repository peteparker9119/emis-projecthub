import GroomingHub from './GroomingHub';
import { useAuth } from '../context/AuthContext';

export default function BacklogPage() {
  const { user } = useAuth();
  const isCTO = user?.perfiq === 'CTO';

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <GroomingHub readOnly={isCTO} />
      </div>
    </div>
  );
}
