import { createContext, useContext, useState, useEffect } from 'react';

export const ACCENTS = {
  blue:   { label: 'Ocean Blue',   accent: '#1a56db', accent2: '#0e3a9c', accentLight: '#e8eeff', grad: 'linear-gradient(135deg,#0e3a9c,#1a56db)' },
  teal:   { label: 'Teal Green',   accent: '#0d9488', accent2: '#0f766e', accentLight: '#e0fdf4', grad: 'linear-gradient(135deg,#0f766e,#0d9488)' },
  purple: { label: 'Royal Purple', accent: '#7c3aed', accent2: '#6d28d9', accentLight: '#f5f3ff', grad: 'linear-gradient(135deg,#6d28d9,#7c3aed)' },
  amber:  { label: 'Warm Amber',   accent: '#d97706', accent2: '#b45309', accentLight: '#fef3c7', grad: 'linear-gradient(135deg,#b45309,#d97706)' },
  rose:   { label: 'Rose Red',     accent: '#e11d48', accent2: '#be123c', accentLight: '#fff1f2', grad: 'linear-gradient(135deg,#be123c,#e11d48)' },
};

const DARK_VARS = {
  '--bg':        '#0d0f1a',
  '--surface':   '#161927',
  '--surface2':  '#1e2235',
  '--border':    '#2a2f4a',
  '--text':      '#e8ebff',
  '--text2':     '#8890b5',
  '--text3':     '#555c80',
  '--sidebar-bg':'#0a0c14',
  '--shadow':    '0 1px 4px rgba(0,0,0,.35), 0 4px 16px rgba(0,0,0,.25)',
  '--shadow-lg': '0 8px 32px rgba(0,0,0,.45)',
};

const LIGHT_VARS = {
  '--bg':        '#f4f6fb',
  '--surface':   '#ffffff',
  '--surface2':  '#f0f2f8',
  '--border':    '#e2e6f0',
  '--text':      '#1a1d2e',
  '--text2':     '#5a6080',
  '--text3':     '#9298b5',
  '--sidebar-bg':'#1a1d2e',
  '--shadow':    '0 1px 4px rgba(26,29,46,0.08), 0 4px 16px rgba(26,29,46,0.04)',
  '--shadow-lg': '0 8px 32px rgba(26,29,46,0.12)',
};

function applyTheme(mode, accentKey) {
  const root = document.documentElement;
  const vars = mode === 'dark' ? DARK_VARS : LIGHT_VARS;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));

  const a = ACCENTS[accentKey] || ACCENTS.blue;
  root.style.setProperty('--accent',       a.accent);
  root.style.setProperty('--accent2',      a.accent2);
  root.style.setProperty('--accent-light', a.accentLight);
  root.setAttribute('data-theme', mode);
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode,   setModeState]   = useState(() => localStorage.getItem('ep-mode')   || 'light');
  const [accent, setAccentState] = useState(() => localStorage.getItem('ep-accent') || 'blue');

  // Apply on mount + whenever values change
  useEffect(() => { applyTheme(mode, accent); }, [mode, accent]);

  const setMode = (m) => {
    setModeState(m);
    localStorage.setItem('ep-mode', m);
  };

  const setAccent = (a) => {
    setAccentState(a);
    localStorage.setItem('ep-accent', a);
  };

  const toggleMode = () => setMode(mode === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ mode, accent, setMode, setAccent, toggleMode, ACCENTS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
