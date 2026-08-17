import React from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  Target, 
  TrendingUp, 
  Sparkles, 
  Wand2, 
  MessageSquare, 
  Settings, 
  Wallet,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  User
} from 'lucide-react';

export const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, emoji: '📊' },
  { id: 'transactions', label: 'Transactions', icon: CreditCard, emoji: '💳' },
  { id: 'budgets', label: 'Budgets', icon: Target, emoji: '🎯' },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, emoji: '📈' },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles, emoji: '🤖', badge: 'AI' },
  { id: 'predictions', label: 'Predictions', icon: Wand2, emoji: '🔮' },
  { id: 'ai-assistant', label: 'AI Assistant', icon: MessageSquare, emoji: '💬', badge: 'New' },
];

export default function Sidebar({ 
  activeTab = 'dashboard', 
  onSelectTab, 
  collapsed = false, 
  onToggleCollapse,
  mode = 'light',
  onToggleMode,
  onExitDashboard
}) {
  return (
    <aside 
      className={`relative flex flex-col h-screen bg-card border-r border-border transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        <a 
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (onSelectTab) onSelectTab('dashboard');
          }} 
          className="flex items-center gap-3 overflow-hidden cursor-pointer group"
        >
          <div className="flex shrink-0 h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 shadow-md shadow-violet-500/25 group-hover:scale-105 transition-transform">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-wider text-foreground flex items-center gap-0.5 font-mono uppercase">
                SPEND<span className="text-violet-500">ZY</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest -mt-1">
                Finance OS
              </span>
            </div>
          )}
        </a>

        {/* Collapse Sidebar Toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab && onSelectTab(item.id)}
              title={collapsed ? `${item.emoji} ${item.label}` : undefined}
              className={`relative flex items-center w-full gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 font-bold'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
              )}

              <span className="text-base shrink-0">{item.emoji}</span>

              {!collapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}

              {!collapsed && item.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : 'bg-violet-500/15 text-violet-600 dark:text-violet-300 border border-violet-500/30'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Divider */}
        <div className="my-3 border-t border-border/80" />

        {/* Settings Item */}
        <button
          onClick={() => onSelectTab && onSelectTab('settings')}
          title={collapsed ? '⚙ Settings' : undefined}
          className={`relative flex items-center w-full gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 font-bold'
              : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          } ${collapsed ? 'justify-center px-0' : ''}`}
        >
          {activeTab === 'settings' && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
          )}
          <span className="text-base shrink-0">⚙</span>
          {!collapsed && <span className="truncate text-left">Settings</span>}
        </button>
      </div>

      {/* Footer User & Controls */}
      <div className="p-3 border-t border-border space-y-2">
        {/* Mode Switcher */}
        <button
          onClick={onToggleMode}
          className={`flex items-center w-full gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {mode === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400 shrink-0" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-600 shrink-0" />
          )}
          {!collapsed && <span>{mode === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>}
        </button>

        {/* User Info / Exit */}
        <div className={`flex items-center gap-3 p-2 rounded-xl bg-muted/40 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-lg bg-violet-600/20 text-violet-500 flex items-center justify-center font-bold text-xs shrink-0 border border-violet-500/30">
              AM
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-foreground truncate">Alex Morgan</span>
                <span className="text-[10px] text-muted-foreground truncate">Pro Member</span>
              </div>
            )}
          </div>

          {!collapsed && onExitDashboard && (
            <button
              onClick={onExitDashboard}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              title="Return to Home Landing"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
