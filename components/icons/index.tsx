import React from 'react';

const iconProps = {
  className: "w-6 h-6",
  strokeWidth: 1.5,
  stroke: "currentColor",
  fill: "none",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const MediaIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" {...iconProps} viewBox="0 0 24 24">
    <path d="M15 8h.01M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
  </svg>
);

export const TextIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" {...iconProps} viewBox="0 0 24 24">
    <path d="M4 7V4h16v3M9 20h6M12 4v16" />
  </svg>
);

export const MusicIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" {...iconProps} viewBox="0 0 24 24">
    <path d="M9 18V5l12-2v13M9 18a3 3 0 100-6 3 3 0 000 6zm12-2a3 3 0 100-6 3 3 0 000 6z" />
  </svg>
);

export const EffectsIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" {...iconProps} viewBox="0 0 24 24">
    <path d="M12 3v2.355m-6.364 1.058L4 8.236m-3 .928H3m1.058 6.364L2.236 17M3 21h2.355m6.364-1.058L13.764 21M21 21h-2.355m-1.058-6.364L17 19.764M21 12h-2m-1.058-6.364L19.764 7M12 18a6 6 0 100-12 6 6 0 000 12z" />
  </svg>
);

export const MagicWandIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" {...iconProps} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104l-1.242 2.484M14.25 20.896l-2.484-1.242m0 0l-2.034-4.068-4.068-2.034 2.034-4.068 4.068-2.034 4.068 2.034 2.034 4.068-4.068 2.034z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 4.5l-2.122 2.121m0 0a3.376 3.376 0 01-4.773 4.773l-2.121 2.121m4.773-4.773l2.121-2.121" />
    </svg>
);

export const ExportIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

export const PlayIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "w-5 h-5"} fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 22V2L21 12L3 22Z"/>
    </svg>
);

export const LargePlayIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5.14v14l11-7-11-7z"></path>
    </svg>
);

export const TransitionIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "w-5 h-5"} viewBox="0 0 20 20" fill="currentColor">
        <path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v10H5V5z" clipRule="evenodd" fillRule="evenodd" opacity="0.4" />
        <path d="M2 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
    </svg>
);