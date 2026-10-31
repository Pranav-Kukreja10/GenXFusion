/* oxlint-disable react/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({
  darkMode: false,
  toggleDarkMode: () => {},
});

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('truetax_theme') || localStorage.getItem('parchisetu_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('parchisetu_theme', 'dark');
        localStorage.setItem('truetax_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('parchisetu_theme', 'light');
        localStorage.setItem('truetax_theme', 'light');
      }
    } catch (err) {
      console.warn('Failed to persist theme:', err);
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

