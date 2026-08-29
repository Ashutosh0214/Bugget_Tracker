import React, { useState, useEffect } from 'react';
import { Wallet, ArrowRight, Sun, Moon, Menu, X, ChevronRight } from 'lucide-react';

export interface NavbarProps {
  mode?: 'light' | 'dark';
  onToggleMode?: () => void;
  onOpenAuth?: (initialMode?: 'login' | 'signup') => void;
  onOpenDashboard?: () => void;
  onSelectSection?: (href: string) => void;
  activeLinkOverride?: string;
}

const NAV_LINKS = [
  { name: 'Home', href: '#home' },
  { name: 'Features', href: '#features' },
  { name: 'How It Works', href: '#how-it-works' },
  { name: 'Dashboard', href: '#dashboard' },
  { name: 'Pricing', href: '#pricing' },
  { name: 'FAQ', href: '#faq' },
];

export default function Navbar({ 
  mode = 'light', 
  onToggleMode, 
  onOpenAuth, 
  onOpenDashboard, 
  onSelectSection,
  activeLinkOverride
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [activeLink, setActiveLink] = useState<string>('#home');

  // Automatically update active nav link as user scrolls through sections
  useEffect(() => {
    if (activeLinkOverride) {
      setActiveLink(activeLinkOverride);
      return;
    }

    const sectionIds = ['home', 'features', 'how-it-works', 'pricing', 'faq'];
    
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140;

      if (window.scrollY < 200) {
        setActiveLink('#home');
        return;
      }

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const section = document.getElementById(sectionIds[i]);
        if (section) {
          const top = section.offsetTop;
          if (scrollPosition >= top) {
            setActiveLink(`#${sectionIds[i]}`);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeLinkOverride]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setActiveLink(href);
    setMobileMenuOpen(false);

    if (href === '#dashboard') {
      if (onOpenDashboard) onOpenDashboard();
      return;
    }

    if (onSelectSection) {
      onSelectSection(href);
    } else {
      if (href === '#home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const targetId = href.replace('#', '');
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full px-3 sm:px-6 pt-3 pb-1 bg-transparent">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-3 rounded-2xl bg-white/40 dark:bg-zinc-900/40 border border-white/40 dark:border-white/10 shadow-md shadow-slate-900/[0.025] dark:shadow-black/25 backdrop-blur-xl backdrop-saturate-150 transition-all duration-300">
        
        {/* Left Side: Brand Logo */}
        <a 
          href="#home" 
          onClick={(e) => handleNavClick(e, '#home')}
          className="flex items-center gap-2.5 group cursor-pointer"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-violet-500/25 transition-transform duration-300 group-hover:scale-105">
            <Wallet className="h-5 w-5 fill-white/20 text-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white transition-colors duration-200">
            Spendze
          </span>
        </a>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold">
          {NAV_LINKS.map((link) => {
            const isActive = (activeLinkOverride || activeLink) === link.href;
            return (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`relative py-1 text-sm transition-colors duration-200 cursor-pointer ${
                  isActive
                    ? 'text-violet-600 dark:text-violet-400 font-bold'
                    : 'text-black dark:text-white hover:text-violet-600 dark:hover:text-violet-400 font-semibold'
                }`}
              >
                <span>{link.name}</span>
                {/* Purple horizontal accent indicator bar right under the text */}
                {isActive && (
                  <span className="absolute -bottom-1 left-0 right-0 h-[2.5px] bg-violet-600 dark:bg-violet-400 rounded-full animate-in fade-in zoom-in-75 duration-200" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Right Side Controls: Theme Toggle & Get Started CTA */}
        <div className="hidden md:flex items-center gap-3">
          
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={onToggleMode}
            className="p-2 rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {mode === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-600" />
            )}
          </button>

          {/* Adaptive Theme CTA Button (Black in Light Mode, White in Dark Mode) */}
          <button
            type="button"
            onClick={() => onOpenAuth && onOpenAuth('signup')}
            className="group inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-2 text-sm font-semibold shadow-md transition-all duration-300 hover:bg-slate-800 dark:hover:bg-slate-100 hover:scale-[1.03] active:scale-95 cursor-pointer"
          >
            <span>Get Started</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>

        {/* Mobile Hamburger Control */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={onToggleMode}
            className="p-2 rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
            aria-label="Toggle theme"
          >
            {mode === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden mx-auto max-w-7xl mt-2 rounded-2xl border border-white/40 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-5 space-y-2 shadow-lg shadow-black/25 animate-in slide-in-from-top-2 duration-200">
          {NAV_LINKS.map((link) => {
            const isActive = (activeLinkOverride || activeLink) === link.href;
            return (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`group flex items-center justify-between rounded-xl px-4 py-2.5 text-base font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold'
                    : 'text-black dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-violet-600 dark:hover:text-violet-400'
                }`}
              >
                <span>{link.name}</span>
                <ChevronRight className="h-4 w-4 text-violet-500" />
              </a>
            );
          })}

          <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenAuth) onOpenAuth('signup');
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 text-sm font-semibold shadow-md"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
