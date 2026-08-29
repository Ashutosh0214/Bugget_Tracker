import React, { useState } from 'react';
import TextAnimation from '@/components/ui/staggerText';
import { 
  Zap, 
  TrendingUp, 
  Shield, 
  PieChart, 
  Globe, 
  CheckCircle2, 
  Sparkles, 
  ChevronDown 
} from 'lucide-react';

export interface PricingSectionProps {
  onOpenAuth?: (initialMode?: 'login' | 'signup') => void;
}

export function FeaturesSection() {
  const features = [
    {
      icon: <Zap className="h-6 w-6 text-violet-500" />,
      title: 'Automated Expense Tracking',
      description: 'Log and organize every expense in real-time. Automatic categorization saves you hours of manual entry.'
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-indigo-500" />,
      title: 'Smart Budgeting & Limits',
      description: 'Set custom spending caps for dining, shopping, and entertainment. Get instant alerts before overspending.'
    },
    {
      icon: <Sparkles className="h-6 w-6 text-purple-500" />,
      title: 'AI Financial Insights',
      description: 'Receive proactive AI recommendations to cut recurring subscription waste and optimize monthly savings.'
    },
    {
      icon: <PieChart className="h-6 w-6 text-emerald-500" />,
      title: 'Visual Analytics & Charts',
      description: 'Interactive cash flow graphs and category breakdown charts give you instant clarity on money flow.'
    },
    {
      icon: <Globe className="h-6 w-6 text-amber-500" />,
      title: 'Multi-Currency Support',
      description: 'Seamlessly switch between USD, EUR, INR, GBP and automatically handle international transactions.'
    },
    {
      icon: <Shield className="h-6 w-6 text-rose-500" />,
      title: 'Bank-Grade Security',
      description: 'Protected with 256-bit AES encryption. Your credentials and financial logs remain 100% private.'
    }
  ];

  return (
    <section id="features" className="scroll-mt-20 py-12 px-6 border-t border-border bg-muted/20">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="inline-block text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest bg-violet-500/10 px-3.5 py-1.5 rounded-full border border-violet-500/20">
            <TextAnimation divideBy="word" delay={0.1}>
              Platform Features
            </TextAnimation>
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            <TextAnimation divideBy="word" delay={0.15}>
              Designed to make financial clarity effortless
            </TextAnimation>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            <TextAnimation divideBy="word" delay={0.25}>
              Everything you need to master your money flow, stay on budget, and grow long-term wealth.
            </TextAnimation>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, idx) => (
            <div 
              key={idx} 
              className="p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-xl hover:border-violet-500/40 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {f.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Create Your Account',
      description: 'Sign up in less than 30 seconds with email or Google account. Zero credit card required to start.'
    },
    {
      step: '02',
      title: 'Sync Transactions',
      description: 'Connect your accounts or import CSV statements effortlessly with end-to-end bank encryption.'
    },
    {
      step: '03',
      title: 'AI Auto-Categorization',
      description: 'Our intelligent engine tags your expenses instantly, highlighting recurring bills and spending trends.'
    },
    {
      step: '04',
      title: 'Optimize & Grow Wealth',
      description: 'Receive proactive AI savings recommendations and watch your net worth increase month over month.'
    }
  ];

  return (
    <section id="how-it-works" className="scroll-mt-20 py-12 px-6 border-t border-border bg-background">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="inline-block text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest bg-violet-500/10 px-3.5 py-1.5 rounded-full border border-violet-500/20">
            <TextAnimation divideBy="word" delay={0.1}>
              How It Works
            </TextAnimation>
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            <TextAnimation divideBy="word" delay={0.15}>
              Simple 4-step financial transformation
            </TextAnimation>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            <TextAnimation divideBy="word" delay={0.25}>
              Spendze simplifies personal finance management into effortless automated steps.
            </TextAnimation>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((st, idx) => (
            <div 
              key={idx} 
              className="p-8 rounded-3xl border border-border bg-card shadow-sm hover:border-violet-500/40 hover:-translate-y-1 transition-all duration-300 space-y-4 relative"
            >
              <span className="text-4xl font-extrabold text-violet-500/20 block font-mono">
                {st.step}
              </span>
              <h3 className="text-xl font-bold text-foreground">
                {st.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {st.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingSection({ onOpenAuth }: PricingSectionProps) {
  const plans = [
    {
      name: 'Starter',
      price: '$0',
      period: 'forever free',
      description: 'Perfect for individuals starting their financial tracking journey.',
      features: [
        'Up to 100 transactions/mo',
        'Basic expense categories',
        'Single currency support',
        'Mobile & web dashboard'
      ],
      cta: 'Get Started Free',
      popular: false
    },
    {
      name: 'Pro AI',
      price: '$9',
      period: 'per month',
      description: 'For active budgeters who want deep AI insights and automated tracking.',
      features: [
        'Unlimited transaction history',
        'Spendzy AI Assistant 24/7',
        'Predictive savings insights',
        'Multi-currency (USD, EUR, INR, GBP)',
        'Custom budget limits & alerts'
      ],
      cta: 'Start 14-Day Free Trial',
      popular: true
    },
    {
      name: 'Business',
      price: '$29',
      period: 'per month',
      description: 'For freelancers, teams, and small business owners.',
      features: [
        'Everything in Pro AI',
        'Multi-user shared workspaces',
        'CSV / PDF export & tax reports',
        'Priority 24/7 dedicated support',
        'Custom API integrations'
      ],
      cta: 'Upgrade to Business',
      popular: false
    }
  ];

  return (
    <section id="pricing" className="scroll-mt-20 py-8 px-6 bg-transparent">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="inline-block text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest bg-violet-500/10 px-3.5 py-1.5 rounded-full border border-violet-500/20">
            <TextAnimation divideBy="word" delay={0.1}>
              Transparent Pricing
            </TextAnimation>
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            <TextAnimation divideBy="word" delay={0.15}>
              Simple plans tailored for every goal
            </TextAnimation>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            <TextAnimation divideBy="word" delay={0.25}>
              No hidden fees, no credit card required to start your free trial.
            </TextAnimation>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-2">
          {plans.map((p, idx) => (
            <div 
              key={idx} 
              className={`p-8 rounded-3xl border transition-all duration-300 flex flex-col justify-between relative ${
                p.popular 
                  ? 'border-violet-500 bg-card shadow-2xl shadow-violet-500/10 scale-105 z-10' 
                  : 'border-border bg-card shadow-sm hover:border-violet-500/30'
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-md">
                  Most Popular
                </span>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-extrabold text-foreground">{p.price}</span>
                  <span className="text-xs text-muted-foreground font-semibold">/ {p.period}</span>
                </div>

                <ul className="space-y-3 pt-2">
                  {p.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-violet-500 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <button
                  type="button"
                  onClick={() => onOpenAuth && onOpenAuth('signup')}
                  className={`w-full py-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    p.popular
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 hover:scale-[1.02]'
                      : 'bg-muted border border-border text-foreground hover:bg-violet-500/10 hover:border-violet-500/30'
                  }`}
                >
                  {p.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      question: 'What is Spendze?',
      answer: 'Spendze is an all-in-one smart personal finance OS and expense management platform designed to help you automate transaction tracking, monitor custom category budgets, and leverage AI-driven insights to grow long-term wealth.'
    },
    {
      question: 'How do I add and track my expenses?',
      answer: 'Adding expenses is effortless: you can manually add new transactions in seconds using the "Add Expense" button on your dashboard, or let Spendze automatically sync and tag incoming transactions in real-time.'
    },
    {
      question: 'How does Spendze help me manage my budget?',
      answer: 'Spendze allows you to set custom monthly target caps for spending categories like Groceries, Technology, and Entertainment. Visual progress meters keep you informed, and instant alerts notify you before you exceed your limits.'
    },
    {
      question: 'Can I categorize my expenses?',
      answer: 'Yes! Spendze provides smart predefined categories (Groceries, Technology, Entertainment, Transport, Income, etc.) and utilizes intelligent auto-tagging to organize all your expenses automatically.'
    },
    {
      question: 'How does Spendze\'s AI generate insights?',
      answer: 'The Spendzy AI engine analyzes your historical cash flow, spending frequency, and monthly savings rate. It identifies recurring subscription waste, predicts month-end net worth, and provides 24/7 personalized financial advice.'
    },
    {
      question: 'Can Spendze help me identify unnecessary spending?',
      answer: 'Absolutely. Spendze flags unutilized streaming subscriptions, duplicate bills, and high-frequency lifestyle spending, giving you actionable suggestions to cut waste and boost your monthly savings.'
    },
    {
      question: 'How can I view my spending trends?',
      answer: 'You can access interactive 6-month cash flow graphs, category breakdown charts, and income vs. expense visualizers directly from the Analytics tab on your dashboard.'
    },
    {
      question: 'Does Spendze access my bank account or UPI transactions?',
      answer: 'Spendze works exclusively with secure, read-only statement feeds and transaction data. Spendze never has permission to move funds, initiate payments, or access your banking PINs or credentials.'
    },
    {
      question: 'Is my financial data secure?',
      answer: 'Yes, 100%. All personal and transaction data is encrypted end-to-end using bank-grade 256-bit AES encryption. We enforce zero-trust security architecture and never sell user data to third parties.'
    },
    {
      question: 'Can I delete my account and data?',
      answer: 'Yes. You retain 100% control over your privacy. You can export a full backup of your financial data (CSV/PDF) or permanently delete your account and wipe all stored data at any time from settings.'
    }
  ];

  const toggleFaq = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section id="faq" className="scroll-mt-20 py-12 px-6 border-t border-border bg-background">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="inline-block text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest bg-violet-500/10 px-3.5 py-1.5 rounded-full border border-violet-500/20">
            <TextAnimation divideBy="word" delay={0.1}>
              Frequently Asked Questions
            </TextAnimation>
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            <TextAnimation divideBy="word" delay={0.15}>
              Got questions? We've got answers.
            </TextAnimation>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            <TextAnimation divideBy="word" delay={0.25}>
              Everything you need to know about Spendze, pricing, AI tracking, and account security.
            </TextAnimation>
          </p>
        </div>

        {/* 2-Column Minimalist Line FAQ Layout matching design screenshot */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 items-start">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div 
                key={idx}
                className="border-b border-border/80 pb-5 transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left flex items-center justify-between gap-4 group cursor-pointer py-1 select-none"
                >
                  <span className={`text-base font-semibold transition-colors ${
                    isOpen 
                      ? 'text-foreground underline decoration-2 underline-offset-8 decoration-violet-500 font-bold' 
                      : 'text-foreground/90 hover:text-violet-600 dark:hover:text-violet-400'
                  }`}>
                    {faq.question}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
                    isOpen ? 'rotate-180 text-violet-500' : 'group-hover:text-foreground'
                  }`} />
                </button>

                {isOpen && (
                  <div className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed animate-in fade-in duration-200 pt-1">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
