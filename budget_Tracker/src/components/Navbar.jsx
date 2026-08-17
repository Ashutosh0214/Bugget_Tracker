import React, { useState } from 'react';
import { Wallet, ArrowRight, Sun, Moon, Menu, X, ChevronRight } from 'lucide-react';

const NAV_LINKS = [
  { name: 'Services', href: '#services' },
  { name: 'About', href: '#about' },
  { name: 'Our Principles', href: '#principles' },
  { name: 'Community', href: '#community' },
  { name: 'Contact', href: '#contact' },
];

export default function Navbar({ mode = 'light', onToggleMode, onOpenAuth, onOpenDashboard }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeLink, setActiveLink] = useState('#services');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        
        {/* Brand Logo with Interactive Hover Effects */}
        <a href="#" className="flex items-center gap-3 group cursor-pointer">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 shadow-lg shadow-violet-500/25 transition-all duration-300 ease-out group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-violet-500/50">
            <Wallet className="h-5 w-5 text-white transition-transform duration-300 group-hover:scale-110" />
            <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5 transition-colors duration-300 group-hover:text-violet-600 dark:group-hover:text-violet-400">
            Spend<span className="text-violet-500 transition-colors duration-300 group-hover:text-indigo-500">zy</span>
            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-300 border border-violet-500/30 transition-all duration-300 group-hover:border-violet-500/60 group-hover:scale-105 group-hover:bg-violet-500/30">
              v2.0
            </span>
          </span>
        </a>

        {/* Glassmorphic Pill Floating Capsule with Interactive Link Hover Effects */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-semibold rounded-full bg-purple-100/70 dark:bg-zinc-900/60 text-purple-950 dark:text-zinc-100 border border-purple-200/80 dark:border-white/15 px-3 py-1.5 shadow-lg shadow-purple-900/5 dark:shadow-black/50 backdrop-blur-2xl transition-all duration-500 hover:border-purple-300 dark:hover:border-violet-500/40 hover:shadow-violet-500/15 hover:shadow-xl">
          {NAV_LINKS.map((link) => {
            const isActive = activeLink === link.href;
            return (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setActiveLink(link.href)}
                className={`relative group/link px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? 'text-violet-600 dark:text-violet-300 font-bold'
                    : 'text-purple-950/80 dark:text-zinc-300 hover:text-violet-700 dark:hover:text-white'
                }`}
              >
                {/* Background Pill Glow on Hover */}
                <span className="absolute inset-0 rounded-full bg-violet-500/15 dark:bg-violet-400/15 opacity-0 transition-all duration-300 ease-out scale-90 group-hover/link:opacity-100 group-hover/link:scale-100 -z-10" />

                {/* Animated Bottom Accent Indicator */}
                <span
                  className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 transition-all duration-300 ease-out ${
                    isActive ? 'w-1/2 opacity-100' : 'w-0 opacity-0 group-hover/link:w-2/3 group-hover/link:opacity-100'
                  }`}
                />

                {/* Text Content with subtle hover lift */}
                <span className="inline-block transition-transform duration-200 group-hover/link:-translate-y-0.5">
                  {link.name}
                </span>
              </a>
            );
          })}
        </nav>

        {/* Right Side Controls: Mode Toggle & CTA */}
        <div className="hidden md:flex items-center gap-3 text-foreground">
          
          {/* Light / Dark Mode Toggle Button with Hover Animation */}
          <button
            onClick={onToggleMode}
            className="group flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-3.5 py-2 text-xs font-semibold text-foreground backdrop-blur-md transition-all duration-300 hover:bg-violet-500/10 dark:hover:bg-violet-500/20 hover:border-violet-500/40 hover:shadow-md hover:shadow-violet-500/10 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {mode === 'dark' ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400 transition-transform duration-500 group-hover:rotate-90 group-hover:scale-110" />
                <span className="transition-colors group-hover:text-amber-400">Light</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-indigo-600 transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110" />
                <span className="transition-colors group-hover:text-indigo-600">Dark</span>
              </>
            )}
          </button>

          {/* Dashboard Direct Button */}
          <button
            type="button"
            onClick={onOpenDashboard}
            className="flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3.5 py-2 text-xs font-bold text-violet-600 dark:text-violet-300 backdrop-blur-md transition-all hover:bg-violet-500/20 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>📊 Spendzy App</span>
          </button>

          {/* Sign In text link */}
          <button
            type="button"
            onClick={() => onOpenAuth && onOpenAuth('login')}
            className="text-xs font-semibold text-foreground/80 hover:text-violet-600 dark:hover:text-violet-400 px-2 py-2 transition-colors cursor-pointer"
          >
            Sign In
          </button>

          {/* CTA Button with Sheen & Lift Hover Effect */}
          <button
            type="button"
            onClick={() => onOpenAuth && onOpenAuth('signup')}
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all duration-300 hover:shadow-violet-600/60 hover:scale-[1.04] hover:-translate-y-0.5 active:scale-95 cursor-pointer"
          >
            {/* Shimmer overlay effect */}
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full transition-transform duration-1000 ease-in-out group-hover:translate-x-full pointer-events-none" />
            <span className="relative z-10">Get Started</span>
            <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
          </button>
        </div>

        {/* Mobile Menu Button with Hover Effect */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onToggleMode}
            className="p-2 rounded-xl transition-all duration-200 hover:bg-violet-500/10 text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
          >
            {mode === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-600" />
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl p-2 text-muted-foreground transition-all duration-200 hover:bg-violet-500/10 hover:text-foreground"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown with Hover Card Animations */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-2xl px-6 py-6 space-y-2 animate-in slide-in-from-top-2 duration-200">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              if (onOpenDashboard) onOpenDashboard();
            }}
            className="w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-base font-bold bg-violet-500/15 text-violet-600 dark:text-violet-300 mb-3 cursor-pointer"
          >
            <span>📊 Open Spendzy Dashboard</span>
            <ChevronRight className="h-4 w-4" />
          </button>

          {NAV_LINKS.map((link) => {
            const isActive = activeLink === link.href;
            return (
              <a
                key={link.name}
                href={link.href}
                onClick={() => {
                  setActiveLink(link.href);
                  setMobileMenuOpen(false);
                }}
                className={`group flex items-center justify-between rounded-xl px-4 py-2.5 text-base font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300 font-semibold'
                    : 'text-muted-foreground hover:bg-violet-500/10 dark:hover:bg-violet-500/20 hover:text-violet-600 dark:hover:text-violet-300 hover:translate-x-1'
                }`}
              >
                <span>{link.name}</span>
                <ChevronRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 text-violet-500" />
              </a>
            );
          })}

          <div className="pt-4 border-t border-border flex justify-between items-center">
            <span className="text-xs text-muted-foreground font-medium">Ready to start?</span>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenAuth) onOpenAuth('signup');
              }}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-600/30 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}



