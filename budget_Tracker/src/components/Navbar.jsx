import React, { useState } from 'react';
import { Wallet, ArrowRight, Sun, Moon, Menu, X } from 'lucide-react';

export default function Navbar({ mode = 'light', onToggleMode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        
        {/* Brand Logo */}
        <a href="#" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 shadow-lg shadow-violet-500/25 group-hover:scale-105 transition-transform duration-300">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
            Spend<span className="text-violet-500">zy</span>
            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-300 border border-violet-500/30">
              v2.0
            </span>
          </span>
        </a>

        {/* Glassmorphic Pill Floating Capsule for Links Only */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium rounded-full bg-white/50 dark:bg-zinc-900/60 text-foreground border border-white/40 dark:border-white/15 px-7 py-2.5 shadow-2xl shadow-black/10 dark:shadow-black/50 backdrop-blur-2xl transition-all duration-300">
          <a href="#services" className="hover:text-violet-600 dark:hover:text-white transition-colors">Services</a>
          <a href="#about" className="hover:text-violet-600 dark:hover:text-white transition-colors">About</a>
          <a href="#principles" className="hover:text-violet-600 dark:hover:text-white transition-colors">Our Principles</a>
          <a href="#community" className="hover:text-violet-600 dark:hover:text-white transition-colors">Community</a>
          <a href="#contact" className="hover:text-violet-600 dark:hover:text-white transition-colors">Contact</a>
        </nav>

        {/* Right Side Controls: Mode Toggle & CTA */}
        <div className="hidden md:flex items-center gap-3 text-foreground">
          
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={onToggleMode}
            className="flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-3.5 py-2 text-xs font-semibold text-foreground backdrop-blur-md transition-all hover:bg-muted active:scale-95 cursor-pointer"
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

          <a
            href="#get-started"
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all duration-300 hover:shadow-violet-600/50 hover:scale-[1.02] active:scale-95"
          >
            <span>Get Started</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onToggleMode}
            className="p-1.5 rounded-full hover:bg-accent"
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
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-2xl px-6 py-6 space-y-4">
          <a
            href="#services"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-muted-foreground hover:text-foreground"
          >
            Services
          </a>
          <a
            href="#about"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-muted-foreground hover:text-foreground"
          >
            About
          </a>
          <a
            href="#principles"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-muted-foreground hover:text-foreground"
          >
            Our Principles
          </a>
          <a
            href="#community"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-muted-foreground hover:text-foreground"
          >
            Community
          </a>
          <a
            href="#contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-muted-foreground hover:text-foreground"
          >
            Contact
          </a>

          <div className="pt-4 border-t border-border flex justify-end">
            <a
              href="#get-started"
              className="text-center text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 rounded-xl"
            >
              Get Started
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
