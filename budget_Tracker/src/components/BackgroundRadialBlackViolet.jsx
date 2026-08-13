import React from 'react';

/**
 * Background Radial Black-Violet Component
 * Source: https://21st.dev/@ibelick/components/background-snippets/background-radial-black-violet
 * By @ibelick (Julien Thibeaut)
 */
export default function BackgroundRadialBlackViolet() {
  return (
    <div 
      className="absolute inset-0 -z-10 h-full w-full items-center px-5 py-24 [background:radial-gradient(125%_125%_at_50%_10%,#000_40%,#63e_100%)] pointer-events-none"
      style={{ background: 'radial-gradient(125% 125% at 50% 10%, #000 40%, #63e 100%)' }}
    />
  );
}
