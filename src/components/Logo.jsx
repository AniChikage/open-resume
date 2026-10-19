import { cn } from '../lib/utils.js';

export function Logo({ className, size = 30 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="1" y="1" width="30" height="30" rx="8" fill="currentColor" />
      <path d="M10 7.5h8l4 4V24H10V7.5Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M18 7.5v4h4M13.5 16h5M13.5 20h5" stroke="#C4B5FD" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LogoFull({ className }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Logo size={30} className="text-foreground" />
      <span className="whitespace-nowrap text-xl font-bold tracking-[-0.045em] text-foreground">
        Open Resume
      </span>
    </span>
  );
}
