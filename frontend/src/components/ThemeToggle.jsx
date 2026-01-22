import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle = ({ compact = false }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        className="theme-toggle-compact"
        title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    );
  }

  return (
    <div className="theme-toggle">
      <button
        onClick={toggleTheme}
        className={`theme-toggle-btn ${!isDark ? 'active' : ''}`}
        title="Modo Claro"
        aria-label="Modo Claro"
      >
        <Sun size={16} />
        <span className="theme-label">Claro</span>
      </button>
      <button
        onClick={toggleTheme}
        className={`theme-toggle-btn ${isDark ? 'active' : ''}`}
        title="Modo Escuro"
        aria-label="Modo Escuro"
      >
        <Moon size={16} />
        <span className="theme-label">Escuro</span>
      </button>
    </div>
  );
};

export default ThemeToggle;
