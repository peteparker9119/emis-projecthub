import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, getMe } from '../api';

const AuthContext = createContext(null);

// One representative user per role (credentials from employee master)
const ROLE_CREDENTIALS = {
  CTO:      { email: 'varun.m@tnschools.gov.in',         password: 'cto123'  },
  MANAGER:  { email: 'manojkumar.r@tnschools.gov.in',    password: 'pass123' },
  TL:       { email: 'jonespraveen.j@tnschools.gov.in',  password: 'pass123' }, // J. Jones Praveen — PM Team Lead
  SM:       { email: 'peter.s@tnschools.gov.in',          password: 'pass123' }, // Gunaseelan Peter S — Scrum Master
  PM:       { email: 'abishek.j@tnschools.gov.in',       password: 'pass123' }, // Abishek J — Product Manager
  EMPLOYEE: { email: 'abinaya.j@tnschools.gov.in',       password: 'pass123' },
};

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

  // Login as a role type (CTO / MANAGER / EMPLOYEE)
  const loginAs = async (role) => {
    const cred = ROLE_CREDENTIALS[role];
    if (!cred) return;
    const res = await apiLogin(cred.email, cred.password);
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
