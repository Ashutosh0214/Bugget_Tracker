import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import DashboardLayout from './components/DashboardLayout';
import HeroSectionDemo from '@/components/ui/demo';
import TextAnimation from '@/components/ui/staggerText';
import { 
  FeaturesSection, 
  HowItWorksSection, 
  PricingSection, 
  FaqSection 
} from './components/LandingSections';
import { 
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import './App.css';

type ViewMode = 'landing' | 'dashboard' | 'pricing';

function App() {
  const [mode, setMode] = useState<'light' | 'dark'>('light'); // default to light mode
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('signup');

  useEffect(() => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  const toggleMode = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleOpenAuth = (initialMode: 'login' | 'signup' = 'signup') => {
    setAuthInitialMode(initialMode);
    setAuthModalOpen(true);
  };

  const handleSelectSection = (href: string) => {
    if (href === '#dashboard') {
      setViewMode('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (href === '#pricing') {
      setViewMode('pricing');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // If navigating to home, features, how-it-works, or faq
    if (viewMode !== 'landing') {
      setViewMode('landing');
      setTimeout(() => {
        if (href === '#home') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        const targetId = href.replace('#', '');
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      if (href === '#home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const targetId = href.replace('#', '');
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Dashboard View
  if (viewMode === 'dashboard') {
    return (
      <DashboardLayout
        mode={mode}
        onToggleMode={toggleMode}
        onExitDashboard={() => setViewMode('landing')}
      />
    );
  }

  // Standalone Separate Pricing Page View
  if (viewMode === 'pricing') {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans selection:bg-violet-500 selection:text-white transition-colors duration-300">
        <Navbar 
          mode={mode}
          onToggleMode={toggleMode}
          onOpenAuth={handleOpenAuth}
          onOpenDashboard={() => setViewMode('dashboard')}
          onSelectSection={handleSelectSection}
          activeLinkOverride="#pricing"
        />

        {/* Back to Home Header Control */}
        <div className="max-w-7xl mx-auto px-6 pt-6 flex items-center justify-between">
          <button
            onClick={() => handleSelectSection('#home')}
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border text-xs font-bold text-foreground hover:bg-violet-500/10 hover:border-violet-500/30 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Home</span>
          </button>
        </div>

        {/* Dedicated Standalone Pricing Section */}
        <div className="py-4">
          <PricingSection onOpenAuth={handleOpenAuth} />
        </div>

        {/* Call to Action Footer Banner */}
        <section className="relative py-20 px-6 overflow-hidden border-t border-border">
          <div className="max-w-5xl mx-auto rounded-3xl border border-border bg-gradient-to-r from-zinc-900 via-black to-zinc-900 p-10 md:p-16 text-center space-y-6 relative text-white">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              <TextAnimation divideBy="word" delay={0.1}>
                Ready to Take Control of Your Financial Future?
              </TextAnimation>
            </h2>
            <p className="text-gray-300 max-w-xl mx-auto text-base">
              <TextAnimation divideBy="word" delay={0.25}>
                Join over 50,000 users building wealth with precision. Setup takes less than 30 seconds.
              </TextAnimation>
            </p>
            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={() => handleOpenAuth('signup')}
                className="group inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-4 text-base font-bold text-black shadow-2xl transition-all duration-300 hover:bg-gray-100 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Get Started Free Today</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-10 px-6 text-center text-xs text-muted-foreground">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <p>© {new Date().getFullYear()} Spendze. All rights reserved.</p>
          </div>
        </footer>

        {/* Authentication Modal */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode={authInitialMode}
        />
      </div>
    );
  }

  // Main Home Landing Page View (Pricing Section removed from direct scroll)
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-violet-500 selection:text-white transition-colors duration-300">
      {/* Navigation Header */}
      <Navbar 
        mode={mode}
        onToggleMode={toggleMode}
        onOpenAuth={handleOpenAuth}
        onOpenDashboard={() => setViewMode('dashboard')}
        onSelectSection={handleSelectSection}
      />

      {/* Home Hero Section (#home) */}
      <div id="home" className="scroll-mt-24">
        <HeroSectionDemo onOpenAuth={handleOpenAuth} />
      </div>

      {/* Features Section (#features) */}
      <FeaturesSection />

      {/* How It Works Section (#how-it-works) */}
      <HowItWorksSection />

      {/* FAQ Section (#faq) */}
      <FaqSection />

      {/* Call to Action Footer Banner */}
      <section className="relative py-20 px-6 overflow-hidden border-t border-border">
        <div className="max-w-5xl mx-auto rounded-3xl border border-border bg-gradient-to-r from-zinc-900 via-black to-zinc-900 p-10 md:p-16 text-center space-y-6 relative text-white">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            <TextAnimation divideBy="word" delay={0.1}>
              Ready to Take Control of Your Financial Future?
            </TextAnimation>
          </h2>
          <p className="text-gray-300 max-w-xl mx-auto text-base">
            <TextAnimation divideBy="word" delay={0.25}>
              Join over 50,000 users building wealth with precision. Setup takes less than 30 seconds.
            </TextAnimation>
          </p>
          <div className="pt-4 flex justify-center">
            <button
              type="button"
              onClick={() => handleOpenAuth('signup')}
              className="group inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-4 text-base font-bold text-black shadow-2xl transition-all duration-300 hover:bg-gray-100 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Get Started Free Today</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <p>© {new Date().getFullYear()} Spendze. All rights reserved.</p>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authInitialMode}
      />
    </div>
  );
}

export default App;
