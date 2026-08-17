import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({ 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Select option...', 
  className = '' 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format options if passed as simple strings
  const formattedOptions = options.map((opt) => 
    typeof opt === 'string' 
      ? { value: opt, label: opt } 
      : opt
  );

  const selectedOption = formattedOptions.find((opt) => opt.value === value) || formattedOptions[0];

  const handleSelect = (optValue) => {
    onChange(optValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block w-full ${className}`} ref={dropdownRef}>
      {/* Dropdown Button Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/40 text-xs font-semibold text-foreground backdrop-blur-md transition-all duration-200 hover:bg-muted/80 hover:border-violet-500/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20 cursor-pointer ${
          isOpen ? 'border-violet-500/60 ring-2 ring-violet-500/20 shadow-md' : ''
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon && <span className="text-sm">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </span>
        <ChevronDown 
          className={`h-4 w-4 text-muted-foreground transition-transform duration-300 shrink-0 ${
            isOpen ? 'rotate-180 text-violet-500' : ''
          }`} 
        />
      </button>

      {/* Floating Menu Overlay */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-2xl border border-border/80 bg-card/95 p-1.5 shadow-2xl shadow-violet-900/10 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-foreground">
          {formattedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-violet-600 text-white font-bold shadow-md shadow-violet-600/30'
                    : 'text-foreground/90 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-300'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  {opt.icon && <span className="text-sm">{opt.icon}</span>}
                  <span className="truncate">{opt.label}</span>
                </span>
                {isSelected && <Check className="h-3.5 w-3.5 text-white shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
