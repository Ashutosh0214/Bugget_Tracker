import React, { useState } from 'react';
import { Wallet, Sparkles, Menu, X, ArrowRight, Palette, Sun, Moon } from 'lucide-react';

export default function Navbar({ activeTheme, onSelectTheme, mode = 'light', onToggleMode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

  const themes = [
    { id: 'violet', label: 'Violet', color: 'bg-purple-500' },
    { id: 'emerald', label: 'Emerald', color: 'bg-emerald-500' },
    { id: 'cyan', label: 'Cyan', color: 'bg-cyan-500' },
    { id: 'amber', label: 'Amber', color: 'bg-amber-500' },
    { id: 'rose', label: 'Rose', color: 'bg-rose-500' },
    { id: 'obsidian', label: 'Obsidian', color: 'bg-zinc-400' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Brand Logo */}
        <a href="#" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 shadow-lg shadow-violet-500/25 group-hover:scale-105 transition-transform duration-300">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
            Budget<span className="text-violet-500">Pulse</span>
            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-300 border border-violet-500/30">
              v2.0
            </span>
          </span>
        </a>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#calculator" className="hover:text-foreground transition-colors">Savings Calculator</a>
          <a href="#analytics" className="hover:text-foreground transition-colors">Analytics</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
        </nav>

        {/* Theme Switcher & CTA Buttons */}
        <div className="hidden md:flex items-center gap-4">
          
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={onToggleMode}
            className="flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-3.5 py-2 text-xs font-semibold text-foreground backdrop-blur-md transition-all hover:bg-muted active:scale-95"
            title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {mode === 'dark' ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-indigo-600" />
                <span>Dark</span>
              </>
            )}
          </button>

          {/* Accent Color Preset Selector */}
          <div className="relative">
            <button
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              className="flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-3.5 py-2 text-xs font-semibold text-foreground backdrop-blur-md transition-all hover:bg-muted"
              title="Change Color Theme"
            >
              <Palette className="h-3.5 w-3.5 text-violet-500" />
              <span className="capitalize">{activeTheme}</span>
            </button>

            {themeDropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-border bg-popover p-2 backdrop-blur-2xl shadow-2xl z-50 space-y-1">
                <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Color Preset
                </div>
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTheme(t.id);
                      setThemeDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition-all ${
                      activeTheme === t.id
                        ? 'bg-accent text-accent-foreground font-bold'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${t.color}`} />
                    <span className="capitalize">{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <a
            href="#get-started"
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all duration-300 hover:shadow-violet-600/50 hover:scale-[1.02] active:scale-95"
          >
            <span>Get Started</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-2xl px-6 py-6 space-y-4">
          
          {/* Light/Dark Toggle in Mobile Menu */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Appearance
            </div>
            <button
              onClick={() => {
                onToggleMode();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/60 py-2.5 text-xs font-semibold text-foreground transition-all hover:bg-muted"
            >
              {mode === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 text-amber-400" />
                  <span>Switch to Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-indigo-600" />
                  <span>Switch to Dark Mode</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Background Color
            </div>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectTheme(t.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-medium border ${
                    activeTheme === t.id
                      ? 'border-violet-500 bg-violet-500/20 text-foreground'
                      : 'border-border bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${t.color}`} />
                  <span className="capitalize">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-muted-foreground hover:text-foreground pt-2 border-t border-border"
          >
            Features
          </a>
          <a
            href="#calculator"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-muted-foreground hover:text-foreground"
          >
            Savings Calculator
          </a>
          <a
            href="#pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-muted-foreground hover:text-foreground"
          >
            Pricing
          </a>

          <div className="pt-4 border-t border-border flex flex-col gap-3">
            <a
              href="#get-started"
              className="text-center text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 py-2.5 rounded-xl shadow-lg shadow-violet-600/30"
            >
              Get Started Free
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
