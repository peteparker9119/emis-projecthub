import { createContext, useContext, useState, useEffect } from 'react';
import { roleLogin, getMe } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore session from saved token
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      getMe()
        .then(res => { setUser(res.data); setLoading(false); })
        .catch(() => { localStorage.clear(); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []);

  // Password-free login by role key (optionally filter by name for multiple users of same role)
  const loginAs = async (role, name) => {
    const res = await roleLogin(role, name);
    localStorage.setItem('access_token', res.data.access);
    localStorage.setItem('refresh_token', res.data.refresh);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginAs, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
