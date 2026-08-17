import React, { useState } from 'react';
import Sidebar from './sideBar';
import CustomSelect from './ui/CustomSelect';
import { 
  Search, 
  Bell, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  DollarSign, 
  Wallet, 
  PiggyBank, 
  Sparkles, 
  Send, 
  Filter, 
  Download, 
  Check, 
  AlertTriangle,
  Bot,
  User,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

// Sample mock data for guest transactions fallback
const INITIAL_TRANSACTIONS = [
  { id: 1, name: 'Apple Store Purchase', category: 'Technology', amount: -999.00, date: '2026-08-12', status: 'Completed', icon: '💻' },
  { id: 2, name: 'Monthly Salary Deposit', category: 'Income', amount: 6500.00, date: '2026-08-01', status: 'Completed', icon: '💼' },
  { id: 3, name: 'Whole Foods Market', category: 'Groceries', amount: -142.30, date: '2026-08-10', status: 'Completed', icon: '🛒' },
  { id: 4, name: 'Netflix Subscription', category: 'Entertainment', amount: -19.99, date: '2026-08-05', status: 'Pending', icon: '🎬' },
  { id: 5, name: 'Freelance Design Payment', category: 'Income', amount: 1200.00, date: '2026-08-08', status: 'Completed', icon: '🎨' },
  { id: 6, name: 'Uber Ride', category: 'Transport', amount: -34.50, date: '2026-08-09', status: 'Completed', icon: '🚗' },
];

export default function DashboardLayout({ mode = 'light', onToggleMode, onExitDashboard }) {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currency, setCurrency] = useState('USD');
  
  // New Transaction Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTx, setNewTx] = useState({ name: '', amount: '', category: 'Groceries', type: 'expense' });

  // AI Assistant Chat State
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: `Hello ${user ? user.name : 'Alex'}! I am your Spendzy AI Assistant. How can I help you optimize your spending today?` }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Fetch transactions from backend server when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      transactionApi
        .getAll()
        .then((res) => {
          if (res.transactions && res.transactions.length > 0) {
            setTransactions(res.transactions);
          }
        })
        .catch((err) => {
          console.warn('Failed to load server transactions, using cached state:', err.message);
        });
    }
  }, [isAuthenticated]);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!newTx.name || !newTx.amount) return;

    const numAmount = parseFloat(newTx.amount);
    const finalAmount = newTx.type === 'expense' ? -Math.abs(numAmount) : Math.abs(numAmount);

    const createdData = {
      name: newTx.name,
      category: newTx.category,
      amount: finalAmount,
      date: new Date().toISOString().split('T')[0],
      status: 'Completed',
      icon: newTx.type === 'expense' ? '💸' : '💰',
    };

    if (isAuthenticated) {
      try {
        const res = await transactionApi.create(createdData);
        if (res.transaction) {
          setTransactions([res.transaction, ...transactions]);
        }
      } catch (err) {
        console.error('Failed to create server transaction:', err);
        const fallbackCreated = { id: Date.now(), ...createdData };
        setTransactions([fallbackCreated, ...transactions]);
      }
    } else {
      const fallbackCreated = { id: Date.now(), ...createdData };
      setTransactions([fallbackCreated, ...transactions]);
    }

    setNewTx({ name: '', amount: '', category: 'Groceries', type: 'expense' });
    setShowAddModal(false);
  };

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { sender: 'user', text: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    const query = chatInput;
    setChatInput('');

    // Simulate AI response
    setTimeout(() => {
      let aiText = "I've analyzed your financial data. You are currently saving 54.8% of your monthly income! Consider allocating $300 towards your High-Yield Savings Account.";
      if (query.toLowerCase().includes('dining') || query.toLowerCase().includes('food')) {
        aiText = "You've spent $420 on food & groceries this month, which is 12% lower than last month. Great job!";
      } else if (query.toLowerCase().includes('subscription') || query.toLowerCase().includes('netflix')) {
        aiText = "I detected 3 active subscriptions totaling $58/mo. You haven't used Spotify Premium in 3 weeks!";
      }
      setChatMessages((prev) => [...prev, { sender: 'ai', text: aiText }]);
    }, 800);
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      {/* Left Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mode={mode}
        onToggleMode={onToggleMode}
        onExitDashboard={onExitDashboard}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-muted/20">
        
        {/* Top Header Bar */}
        <header className="h-16 px-6 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between gap-4 shrink-0 z-20">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transactions, budgets, or ask AI..."
                className="w-full rounded-xl border border-border bg-muted/40 pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Action Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-violet-600/30 hover:bg-violet-700 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Expense</span>
            </button>

            {/* Notification Bell */}
            <button className="relative p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-card" />
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                AM
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Welcome Banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 text-white shadow-xl shadow-violet-600/20">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-violet-200 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                    Financial Overview
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Welcome back, Alex! 👋
                  </h1>
                  <p className="text-xs sm:text-sm text-violet-100/90">
                    Here is your real-time financial status & AI smart suggestions.
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab('ai-insights')}
                  className="group flex items-center gap-2 rounded-xl bg-white text-violet-950 px-4 py-2.5 text-xs font-bold shadow-lg hover:bg-violet-50 transition-all cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-violet-600 group-hover:rotate-12 transition-transform" />
                  <span>View AI Insights</span>
                </button>
              </div>

              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* Total Balance */}
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">Total Net Worth</span>
                    <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                      <Wallet className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground tracking-tight">$48,250.00</h3>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 mt-1">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      <span>+12.4% from last month</span>
                    </div>
                  </div>
                </div>

                {/* Monthly Spend */}
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">Monthly Expense</span>
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                      <ArrowDownRight className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground tracking-tight">$3,840.50</h3>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-rose-500 mt-1">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      <span>4% under monthly budget</span>
                    </div>
                  </div>
                </div>

                {/* Monthly Income */}
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">Monthly Income</span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                      <DollarSign className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground tracking-tight">$8,500.00</h3>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 mt-1">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      <span>+$1,200 freelance inflow</span>
                    </div>
                  </div>
                </div>

                {/* Savings Goal */}
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">Savings Rate</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                      <PiggyBank className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground tracking-tight">54.8%</h3>
                    <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-2">
                      <div className="bg-amber-500 h-full w-[54.8%] rounded-full" />
                    </div>
                  </div>
                </div>

              </div>

              {/* Main Visual Section: Income vs Expense Chart & Quick Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Cash Flow Visualizer Chart */}
                <div className="lg:col-span-2 p-6 rounded-3xl border border-border bg-card shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-base font-bold text-foreground">Cash Flow Overview</h2>
                      <p className="text-xs text-muted-foreground">Income vs Expenses over the past 6 months</p>
                    </div>
                    <span className="text-xs font-semibold bg-violet-500/10 text-violet-500 px-2.5 py-1 rounded-lg border border-violet-500/20">
                      2026 YTD
                    </span>
                  </div>

                  {/* Mock Bar Chart Visualizer */}
                  <div className="h-56 flex items-end justify-between gap-3 pt-6 px-2">
                    {[
                      { month: 'Mar', income: 70, expense: 45 },
                      { month: 'Apr', income: 65, expense: 50 },
                      { month: 'May', income: 80, expense: 40 },
                      { month: 'Jun', income: 75, expense: 55 },
                      { month: 'Jul', income: 90, expense: 48 },
                      { month: 'Aug', income: 100, expense: 45 },
                    ].map((item, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="w-full flex justify-center items-end gap-1.5 h-44">
                          {/* Income Bar */}
                          <div 
                            style={{ height: `${item.income}%` }}
                            className="w-1/2 max-w-[20px] bg-violet-600 rounded-t-md group-hover:bg-violet-500 transition-all shadow-sm"
                            title={`Income: ${item.income}%`}
                          />
                          {/* Expense Bar */}
                          <div 
                            style={{ height: `${item.expense}%` }}
                            className="w-1/2 max-w-[20px] bg-rose-500/80 rounded-t-md group-hover:bg-rose-500 transition-all shadow-sm"
                            title={`Expense: ${item.expense}%`}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-muted-foreground">{item.month}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-center gap-6 pt-2 border-t border-border/60 text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-violet-600" />
                      <span>Income ($8,500)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-rose-500" />
                      <span>Expenses ($3,840)</span>
                    </div>
                  </div>
                </div>

                {/* AI Budget Alert Widget */}
                <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <h2 className="text-base font-bold text-foreground">AI Budget Insights</h2>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-amber-600 dark:text-amber-400">
                          <span>Entertainment Budget Alert</span>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          You’ve reached 88% of your monthly entertainment budget. $24 remaining for August.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400">
                          <span>Smart Savings Opportunity</span>
                          <Check className="h-4 w-4" />
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          Auto-transfer $450 to High-Yield Savings to earn 4.8% APY.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveTab('ai-assistant')}
                    className="w-full py-2.5 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Ask AI Assistant</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

              </div>

              {/* Recent Transactions Section */}
              <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-foreground">Recent Activity</h2>
                    <p className="text-xs text-muted-foreground">Latest transactions across all connected accounts</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="py-3 px-4">Transaction</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-xs font-medium">
                      {transactions.slice(0, 5).map((tx) => (
                        <tr key={tx.id} className="hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4 flex items-center gap-3">
                            <span className="text-base">{tx.icon}</span>
                            <span className="font-semibold text-foreground">{tx.name}</span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{tx.category}</td>
                          <td className="py-3 px-4 text-muted-foreground">{tx.date}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.status === 'Completed'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className={`py-3 px-4 text-right font-bold ${
                            tx.amount > 0 ? 'text-emerald-500' : 'text-foreground'
                          }`}>
                            {tx.amount > 0 ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: TRANSACTIONS */}
          {activeTab === 'transactions' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">💳 Transactions</h1>
                  <p className="text-xs text-muted-foreground">Manage and track your income & expenses</p>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-violet-600/30 hover:bg-violet-700 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Transaction</span>
                </button>
              </div>

              {/* Transactions Table Panel */}
              <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Filter by name or category..."
                      className="w-full rounded-xl border border-border bg-muted/40 pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500 transition-all"
                    />
                  </div>
                  <CustomSelect
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    options={[
                      { value: 'All', label: 'All Categories', icon: '🔍' },
                      { value: 'Groceries', label: 'Groceries', icon: '🛒' },
                      { value: 'Technology', label: 'Technology', icon: '💻' },
                      { value: 'Entertainment', label: 'Entertainment', icon: '🎬' },
                      { value: 'Transport', label: 'Transport', icon: '🚗' },
                      { value: 'Income', label: 'Income', icon: '💰' },
                    ]}
                    className="w-full sm:w-48"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="py-3.5 px-4">Transaction</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-xs font-medium">
                      {transactions
                        .filter(t => 
                          (categoryFilter === 'All' || t.category === categoryFilter) &&
                          (t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase()))
                        )
                        .map((tx) => (
                          <tr key={tx.id} className="hover:bg-muted/50 transition-colors">
                            <td className="py-3.5 px-4 flex items-center gap-3">
                              <span className="text-lg">{tx.icon}</span>
                              <span className="font-semibold text-foreground">{tx.name}</span>
                            </td>
                            <td className="py-3.5 px-4 text-muted-foreground">{tx.category}</td>
                            <td className="py-3.5 px-4 text-muted-foreground">{tx.date}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                tx.status === 'Completed'
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              }`}>
                                {tx.status}
                              </span>
                            </td>
                            <td className={`py-3.5 px-4 text-right font-bold ${
                              tx.amount > 0 ? 'text-emerald-500' : 'text-foreground'
                            }`}>
                              {tx.amount > 0 ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BUDGETS */}
          {activeTab === 'budgets' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">🎯 Budgets & Limits</h1>
                <p className="text-xs text-muted-foreground">Keep your spending on track with custom target caps</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { category: 'Housing & Utilities', spent: 1200, limit: 1500, color: 'bg-violet-600', icon: '🏠' },
                  { category: 'Groceries & Dining', spent: 680, limit: 800, color: 'bg-indigo-600', icon: '🛒' },
                  { category: 'Entertainment & Shopping', spent: 340, limit: 400, color: 'bg-amber-500', icon: '🎬' },
                  { category: 'Transport & Travel', spent: 210, limit: 300, color: 'bg-emerald-500', icon: '🚗' },
                ].map((b, idx) => {
                  const pct = Math.min(100, Math.round((b.spent / b.limit) * 100));
                  return (
                    <div key={idx} className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{b.icon}</span>
                          <div>
                            <h3 className="text-base font-bold text-foreground">{b.category}</h3>
                            <span className="text-xs text-muted-foreground">${b.limit - b.spent} remaining</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-muted border border-border">
                          {pct}% Used
                        </span>
                      </div>

                      <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
                        <div style={{ width: `${pct}%` }} className={`h-full ${b.color} rounded-full transition-all duration-500`} />
                      </div>

                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-foreground">${b.spent.toLocaleString()} spent</span>
                        <span className="text-muted-foreground">${b.limit.toLocaleString()} limit</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">📈 Spending Analytics</h1>
                <p className="text-xs text-muted-foreground">Deep dive visual insights into your cash flow trends</p>
              </div>

              <div className="p-8 rounded-3xl border border-border bg-card shadow-sm text-center space-y-6">
                <div className="h-48 w-48 mx-auto rounded-full border-8 border-violet-600 border-t-indigo-500 border-r-amber-500 border-b-rose-500 flex items-center justify-center shadow-inner">
                  <div className="text-center">
                    <span className="text-xs font-medium text-muted-foreground block">Total Spent</span>
                    <span className="text-xl font-extrabold text-foreground">$3,840.50</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold pt-4">
                  <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-300">
                    <span>Housing: 31%</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                    <span>Groceries: 22%</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300">
                    <span>Entertainment: 14%</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300">
                    <span>Others: 33%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AI INSIGHTS */}
          {activeTab === 'ai-insights' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>🤖 AI Financial Insights</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-500 border border-violet-500/30 uppercase font-mono">Powered by Spendzy AI</span>
                </h1>
                <p className="text-xs text-muted-foreground">Automated recommendations generated for your profile</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-600/10 to-indigo-600/10 shadow-sm space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-violet-600 text-white">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-foreground">Recurring Waste Alert</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    We noticed 3 video streaming services billed this month totaling $58. Canceling duplicate services could save you $420 annually.
                  </p>
                </div>

                <div className="p-6 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 shadow-sm space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-emerald-600 text-white">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-foreground">High-Yield Interest Boost</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    By transferring $2,000 from your idle checking account into a 5.0% APY Money Market account, you will earn $100 extra passive income this year.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PREDICTIONS */}
          {activeTab === 'predictions' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">🔮 Predictive Forecasting</h1>
                <p className="text-xs text-muted-foreground">AI-driven projections for your balance at month end</p>
              </div>

              <div className="p-8 rounded-3xl border border-border bg-card shadow-sm space-y-6 text-center">
                <div className="max-w-md mx-auto space-y-2">
                  <span className="text-xs font-semibold text-violet-500 uppercase tracking-widest bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
                    Projected Balance (Aug 31)
                  </span>
                  <h2 className="text-4xl font-extrabold text-foreground tracking-tight">$52,910.00</h2>
                  <p className="text-xs text-emerald-500 font-bold flex items-center justify-center gap-1">
                    <ArrowUpRight className="h-4 w-4" />
                    <span>+$4,660 net increase predicted</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: AI ASSISTANT */}
          {activeTab === 'ai-assistant' && (
            <div className="h-[calc(100vh-8rem)] flex flex-col rounded-3xl border border-border bg-card shadow-sm overflow-hidden animate-in fade-in duration-300">
              {/* Header */}
              <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Spendzy AI Assistant</h2>
                  <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active & ready
                  </span>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      msg.sender === 'user'
                        ? 'bg-violet-600 text-white'
                        : 'bg-muted text-foreground border border-border'
                    }`}>
                      {msg.sender === 'user' ? 'AM' : '🤖'}
                    </div>
                    <div className={`p-4 rounded-2xl max-w-md text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-violet-600 text-white rounded-tr-none shadow-md'
                        : 'bg-muted/80 text-foreground border border-border rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChatMessage} className="p-4 border-t border-border bg-card flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Spendzy AI anything about your money flow..."
                  className="flex-1 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-bold shadow-md hover:bg-violet-700 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>Send</span>
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 8: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-3xl animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">⚙ Settings & Preferences</h1>
                <p className="text-xs text-muted-foreground">Manage your Spendzy dashboard configuration</p>
              </div>

              <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Theme Mode</h3>
                    <p className="text-xs text-muted-foreground">Toggle between Light and Dark interface mode</p>
                  </div>
                  <button
                    onClick={onToggleMode}
                    className="px-4 py-2 rounded-xl border border-border bg-muted text-xs font-semibold text-foreground hover:bg-muted/80 cursor-pointer"
                  >
                    Switch to {mode === 'dark' ? 'Light' : 'Dark'}
                  </button>
                </div>

                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Currency Preference</h3>
                    <p className="text-xs text-muted-foreground">Display currency symbol across dashboard</p>
                  </div>
                  <CustomSelect
                    value={currency}
                    onChange={setCurrency}
                    options={[
                      { value: 'USD', label: 'USD ($)', icon: '💵' },
                      { value: 'EUR', label: 'EUR (€)', icon: '💶' },
                      { value: 'INR', label: 'INR (₹)', icon: '₹' },
                      { value: 'GBP', label: 'GBP (£)', icon: '💷' },
                    ]}
                    className="w-36"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Exit Dashboard</h3>
                    <p className="text-xs text-muted-foreground">Return back to home landing page</p>
                  </div>
                  <button
                    onClick={onExitDashboard}
                    className="px-4 py-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold hover:bg-destructive/20 transition-colors cursor-pointer"
                  >
                    Exit to Landing
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 z-10 text-foreground">
            <h3 className="text-lg font-bold text-foreground">Add New Transaction</h3>
            
            <form onSubmit={handleAddTransaction} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTx.name}
                  onChange={(e) => setNewTx({ ...newTx, name: e.target.value })}
                  placeholder="e.g. Grocery Store"
                  className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newTx.amount}
                  onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Type</label>
                  <CustomSelect
                    value={newTx.type}
                    onChange={(val) => setNewTx({ ...newTx, type: val })}
                    options={[
                      { value: 'expense', label: 'Expense', icon: '💸' },
                      { value: 'income', label: 'Income', icon: '💰' },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Category</label>
                  <CustomSelect
                    value={newTx.category}
                    onChange={(val) => setNewTx({ ...newTx, category: val })}
                    options={[
                      { value: 'Groceries', label: 'Groceries', icon: '🛒' },
                      { value: 'Technology', label: 'Technology', icon: '💻' },
                      { value: 'Entertainment', label: 'Entertainment', icon: '🎬' },
                      { value: 'Transport', label: 'Transport', icon: '🚗' },
                      { value: 'Income', label: 'Income', icon: '💰' },
                    ]}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold shadow-md hover:bg-violet-700"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
