import React from 'react';

interface RagCvLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

const RagCvLogo: React.FC<RagCvLogoProps> = ({ 
  size = 44, 
  className = "",
  showText = false,
  textClassName = ""
}) => {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        {/* Background circle with gradient */}
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id="documentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E0E7FF" />
          </linearGradient>
          <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Main background */}
        <rect width="48" height="48" rx="14" fill="url(#bgGradient)" />
        
        {/* Document shape */}
        <path
          d="M14 12C14 10.8954 14.8954 10 16 10H28L34 16V36C34 37.1046 33.1046 38 32 38H16C14.8954 38 14 37.1046 14 36V12Z"
          fill="url(#documentGradient)"
          opacity="0.95"
        />
        
        {/* Document fold corner */}
        <path
          d="M28 10L34 16H30C28.8954 16 28 15.1046 28 14V10Z"
          fill="#C7D2FE"
        />
        
        {/* Text lines on document */}
        <rect x="18" y="20" width="12" height="2" rx="1" fill="#4F46E5" opacity="0.6" />
        <rect x="18" y="25" width="10" height="2" rx="1" fill="#4F46E5" opacity="0.4" />
        <rect x="18" y="30" width="8" height="2" rx="1" fill="#4F46E5" opacity="0.3" />
        
        {/* AI Neural nodes */}
        <circle cx="36" cy="14" r="2.5" fill="#FBBF24" filter="url(#glow)" />
        <circle cx="40" cy="20" r="2" fill="#F59E0B" opacity="0.8" filter="url(#glow)" />
        <circle cx="38" cy="26" r="1.5" fill="#FBBF24" opacity="0.6" filter="url(#glow)" />
        
        {/* Neural connections */}
        <path
          d="M36 14L40 20M40 20L38 26"
          stroke="#FBBF24"
          strokeWidth="0.8"
          strokeOpacity="0.5"
          strokeLinecap="round"
        />
        
        {/* Sparkle accent */}
        <path
          d="M10 8L11 6L12 8L14 9L12 10L11 12L10 10L8 9L10 8Z"
          fill="#FBBF24"
          filter="url(#glow)"
        />
        
        {/* Small decorative dots */}
        <circle cx="8" cy="24" r="1" fill="#FFFFFF" opacity="0.4" />
        <circle cx="42" cy="36" r="1" fill="#FFFFFF" opacity="0.3" />
      </svg>
      
      {showText && (
        <div>
          <h1 className={`text-3xl font-black tracking-tighter gradient-text ${textClassName}`}>
            RAG CV <span className="text-slate-900">Creator</span>
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="h-1 w-12 bg-indigo-600 rounded-full"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Next-Gen Resume Engine
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RagCvLogo;
