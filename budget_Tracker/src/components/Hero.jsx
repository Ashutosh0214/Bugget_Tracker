import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Play, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  PieChart, 
  DollarSign, 
  CreditCard,
  CheckCircle2,
  Lock,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import BackgroundRadialBlackViolet from './BackgroundRadialBlackViolet';

export default function Hero() {
  const [monthlyIncome, setMonthlyIncome] = useState(5000);
  const [savingsRate, setSavingsRate] = useState(25);

  const monthlySavings = (monthlyIncome * savingsRate) / 100;
  const annualSavings = monthlySavings * 12;

  return (
    <section className="relative isolate min-h-[92vh] overflow-hidden pt-12 pb-24 text-white">
      {/* 
        Background Radial Black-Violet Snippet from 21st.dev (@ibelick) 
        https://21st.dev/@ibelick/components/background-snippets/background-radial-black-violet
      */}
      <BackgroundRadialBlackViolet />

      {/* Grid Pattern Overlay for subtle luxury texture */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#1f19380a_1px,transparent_1px),linear-gradient(to_bottom,#1f19380a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        
        {/* Top Hero Pill Badge */}
        <div className="flex justify-center">
          <a 
            href="#features" 
            className="group inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-950/40 px-4 py-1.5 text-xs font-medium text-violet-300 backdrop-blur-md transition-all duration-300 hover:border-violet-500/60 hover:bg-violet-900/50 hover:shadow-lg hover:shadow-violet-500/20"
          >
            <span className="flex h-2 w-2 rounded-full bg-violet-400 animate-ping" />
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            <span>Introducing BudgetPulse 2.0 with AI Insights</span>
            <ChevronRight className="h-3.5 w-3.5 text-violet-400 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

        {/* Hero Headline & Subtitle */}
        <div className="mt-8 text-center max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl leading-[1.1]">
            Master Your Money With{' '}
            <span className="bg-gradient-to-r from-violet-300 via-purple-400 to-indigo-300 bg-clip-text text-transparent drop-shadow-sm">
              Smart Precision
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Take total control of your personal finances. Track daily expenses, forecast savings effortlessly, and receive real-time intelligent budget alerts.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href="#get-started"
              className="w-full sm:w-auto group relative inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-violet-600/30 transition-all duration-300 hover:shadow-violet-600/50 hover:scale-105 active:scale-95"
            >
              <span>Start Tracking Free</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </a>

            <a
              href="#demo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl border border-white/15 bg-white/5 px-7 py-4 text-base font-semibold text-gray-200 backdrop-blur-xl transition-all duration-300 hover:bg-white/10 hover:text-white hover:border-white/30"
            >
              <Play className="h-4 w-4 fill-current text-violet-400" />
              <span>Watch 2-Min Demo</span>
            </a>
          </div>

          {/* Security & Guarantee Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-violet-400" />
              Bank-Grade 256-Bit Security
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-400" />
              Instant 30-sec Setup
            </span>
          </div>
        </div>

        {/* Hero Interactive Preview Card Section */}
        <div className="mt-16 relative">
          {/* Ambient Purple Background Glow behind Preview */}
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-violet-600/40 via-purple-600/40 to-indigo-600/40 blur-2xl opacity-60 animate-pulse-glow" />

          {/* Glass Card Dashboard Window */}
          <div className="relative rounded-3xl border border-white/15 bg-gradient-to-b from-white/10 to-black/60 p-6 md:p-8 backdrop-blur-2xl shadow-2xl">
            
            {/* Top Bar Window Controls */}
            <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs font-mono text-gray-400">app.budgetpulse.com/overview</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync Active
                </span>
              </div>
            </div>

            {/* Dashboard Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Column 1: Financial Summary Cards */}
              <div className="space-y-4">
                {/* Total Balance Card */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Total Net Worth</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      <TrendingUp className="h-3 w-3" /> +18.4%
                    </span>
                  </div>
                  <div className="mt-2 text-3xl font-extrabold text-white tracking-tight">
                    $48,290.50
                  </div>
                  <p className="mt-1 text-xs text-gray-400">+$2,410.00 from last month</p>
                </div>

                {/* Monthly Income vs Expense Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-emerald-500/5 p-4">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                      <ArrowUpRight className="h-4 w-4" /> Income
                    </div>
                    <div className="mt-1 text-xl font-bold text-white">$6,450.00</div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-purple-500/5 p-4">
                    <div className="flex items-center gap-2 text-purple-400 text-xs font-medium">
                      <CreditCard className="h-4 w-4" /> Expenses
                    </div>
                    <div className="mt-1 text-xl font-bold text-white">$2,180.00</div>
                  </div>
                </div>

                {/* Budget Health Meter */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex justify-between items-center text-xs font-medium mb-2">
                    <span className="text-gray-300">Monthly Budget Goal</span>
                    <span className="text-violet-300 font-semibold">66% Saved</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 w-[66%] transition-all duration-1000" />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">Great job! On track to save $1,800 extra this month.</p>
                </div>
              </div>

              {/* Column 2: Interactive Savings Calculator */}
              <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-b from-violet-950/40 to-black/60 p-5 backdrop-blur-md flex flex-col justify-between" id="calculator">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-violet-400" /> Instant Savings Calculator
                    </h3>
                    <span className="text-[10px] uppercase font-bold text-violet-400 bg-violet-500/20 px-2 py-0.5 rounded-full border border-violet-500/30">
                      Interactive
                    </span>
                  </div>

                  <div className="space-y-4 text-left">
                    <div>
                      <div className="flex justify-between text-xs text-gray-300 mb-1 font-medium">
                        <span>Monthly Income</span>
                        <span className="text-violet-300 font-bold">${monthlyIncome.toLocaleString()}</span>
                      </div>
                      <input 
                        type="range" 
                        min="1000" 
                        max="20000" 
                        step="500"
                        value={monthlyIncome} 
                        onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-gray-300 mb-1 font-medium">
                        <span>Target Savings Rate</span>
                        <span className="text-violet-300 font-bold">{savingsRate}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="5" 
                        max="60" 
                        step="5"
                        value={savingsRate} 
                        onChange={(e) => setSavingsRate(Number(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Calculation Output Box */}
                <div className="mt-6 rounded-xl border border-violet-500/30 bg-violet-900/30 p-4 text-center">
                  <span className="text-xs text-violet-300 font-medium">Projected 1-Year Wealth Build</span>
                  <div className="text-2xl font-black text-white mt-1">
                    ${annualSavings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[11px] text-gray-300 mt-1">
                    Monthly savings: <span className="text-emerald-400 font-semibold">${monthlySavings.toLocaleString()}/mo</span>
                  </div>
                </div>
              </div>

              {/* Column 3: Recent Smart Transactions */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-purple-400" /> Recent AI Category Sync
                    </h3>
                    <span className="text-xs text-gray-400">Today</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                          💳
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-semibold text-white">Apple Store Subscription</div>
                          <div className="text-[10px] text-gray-400">Tech & Software</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-red-400">-$14.99</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                          💰
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-semibold text-white">Stripe Payout Dividend</div>
                          <div className="text-[10px] text-gray-400">Passive Income</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-400">+$1,250.00</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                          ☕
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-semibold text-white">Artisan Coffee Co.</div>
                          <div className="text-[10px] text-gray-400">Dining & Lifestyle</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-red-400">-$6.50</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                  <span>Smart Categorization</span>
                  <span className="text-violet-300 font-semibold">99.8% Accuracy</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Social Proof & Metrics Footer */}
        <div className="mt-20 border-t border-white/10 pt-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">$120M+</div>
            <div className="text-xs font-medium text-gray-400 mt-1">Monthly Budget Tracked</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">50,000+</div>
            <div className="text-xs font-medium text-gray-400 mt-1">Active Smart Budgeters</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">99.8%</div>
            <div className="text-xs font-medium text-gray-400 mt-1">AI Transaction Accuracy</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">4.9 / 5</div>
            <div className="text-xs font-medium text-gray-400 mt-1">User Satisfaction Rating</div>
          </div>
        </div>

      </div>
    </section>
  );
}
