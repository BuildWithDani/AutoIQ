import { useState, useRef, useEffect } from 'react';

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
  disabled?: boolean;
}

const EMAIL_PROVIDERS = [
  '@gmail.com',
  '@yahoo.com',
  '@outlook.com',
  '@hotmail.com',
  '@icloud.com',
  '@aol.com',
  '@protonmail.com',
  '@mail.com',
  '@yandex.com',
  '@gmx.com',
  '@zoho.com',
  '@live.com',
  '@msn.com',
  '@comcast.net',
  '@verizon.net',
  '@att.net',
  '@sbcglobal.net',
];

export default function EmailInput({
  value,
  onChange,
  placeholder = 'you@example.com',
  required = false,
  id,
  className = '',
  disabled = false,
}: EmailInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredProviders, setFilteredProviders] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user is typing after @ symbol
    const atIndex = value.lastIndexOf('@');
    if (atIndex >= 0) {
      const domainPart = value.substring(atIndex + 1).toLowerCase();
      const filtered = EMAIL_PROVIDERS.filter(provider =>
        provider.substring(1).startsWith(domainPart)
      );
      
      if (filtered.length > 0 && domainPart.length > 0) {
        setFilteredProviders(filtered);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } else if (domainPart.length === 0) {
        // Show all providers when just @ is typed
        setFilteredProviders(EMAIL_PROVIDERS);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleSelectProvider = (provider: string) => {
    const atIndex = value.lastIndexOf('@');
    if (atIndex >= 0) {
      const emailPart = value.substring(0, atIndex);
      onChange(emailPart + provider);
    } else {
      onChange(value + provider);
    }
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredProviders.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredProviders.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectProvider(filteredProviders[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
          </svg>
        </div>
        <input
          ref={inputRef}
          id={id}
          type="email"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            const atIndex = value.lastIndexOf('@');
            if (atIndex >= 0) {
              const domainPart = value.substring(atIndex + 1);
              if (domainPart.length === 0) {
                setFilteredProviders(EMAIL_PROVIDERS);
                setShowSuggestions(true);
              }
            }
          }}
          required={required}
          disabled={disabled}
          className={`w-full pl-12 pr-4 py-3.5 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all shadow-sm hover:shadow-md ${className}`}
          placeholder={placeholder}
        />
      </div>

      {showSuggestions && filteredProviders.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {filteredProviders.map((provider, index) => {
            const atIndex = value.lastIndexOf('@');
            const emailPart = atIndex >= 0 ? value.substring(0, atIndex) : value;
            
            return (
              <button
                key={provider}
                type="button"
                onClick={() => handleSelectProvider(provider)}
                className={`w-full text-left px-4 py-2 hover:bg-accent-50 transition-colors ${
                  index === selectedIndex ? 'bg-accent-50' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">{emailPart}</span>
                  <span className="font-semibold text-gray-900">{provider}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

