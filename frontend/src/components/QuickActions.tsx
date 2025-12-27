import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function QuickActions() {
  const { user } = useAuth();
  const plan = user?.plan || 'free';
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const actions = [
    { label: 'Dashboard', path: '/', icon: 'dashboard', shortcut: 'Ctrl+1' },
    { label: 'Scan Codes', path: '/scan', icon: 'scan', shortcut: 'Ctrl+2' },
    { label: 'Live Data', path: '/live', icon: 'chart', shortcut: 'Ctrl+3' },
    { label: 'AI Diagnostic', path: '/ai', icon: 'ai', shortcut: 'Ctrl+4', locked: plan === 'free' },
    { label: 'Settings', path: '/settings', icon: 'settings', shortcut: 'Ctrl+,' },
    { label: 'Help', path: '/help', icon: 'help', shortcut: 'Ctrl+?' },
  ];

  const handleAction = (path: string, locked?: boolean) => {
    if (locked) return;
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div className="relative mt-auto" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-14 bg-gradient-to-br from-primary-600 via-accent-600 to-primary-700 rounded-xl shadow-premium hover:shadow-premium-lg transition-all hover:scale-[1.02] flex items-center justify-center group relative overflow-hidden"
        aria-label="Quick Actions"
        aria-expanded={isOpen}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer"></div>
        {isOpen ? (
          <svg className="w-7 h-7 text-white relative z-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
        ) : (
          <div className="relative z-10 flex items-center justify-center w-full h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-400 via-accent-500 to-accent-600 opacity-20 blur-lg group-hover:opacity-30 transition-all duration-500"></div>
            <img 
              src="./logo.png" 
              alt="AutoIQ Logo" 
              className="h-10 w-10 object-contain transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 drop-shadow-lg mx-auto"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.logo-fallback')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'logo-fallback flex items-center justify-center w-full h-full';
                  fallback.innerHTML = `
                    <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="logoGrad" x1="0" y1="0" x2="64" y2="64">
                          <stop offset="0%" stop-color="#475569"/>
                          <stop offset="50%" stop-color="#2563eb"/>
                          <stop offset="100%" stop-color="#1e3a8a"/>
                        </linearGradient>
                      </defs>
                      <path d="M32 16L20 28H28V40H36V28H44L32 16Z" fill="url(#logoGrad)" opacity="0.9"/>
                      <circle cx="32" cy="32" r="2" fill="url(#logoGrad)"/>
                    </svg>
                  `;
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-premium-lg border border-gray-200 p-3 w-full min-w-[240px] z-50 animate-scale-in origin-bottom"
        >
          {actions.map((action) => (
            <button
              key={action.path}
              onClick={() => handleAction(action.path, action.locked)}
              disabled={action.locked}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center justify-between group ${
                action.locked
                  ? 'opacity-50 cursor-not-allowed text-gray-400'
                  : 'hover:bg-gray-100 text-gray-800 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 transition-colors ${action.locked ? 'text-gray-400' : 'text-gray-700 group-hover:text-accent-600'}`}>
                  {action.icon === 'dashboard' && <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path></svg>}
                  {action.icon === 'scan' && <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg>}
                  {action.icon === 'chart' && <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path></svg>}
                  {action.icon === 'ai' && <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path></svg>}
                  {action.icon === 'settings' && <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"></path></svg>}
                  {action.icon === 'help' && <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path></svg>}
                </div>
                <span className="font-semibold">{action.label}</span>
              </div>
              <span className="text-xs text-gray-600 font-mono">{action.shortcut}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

