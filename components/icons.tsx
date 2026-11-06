// 선 아이콘 (24px 기준). active면 채워진 모양.
type P = { active?: boolean; className?: string };
const base = (active?: boolean) => ({
  viewBox: "0 0 24 24",
  fill: active ? "currentColor" : "none",
  stroke: "currentColor",
  strokeWidth: active ? 0 : 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const HeartIcon = ({ active, className = "h-6 w-6" }: P) => (
  <svg {...base(active)} className={className} aria-hidden>
    <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.8 4 7.3 4c2 0 3.5 1.1 4.7 2.7C13.2 5.1 14.7 4 16.7 4c3.5 0 5.7 3.6 4.5 7.1-1.7 4.8-9.2 9.4-9.2 9.4Z" />
  </svg>
);

export const BellIcon = ({ active, className = "h-6 w-6" }: P) => (
  <svg {...base(active)} className={className} aria-hidden>
    <path d="M6 9.5a6 6 0 1 1 12 0c0 4.2 1.6 6 2.4 6.8H3.6C4.4 15.5 6 13.7 6 9.5Z" />
    <path d="M9.8 19.5a2.3 2.3 0 0 0 4.4 0" fill="none" stroke="currentColor" strokeWidth="1.9" />
  </svg>
);

export const SendIcon = ({ active, className = "h-6 w-6" }: P) => (
  <svg {...base(active)} className={className} aria-hidden>
    <path d="M21.5 3 9.6 14.4M21.5 3l-7.3 18-4.6-6.6L3 9.8 21.5 3Z" />
  </svg>
);

export const IdCardIcon = ({ active, className = "h-6 w-6" }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <rect x="3" y="5" width="18" height="14" rx="3" fill={active ? "currentColor" : "none"} />
    <circle cx="9" cy="11" r="2.2" stroke={active ? "#fff" : "currentColor"} />
    <path d="M5.8 16.2c.6-1.5 1.8-2.3 3.2-2.3s2.6.8 3.2 2.3M14.5 10h3.5M14.5 13.5h2.5" stroke={active ? "#fff" : "currentColor"} />
  </svg>
);

export const GearIcon = ({ active, className = "h-6 w-6" }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <circle cx="12" cy="12" r="3.2" fill={active ? "currentColor" : "none"} />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </svg>
);

export const ChatIcon =({ className = "h-6 w-6" }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M20.5 11.5a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1.4-4.4A8.5 8.5 0 1 1 20.5 11.5Z" />
  </svg>
);

export const CloseIcon = ({ className = "h-5 w-5" }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const ExpandIcon = ({ className = "h-5 w-5" }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
  </svg>
);
