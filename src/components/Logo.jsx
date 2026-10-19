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
      <path d="M10 8.5h11.5v10.1c0 4.55-2.48 7.15-6.63 7.15-2.25 0-4.18-.82-5.37-2.42l2.77-2.26c.7.87 1.5 1.31 2.48 1.31 1.72 0 2.7-1.18 2.7-3.78v-6.74H10V8.5Z" fill="white" />
      <path d="m24.7 7.1-3.2 5.55" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function LogoFull({ className, wordmark = 'Open Resume' }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Logo size={30} className="text-foreground" />
      <span className="whitespace-nowrap text-xl font-bold tracking-[-0.045em] text-foreground">
        {wordmark === 'JustCV' ? <>Just<span className="text-primary">CV</span></> : wordmark}
      </span>
    </span>
  );
}
