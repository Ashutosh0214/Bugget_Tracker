import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import { 
  Shield, 
  TrendingUp, 
  Layers, 
  Smartphone, 
  Zap, 
  Sparkles, 
  CheckCircle, 
  ArrowRight 
} from 'lucide-react';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-violet-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar />

      {/* Hero Section with Radial Black-Violet Background */}
      <Hero />

      {/* Features Grid Section */}
      <section id="features" className="relative py-20 px-6 border-t border-white/10 bg-black/60">
        <div className="max-w-7xl mx-auto text-center space-y-12">
          <div className="space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
              Why BudgetPulse
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
              Designed to make financial clarity effortless
            </h2>
            <p className="text-gray-400 text-base">
              Everything you need to master your money flow, stay on budget, and grow long-term wealth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl hover:border-violet-500/40 transition-all duration-300 group">
              <div className="h-12 w-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-6 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Automated Categorization</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Connect your accounts seamlessly. Our intelligent engine categorizes expenses in real time without manual spreadsheet data entry.
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl hover:border-violet-500/40 transition-all duration-300 group">
              <div className="h-12 w-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Predictive Savings Insights</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Receive proactive recommendations on where you can optimize subscriptions, cut recurring waste, and boost monthly savings.
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl hover:border-violet-500/40 transition-all duration-300 group">
              <div className="h-12 w-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Bank-Grade Encryption</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Your data is protected with end-to-end 256-bit AES encryption. We never sell your personal information or store plain-text credentials.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Footer Banner */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto rounded-3xl border border-violet-500/30 bg-gradient-to-r from-violet-950/80 via-black to-purple-950/80 p-10 md:p-16 text-center space-y-6 relative">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Ready to Take Control of Your Financial Future?
          </h2>
          <p className="text-gray-300 max-w-xl mx-auto text-base">
            Join over 50,000 users building wealth with precision. Setup takes less than 30 seconds.
          </p>
          <div className="pt-4 flex justify-center">
            <a
              href="#get-started"
              className="group inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-4 text-base font-bold text-black shadow-2xl transition-all duration-300 hover:bg-gray-100 hover:scale-105 active:scale-95"
            >
              <span>Get Started Free Today</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 px-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} BudgetPulse. All rights reserved.</p>
          <p className="text-gray-400">
            Background snippet by{' '}
            <a 
              href="https://21st.dev/@ibelick/components/background-snippets/background-radial-black-violet" 
              target="_blank" 
              rel="noreferrer"
              className="text-violet-400 hover:underline"
            >
              @ibelick on 21st.dev
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
