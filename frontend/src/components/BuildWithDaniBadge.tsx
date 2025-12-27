import { useState } from 'react';

interface BuildWithDaniBadgeProps {
  variant?: 'default' | 'compact' | 'ribbon' | 'sidebar';
  showLogo?: boolean;
}

// Helper function to open external links (works in Electron and browser)
const openExternalLink = (url: string) => {
  // Check if we're in Electron
  if (window.electron && window.electron.openExternal) {
    try {
      // Use Electron's shell.openExternal to open in default browser
      window.electron.openExternal(url);
      console.log('Opening external link via Electron:', url);
    } catch (error) {
      console.error('Error opening external link:', error);
      // Fallback to window.open
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } else {
    // Fallback for browser or if Electron API not available
    console.log('Opening external link via window.open:', url);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

// Extend Window interface for Electron API
declare global {
  interface Window {
    electron?: {
      openExternal?: (url: string) => Promise<void>;
      openCheckout?: (checkoutUrl: string, successUrl: string, cancelUrl: string) => Promise<{ success: boolean; cancelled?: boolean; closed?: boolean; url?: string }>;
    };
  }
}

export default function BuildWithDaniBadge({ 
  variant = 'default',
  showLogo = true 
}: BuildWithDaniBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('BuildWithDani badge clicked');
    openExternalLink('https://buildwithdani.com');
  };

  // Ribbon variant - premium ribbon badge with gray and blue
  if (variant === 'ribbon') {
    return (
      <div
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative inline-flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-primary-700 via-primary-800 to-primary-700 rounded-lg shadow-premium hover:shadow-premium-lg transition-all cursor-pointer group overflow-hidden border border-primary-600/50 hover:border-accent-500/50"
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600/30 via-accent-600/20 to-primary-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer"></div>
        
        {/* Blue accent glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-accent-500/0 via-accent-500/15 to-accent-500/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
        
        {/* Logo with premium styling */}
        {showLogo && (
          <div className="relative flex-shrink-0 z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-400/20 to-accent-600/20 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <img 
              src="./bwd-logo.png" 
              alt="BuildWithDani Logo" 
              className="h-5 w-5 object-contain transition-all duration-300 group-hover:scale-125 group-hover:rotate-6 relative z-10 drop-shadow-lg"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.bwd-logo-fallback')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'bwd-logo-fallback w-5 h-5 bg-white/30 rounded flex items-center justify-center backdrop-blur-sm';
                  fallback.innerHTML = `<span class="text-white text-[9px] font-black">BWD</span>`;
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
        )}
        
        {/* Text with premium typography */}
        <div className="relative z-10 flex items-center gap-2">
          <span className="text-[10px] font-bold text-primary-200 uppercase tracking-widest">
            Built by
          </span>
          <span className="text-xs font-black text-white drop-shadow-lg">
            BuildWithDani
          </span>
          <span className="text-[9px] font-bold text-accent-300">
            (BWD)
          </span>
        </div>
        
        {/* Premium arrow icon */}
        <svg 
          className={`w-3.5 h-3.5 text-primary-300 group-hover:text-accent-300 transition-all flex-shrink-0 z-10 drop-shadow-lg ${isHovered ? 'translate-x-1 scale-110' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    );
  }

  // Sidebar variant - professional compact badge for sidebar (gray and blue)
  if (variant === 'sidebar') {
    return (
      <div
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative w-full flex items-center gap-2.5 px-3 py-2.5 bg-gradient-to-r from-primary-700 via-primary-800 to-primary-700 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer group overflow-hidden border border-primary-600/30 hover:border-accent-500/50"
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer"></div>
        
        {/* Blue accent glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-accent-500/0 via-accent-500/10 to-accent-500/0 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-500"></div>
        
        {/* Logo */}
        {showLogo && (
          <div className="relative flex-shrink-0 z-10">
            <div className="absolute inset-0 bg-accent-500/20 rounded blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <img 
              src="./bwd-logo.png" 
              alt="BuildWithDani Logo" 
              className="h-6 w-6 object-contain transition-transform group-hover:scale-110 relative z-10"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.bwd-logo-fallback')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'bwd-logo-fallback w-6 h-6 bg-white/20 rounded flex items-center justify-center';
                  fallback.innerHTML = `<span class="text-white text-[10px] font-black">BWD</span>`;
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
        )}
        
        {/* Text */}
        <div className="relative z-10 flex-1 min-w-0">
          <div className="text-[10px] font-semibold text-primary-200 uppercase tracking-wide leading-tight">
            Built by
          </div>
          <div className="text-xs font-black text-white leading-tight truncate">
            BuildWithDani
          </div>
          <div className="text-[9px] font-bold text-accent-300 leading-tight">
            (BWD)
          </div>
        </div>
        
        {/* Arrow icon */}
        <svg 
          className={`w-3.5 h-3.5 text-primary-300 group-hover:text-accent-300 transition-all flex-shrink-0 z-10 ${isHovered ? 'translate-x-0.5' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative inline-flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-primary-700 via-primary-800 to-primary-700 rounded-lg border border-primary-600/50 hover:border-accent-500/50 shadow-md hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer"></div>
        
        {/* Blue accent glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-accent-500/0 via-accent-500/10 to-accent-500/0 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-500"></div>
        
        {showLogo && (
          <div className="relative flex-shrink-0 z-10">
            <div className="absolute inset-0 bg-accent-500/20 rounded blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <img 
              src="./bwd-logo.png" 
              alt="BuildWithDani Logo" 
              className="h-5 w-5 object-contain transition-transform group-hover:scale-125 group-hover:rotate-6 relative z-10"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.bwd-logo-fallback')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'bwd-logo-fallback w-5 h-5 bg-white/30 rounded flex items-center justify-center backdrop-blur-sm';
                  fallback.innerHTML = `<span class="text-white text-[9px] font-black">BWD</span>`;
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
        )}
        <span className="text-xs font-bold text-white group-hover:text-accent-200 transition-colors relative z-10">
          Built by <span className="font-black">BuildWithDani (BWD)</span>
        </span>
      </div>
    );
  }

  // Default variant - premium badge with gray and blue
  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50/90 to-white rounded-2xl border-2 border-primary-200/80 shadow-premium hover:shadow-premium-lg transition-all cursor-pointer group p-8 backdrop-blur-sm"
    >
      {/* Animated gradient background - gray and blue */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 via-accent-50/20 to-primary-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      
      {/* Decorative background elements with blue glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-accent-200/30 via-primary-200/30 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-primary-200/30 via-accent-200/30 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer"></div>
      
      <div className="relative z-10 flex items-center gap-6">
        {showLogo && (
          <div className="relative flex-shrink-0">
            {/* Blue glow effect behind logo */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent-400/30 to-accent-600/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-150"></div>
            <div className="relative bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl p-3 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 border border-primary-300/50">
              <img 
                src="./bwd-logo.png" 
                alt="BuildWithDani Logo" 
                className="w-16 h-16 object-contain transition-all duration-300"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.bwd-logo-fallback')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'bwd-logo-fallback w-16 h-16 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 rounded-2xl flex items-center justify-center shadow-lg';
                    fallback.innerHTML = `<span class="text-white text-lg font-black">BWD</span>`;
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-bold text-primary-600 uppercase tracking-widest">Built by</span>
            <span className="text-3xl font-black bg-gradient-to-r from-primary-800 via-primary-700 to-primary-800 bg-clip-text text-transparent group-hover:from-accent-600 group-hover:via-accent-700 group-hover:to-accent-600 transition-all duration-500">
              BuildWithDani
            </span>
            <span className="text-xl font-bold text-accent-600">(BWD)</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-gray-400 group-hover:text-accent-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <button
              type="button"
              className="text-sm font-semibold text-accent-600 hover:text-accent-700 underline-offset-2 hover:underline transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                openExternalLink('https://buildwithdani.com');
              }}
            >
              buildwithdani.com
            </button>
          </div>
          <div className="text-xs font-medium text-gray-500 group-hover:text-gray-700 transition-colors">
            Professional software development & consulting
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300 border border-gray-200/50">
            <svg 
              className={`w-6 h-6 text-gray-400 group-hover:text-accent-600 transition-all ${isHovered ? 'translate-x-1 scale-110' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
