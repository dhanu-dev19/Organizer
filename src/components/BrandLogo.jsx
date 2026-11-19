import React, { useId } from 'react';

export default function BrandLogo({ className = 'w-9 h-9' }) {
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LinkStack Logo"
    >
      <defs>
        {/* Deep Navy Background */}
        <linearGradient id={`${uid}-bg`} x1="15" y1="10" x2="105" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0B132B" />
          <stop offset="100%" stopColor="#050914" />
        </linearGradient>

        {/* Bottom Layer: Purple / Violet */}
        <linearGradient id={`${uid}-purple-top`} x1="30" y1="68" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
        <linearGradient id={`${uid}-purple-edge`} x1="26" y1="80" x2="94" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5B21B6" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>

        {/* Middle Layer: Cyan / Electric Blue */}
        <linearGradient id={`${uid}-blue-top`} x1="30" y1="48" x2="90" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id={`${uid}-blue-edge`} x1="26" y1="60" x2="94" y2="76" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0369A1" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        {/* Top Layer: Crisp White with Soft Cool Shading */}
        <linearGradient id={`${uid}-white-top`} x1="30" y1="24" x2="90" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id={`${uid}-white-edge`} x1="26" y1="40" x2="94" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>

        {/* Soft Drop Shadow Between Layers */}
        <filter id={`${uid}-shadow`} x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#020617" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* Rounded App Icon Squircle */}
      <rect x="4" y="4" width="112" height="112" rx="28" fill={`url(#${uid}-bg)`} />
      <rect
        x="4.75"
        y="4.75"
        width="110.5"
        height="110.5"
        rx="27.25"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1.5"
      />

      {/* LAYER 1 (Bottom): Purple Tile */}
      <g filter={`url(#${uid}-shadow)`}>
        {/* 3D Thickness / Side Bevel */}
        <path
          d="M27 77.5V82.5C27 84.3 28.1 85.9 29.8 86.7L56.5 99.1C58.7 100.1 61.3 100.1 63.5 99.1L90.2 86.7C91.9 85.9 93 84.3 93 82.5V77.5L60 92.5L27 77.5Z"
          fill={`url(#${uid}-purple-edge)`}
        />
        {/* Top Diamond Face */}
        <path
          d="M56.5 61.9C58.7 60.9 61.3 60.9 63.5 61.9L90.2 74.3C93.6 75.9 93.6 80.6 90.2 82.2L63.5 94.6C61.3 95.6 58.7 95.6 56.5 94.6L29.8 82.2C26.4 80.6 26.4 75.9 29.8 74.3L56.5 61.9Z"
          fill={`url(#${uid}-purple-top)`}
        />
      </g>

      {/* LAYER 2 (Middle): Blue Tile */}
      <g filter={`url(#${uid}-shadow)`}>
        {/* 3D Thickness / Side Bevel */}
        <path
          d="M27 58.5V63.5C27 65.3 28.1 66.9 29.8 67.7L56.5 80.1C58.7 81.1 61.3 81.1 63.5 80.1L90.2 67.7C91.9 66.9 93 65.3 93 63.5V58.5L60 73.5L27 58.5Z"
          fill={`url(#${uid}-blue-edge)`}
        />
        {/* Top Diamond Face */}
        <path
          d="M56.5 42.9C58.7 41.9 61.3 41.9 63.5 42.9L90.2 55.3C93.6 56.9 93.6 61.6 90.2 63.2L63.5 75.6C61.3 76.6 58.7 76.6 56.5 75.6L29.8 63.2C26.4 61.6 26.4 56.9 29.8 55.3L56.5 42.9Z"
          fill={`url(#${uid}-blue-top)`}
        />
      </g>

      {/* LAYER 3 (Top): White Tile */}
      <g filter={`url(#${uid}-shadow)`}>
        {/* 3D Thickness / Side Bevel */}
        <path
          d="M27 39.5V44.5C27 46.3 28.1 47.9 29.8 48.7L56.5 61.1C58.7 62.1 61.3 62.1 63.5 61.1L90.2 48.7C91.9 47.9 93 46.3 93 44.5V39.5L60 54.5L27 39.5Z"
          fill={`url(#${uid}-white-edge)`}
        />
        {/* Top Diamond Face */}
        <path
          d="M56.5 23.9C58.7 22.9 61.3 22.9 63.5 23.9L90.2 36.3C93.6 37.9 93.6 42.6 90.2 44.2L63.5 56.6C61.3 57.6 58.7 57.6 56.5 56.6L29.8 44.2C26.4 42.6 26.4 37.9 29.8 36.3L56.5 23.9Z"
          fill={`url(#${uid}-white-top)`}
        />
      </g>
    </svg>
  );
}