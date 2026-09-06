import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import DashboardLayout from './components/DashboardLayout';
import HeroSectionDemo from '@/components/ui/demo';
import TextAnimation from '@/components/ui/staggerText';
import { useAuth } from './context/AuthContext';
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
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading, logout } = useAuth();
  const [mode, setMode] = useState<'light' | 'dark'>('light'); // default to light mode
  const routeViewMode =
    location.state && typeof location.state === 'object' && 'viewMode' in location.state
      ? location.state.viewMode
      : undefined;
  const [viewMode, setViewMode] = useState<ViewMode>(
    location.pathname === '/dashboard' || routeViewMode === 'dashboard' ? 'dashboard' : 'landing'
  );

  useEffect(() => {
    if (location.pathname === '/dashboard') {
      setViewMode('dashboard');
    } else if (routeViewMode === 'dashboard' || routeViewMode === 'landing') {
      setViewMode(routeViewMode);
    }
  }, [location.pathname, routeViewMode]);

  useEffect(() => {
    if (viewMode === 'dashboard' && !authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, viewMode]);

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
    navigate(initialMode === 'signup' ? '/register' : '/login');
  };

  const handleSelectSection = (href: string) => {
    if (href === '#dashboard') {
      navigate(isAuthenticated ? '/dashboard' : '/login');
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

  const handleLogout = () => {
    logout();
    setViewMode('landing');
    navigate('/', { replace: true });
  };

  // Dashboard View
  if (viewMode === 'dashboard') {
    if (authLoading || !isAuthenticated) {
      return <div className="h-screen w-full bg-background animate-pulse" aria-label="Loading dashboard" />;
    }

    return (
      <DashboardLayout
        mode={mode}
        onToggleMode={toggleMode}
        onExitDashboard={handleLogout}
      />
    );
  }

  // Standalone Separate Pricing Page View (ONLY pricing details with smooth Framer Motion page transition)
  if (viewMode === 'pricing') {
    return (
      <motion.div 
        key="pricing-page"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -24, scale: 0.98 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-screen bg-background text-foreground font-sans selection:bg-violet-500 selection:text-white transition-colors duration-300 flex flex-col justify-between"
      >
        <div>
          <Navbar 
            mode={mode}
            onToggleMode={toggleMode}
            onOpenAuth={handleOpenAuth}
            onOpenDashboard={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
            onSelectSection={handleSelectSection}
            activeLinkOverride="#pricing"
          />

          {/* Back to Home Header Control */}
          <div className="max-w-7xl mx-auto px-6 pt-3 flex items-center justify-between">
            <button
              onClick={() => handleSelectSection('#home')}
              className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border text-xs font-bold text-foreground hover:bg-violet-500/10 hover:border-violet-500/30 transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span>Back to Home</span>
            </button>
          </div>

          {/* Dedicated Standalone Pricing Details Only */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
            className="py-1"
          >
            <PricingSection onOpenAuth={handleOpenAuth} />
          </motion.div>
        </div>

        {/* Clean Footer */}
        <footer className="border-t border-border py-6 px-6 text-center text-xs text-muted-foreground">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <p>© {new Date().getFullYear()} Spendze. All rights reserved.</p>
          </div>
        </footer>

      </motion.div>
    );
  }

  // Main Home Landing Page View (Pricing Section removed from direct scroll)
  return (
    <motion.div 
      key="landing-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background text-foreground font-sans selection:bg-violet-500 selection:text-white transition-colors duration-300"
    >
      {/* Navigation Header */}
      <Navbar 
        mode={mode}
        onToggleMode={toggleMode}
        onOpenAuth={handleOpenAuth}
        onOpenDashboard={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
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
      <section className="relative py-12 px-6 overflow-hidden border-t border-border">
        <div className="max-w-5xl mx-auto rounded-3xl border border-border bg-gradient-to-r from-zinc-900 via-black to-zinc-900 p-8 md:p-12 text-center space-y-5 relative text-white">
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
          <div className="pt-3 flex justify-center">
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
      <footer className="border-t border-border py-6 px-6 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <p>© {new Date().getFullYear()} Spendze. All rights reserved.</p>
        </div>
      </footer>

    </motion.div>
  );
}

export default App;
