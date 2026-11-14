import React from 'react';

interface BrandLogoProps {
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  inverted?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  showTagline = false,
  size = 'md',
  inverted = false,
  className = '',
}) => {
  const iconSize = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-14 w-14' : 'h-10 w-10';
  const titleSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-xl';
  const taglineSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        viewBox="0 0 120 150"
        className={`${iconSize} shrink-0`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="dnaHelixGrad" x1="18" y1="15" x2="102" y2="135" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={inverted ? '#38BDF8' : '#0B2246'} />
            <stop offset="52%" stopColor={inverted ? '#2DD4BF' : '#0E6BA8'} />
            <stop offset="100%" stopColor={inverted ? '#5EEAD4' : '#0D9488'} />
          </linearGradient>
        </defs>

        {/* Top fingerprint concentric arcs */}
        <path d="M44 26C52 17 68 17 76 26" stroke="url(#dnaHelixGrad)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M48 33C54 26 66 26 72 33" stroke="url(#dnaHelixGrad)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M53 39C57 35 63 35 67 39" stroke="url(#dnaHelixGrad)" strokeWidth="2.5" strokeLinecap="round" />

        {/* Bottom fingerprint concentric arcs */}
        <path d="M44 124C52 133 68 133 76 124" stroke="url(#dnaHelixGrad)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M48 117C54 124 66 124 72 117" stroke="url(#dnaHelixGrad)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M53 111C57 115 63 115 67 111" stroke="url(#dnaHelixGrad)" strokeWidth="2.5" strokeLinecap="round" />

        {/* Double Helix Ribbons */}
        <path
          d="M32 14C32 42 88 52 88 75C88 98 32 108 32 136"
          stroke="url(#dnaHelixGrad)"
          strokeWidth="6.5"
          strokeLinecap="round"
        />
        <path
          d="M88 14C88 42 32 52 32 75C32 98 88 108 88 136"
          stroke="url(#dnaHelixGrad)"
          strokeWidth="6.5"
          strokeLinecap="round"
        />

        {/* Central Nucleus Sphere */}
        <circle cx="60" cy="75" r="11" fill="url(#dnaHelixGrad)" />
        <circle cx="56.5" cy="71.5" r="2.6" fill="#FFFFFF" fillOpacity="0.65" />

        {/* Flanking Molecular Bond Nodes */}
        <line x1="22" y1="54" x2="15" y2="62" stroke="url(#dnaHelixGrad)" strokeWidth="2" />
        <line x1="22" y1="54" x2="29" y2="60" stroke="url(#dnaHelixGrad)" strokeWidth="2" />
        <circle cx="22" cy="54" r="3" fill="url(#dnaHelixGrad)" />
        <circle cx="15" cy="62" r="2.5" fill="url(#dnaHelixGrad)" />

        <line x1="98" y1="54" x2="105" y2="62" stroke="url(#dnaHelixGrad)" strokeWidth="2" />
        <line x1="98" y1="54" x2="91" y2="60" stroke="url(#dnaHelixGrad)" strokeWidth="2" />
        <circle cx="98" cy="54" r="3" fill="url(#dnaHelixGrad)" />
        <circle cx="105" cy="62" r="2.5" fill="url(#dnaHelixGrad)" />

        <line x1="22" y1="96" x2="15" y2="88" stroke="url(#dnaHelixGrad)" strokeWidth="2" />
        <circle cx="22" cy="96" r="3" fill="url(#dnaHelixGrad)" />
        <circle cx="15" cy="88" r="2.5" fill="url(#dnaHelixGrad)" />

        <line x1="98" y1="96" x2="105" y2="88" stroke="url(#dnaHelixGrad)" strokeWidth="2" />
        <circle cx="98" cy="96" r="3" fill="url(#dnaHelixGrad)" />
        <circle cx="105" cy="88" r="2.5" fill="url(#dnaHelixGrad)" />
      </svg>

      <div className="flex flex-col leading-none">
        <span className={`font-display font-extrabold tracking-tight whitespace-nowrap ${titleSize}`}>
          <span className={inverted ? 'text-white' : 'text-[#0B2246]'}>DNA </span>
          <span className={inverted ? 'text-teal-300' : 'text-[#0D9488]'}>GENEIE</span>
        </span>
        {showTagline && (
          <span
            className={`mt-1 font-medium tracking-wide whitespace-nowrap ${taglineSize} ${
              inverted ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            Wellness from within
          </span>
        )}
      </div>
    </div>
  );
};

export const UsaFlagIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-4' }) => (
  <svg viewBox="0 0 36 24" className={`${className} rounded-[2px] border border-slate-200 shrink-0`} aria-label="United States Flag">
    <rect width="36" height="24" fill="#FFFFFF" />
    <rect y="0" width="36" height="1.85" fill="#B22234" />
    <rect y="3.7" width="36" height="1.85" fill="#B22234" />
    <rect y="7.4" width="36" height="1.85" fill="#B22234" />
    <rect y="11.1" width="36" height="1.85" fill="#B22234" />
    <rect y="14.8" width="36" height="1.85" fill="#B22234" />
    <rect y="18.5" width="36" height="1.85" fill="#B22234" />
    <rect y="22.15" width="36" height="1.85" fill="#B22234" />
    <rect width="15" height="12.95" fill="#3C3B6E" />
    <circle cx="3" cy="2.6" r="0.65" fill="#FFFFFF" />
    <circle cx="6" cy="2.6" r="0.65" fill="#FFFFFF" />
    <circle cx="9" cy="2.6" r="0.65" fill="#FFFFFF" />
    <circle cx="12" cy="2.6" r="0.65" fill="#FFFFFF" />
    <circle cx="4.5" cy="5.2" r="0.65" fill="#FFFFFF" />
    <circle cx="7.5" cy="5.2" r="0.65" fill="#FFFFFF" />
    <circle cx="10.5" cy="5.2" r="0.65" fill="#FFFFFF" />
    <circle cx="3" cy="7.8" r="0.65" fill="#FFFFFF" />
    <circle cx="6" cy="7.8" r="0.65" fill="#FFFFFF" />
    <circle cx="9" cy="7.8" r="0.65" fill="#FFFFFF" />
    <circle cx="12" cy="7.8" r="0.65" fill="#FFFFFF" />
    <circle cx="4.5" cy="10.4" r="0.65" fill="#FFFFFF" />
    <circle cx="7.5" cy="10.4" r="0.65" fill="#FFFFFF" />
    <circle cx="10.5" cy="10.4" r="0.65" fill="#FFFFFF" />
  </svg>
);
