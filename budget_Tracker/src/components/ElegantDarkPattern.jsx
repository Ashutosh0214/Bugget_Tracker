import React from 'react';

/**
 * Elegant Dark Pattern Component
 * Source: https://21st.dev/@jatin-yadav05/components/elegant-dark-pattern
 * By @jatin-yadav05 (Jatin Yadav)
 * Sophisticated gradients meet subtle textures for modern interfaces.
 */

export const THEME_PRESETS = {
  violet: {
    radial: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(120,119,198,0.25), rgba(255,255,255,0))',
    glowClass: 'from-purple-600/25 via-indigo-600/15 to-transparent',
    accentText: 'from-violet-300 via-purple-400 to-indigo-300',
    accentBtn: 'from-violet-600 via-purple-600 to-indigo-600 shadow-violet-600/30 hover:shadow-violet-600/50',
    badgeBorder: 'border-violet-500/30 bg-violet-950/40 text-violet-300',
  },
  emerald: {
    radial: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(16,185,129,0.25), rgba(255,255,255,0))',
    glowClass: 'from-emerald-600/25 via-teal-600/15 to-transparent',
    accentText: 'from-emerald-300 via-teal-400 to-green-300',
    accentBtn: 'from-emerald-600 via-teal-600 to-green-600 shadow-emerald-600/30 hover:shadow-emerald-600/50',
    badgeBorder: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300',
  },
  cyan: {
    radial: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(6,182,212,0.25), rgba(255,255,255,0))',
    glowClass: 'from-cyan-600/25 via-blue-600/15 to-transparent',
    accentText: 'from-cyan-300 via-sky-400 to-blue-300',
    accentBtn: 'from-cyan-600 via-sky-600 to-blue-600 shadow-cyan-600/30 hover:shadow-cyan-600/50',
    badgeBorder: 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300',
  },
  amber: {
    radial: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(245,158,11,0.25), rgba(255,255,255,0))',
    glowClass: 'from-amber-600/25 via-orange-600/15 to-transparent',
    accentText: 'from-amber-300 via-orange-400 to-yellow-300',
    accentBtn: 'from-amber-600 via-orange-600 to-yellow-600 shadow-amber-600/30 hover:shadow-amber-600/50',
    badgeBorder: 'border-amber-500/30 bg-amber-950/40 text-amber-300',
  },
  rose: {
    radial: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(244,63,94,0.25), rgba(255,255,255,0))',
    glowClass: 'from-rose-600/25 via-pink-600/15 to-transparent',
    accentText: 'from-rose-300 via-pink-400 to-red-300',
    accentBtn: 'from-rose-600 via-pink-600 to-red-600 shadow-rose-600/30 hover:shadow-rose-600/50',
    badgeBorder: 'border-rose-500/30 bg-rose-950/40 text-rose-300',
  },
  obsidian: {
    radial: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(255,255,255,0.15), rgba(255,255,255,0))',
    glowClass: 'from-zinc-500/20 via-slate-600/10 to-transparent',
    accentText: 'from-gray-100 via-gray-300 to-gray-400',
    accentBtn: 'from-zinc-700 via-zinc-800 to-zinc-900 shadow-zinc-700/30 hover:shadow-zinc-700/50',
    badgeBorder: 'border-zinc-500/30 bg-zinc-900/60 text-zinc-300',
  }
};

export function DarkGradientBg({ children, className = '', activeTheme = 'violet' }) {
  const currentTheme = THEME_PRESETS[activeTheme] || THEME_PRESETS.violet;

  return (
    <div className={`relative min-h-screen w-full overflow-hidden bg-zinc-950 text-white ${className}`}>
      {/* Deep Dark Base Gradient */}
      <div 
        className="absolute inset-0 -z-10 h-full w-full bg-zinc-950 transition-all duration-700 pointer-events-none"
        style={{ background: currentTheme.radial }}
      />

      {/* Elegant Ambient Soft Glow */}
      <div 
        className={`absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[600px] w-[950px] rounded-full bg-gradient-to-tr ${currentTheme.glowClass} blur-[130px] transition-all duration-700 pointer-events-none`}
      />

      {/* Geometric Micro-Texture Grid Overlay */}
      <div 
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808015_1px,transparent_1px),linear-gradient(to_bottom,#80808015_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"
      />

      {/* Children Layer */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}

/**
 * Background Layer Component for section-level backgrounds
 */
export default function BackgroundElegantDarkPattern({ activeTheme = 'violet' }) {
  const currentTheme = THEME_PRESETS[activeTheme] || THEME_PRESETS.violet;

  return (
    <>
      {/* Deep Dark Base Radial Gradient */}
      <div 
        className="absolute inset-0 -z-10 h-full w-full bg-zinc-950 transition-all duration-700 pointer-events-none"
        style={{ background: currentTheme.radial }}
      />

      {/* Elegant Ambient Soft Glow */}
      <div 
        className={`absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[600px] w-[950px] rounded-full bg-gradient-to-tr ${currentTheme.glowClass} blur-[130px] transition-all duration-700 pointer-events-none`}
      />

      {/* Sophisticated Geometric Micro-Texture Grid */}
      <div 
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808015_1px,transparent_1px),linear-gradient(to_bottom,#80808015_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"
      />
    </>
  );
}
