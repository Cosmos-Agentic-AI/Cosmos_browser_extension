type IconProps = { size?: number; className?: string };
const def = (size = 16) => ({ width: size, height: size, viewBox: "0 0 16 16", fill: "none" });

export function IconChat({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-3 2v-2H3a1 1 0 0 1-1-1V3Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}

export function IconWorkflows({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <circle cx="3" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="13" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="8" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M4.5 3h7M3 4.5v3l5 4 5-4V4.5" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}

export function IconHistory({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSettings({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.95 3.05l-1.06 1.06M4.11 11.89l-1.06 1.06M12.95 12.95l-1.06-1.06M4.11 4.11 3.05 3.05" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function IconSend({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <path d="M13.5 2.5 2 7.5l5 1.5 1.5 5 5-11.5Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
      <path d="M7 9.5l3-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function IconStop({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export function IconSparkle({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <path d="M8 1 9.2 6.8 15 8l-5.8 1.2L8 15 6.8 9.2 1 8l5.8-1.2L8 1Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" fill="currentColor" fillOpacity="0.1" />
    </svg>
  );
}

export function IconCheck({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <path d="M3 8.5 6.5 12 13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconX({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconCopy({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <rect x="6" y="6" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.25" />
      <path d="M4 10H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export function IconTrash({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <path d="M2.5 4h11M6 4V2.5h4V4M5.5 4l.5 9h4l.5-9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPlay({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <path d="M5 3l9 5-9 5V3Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

export function IconBrain({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <path d="M6 2.5A3.5 3.5 0 0 0 2.5 6a3 3 0 0 0 .5 1.7A3.5 3.5 0 0 0 6 13.5h4a3.5 3.5 0 0 0 3-5.8 3 3 0 0 0 .5-1.7A3.5 3.5 0 0 0 10 2.5" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <path d="M8 2.5v11M6 6.5h4M6 9.5h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function IconChevronDown({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChevronRight({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSpinner({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`animate-spin-slow ${className ?? ""}`}>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2" />
      <path d="M8 2.5A5.5 5.5 0 0 1 13.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconDot({ size = 8, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" fill="none" className={className}>
      <circle cx="4" cy="4" r="3" fill="currentColor" />
    </svg>
  );
}

export function IconClock({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 5.5V8l2 1.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLink({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l1.5-1.5a3.5 3.5 0 0 0-5-5L6.5 4.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M9.5 6.5a3.5 3.5 0 0 0-5 0L3 8a3.5 3.5 0 0 0 5 5L9.5 11.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function IconVariable({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <path d="M3 3h2l3 10 3-10h2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 7.5h12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeDasharray="2 2" />
    </svg>
  );
}

export function IconExport({ size, className }: IconProps) {
  return (
    <svg {...def(size)} className={className}>
      <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11v1.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}
