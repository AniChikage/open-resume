export function TemplateThumbnail({ accent = '#8b63f6', variant = 'classic', className = '' }) {
  if (variant === 'rose') {
    return (
      <svg viewBox="0 0 210 297" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="210" height="297" fill="#fff" />
        <rect x="0" y="0" width="210" height="52" fill={accent} opacity="0.9" />
        <circle cx="30" cy="26" r="14" fill="#fff" opacity="0.3" />
        <rect x="52" y="16" width="60" height="6" rx="2" fill="#fff" opacity="0.9" />
        <rect x="52" y="26" width="90" height="3" rx="1" fill="#fff" opacity="0.5" />
        <rect x="52" y="33" width="70" height="3" rx="1" fill="#fff" opacity="0.5" />
        <rect x="16" y="64" width="40" height="4" rx="1" fill={accent} />
        <rect x="16" y="74" width="178" height="2" rx="1" fill="#e2e8f0" />
        <rect x="16" y="82" width="160" height="3" rx="1" fill="#cbd5e1" />
        <rect x="16" y="89" width="140" height="3" rx="1" fill="#e2e8f0" />
        <rect x="16" y="96" width="170" height="3" rx="1" fill="#e2e8f0" />
        <rect x="16" y="112" width="50" height="4" rx="1" fill={accent} />
        <rect x="16" y="122" width="178" height="2" rx="1" fill="#e2e8f0" />
        <rect x="16" y="130" width="80" height="3" rx="1" fill="#94a3b8" />
        <rect x="16" y="137" width="160" height="3" rx="1" fill="#e2e8f0" />
        <rect x="16" y="144" width="140" height="3" rx="1" fill="#e2e8f0" />
        <rect x="16" y="151" width="170" height="3" rx="1" fill="#e2e8f0" />
        <rect x="16" y="158" width="130" height="3" rx="1" fill="#e2e8f0" />
        <rect x="16" y="174" width="80" height="3" rx="1" fill="#94a3b8" />
        <rect x="16" y="181" width="150" height="3" rx="1" fill="#e2e8f0" />
        <rect x="16" y="188" width="170" height="3" rx="1" fill="#e2e8f0" />
        <rect x="16" y="204" width="50" height="4" rx="1" fill={accent} />
        <rect x="16" y="214" width="178" height="2" rx="1" fill="#e2e8f0" />
        {[0,1,2,3].map((i) => (
          <rect key={i} x={16 + i * 40} y="222" width="32" height="10" rx="4" fill={accent} opacity="0.12" />
        ))}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 210 297" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="210" height="297" fill="#fff" />
      <rect x="16" y="16" width="70" height="7" rx="2" fill="#1e293b" />
      <rect x="16" y="27" width="120" height="3" rx="1" fill="#94a3b8" />
      <rect x="16" y="34" width="90" height="3" rx="1" fill="#94a3b8" />
      <circle cx="180" cy="26" r="14" fill="#f1f5f9" stroke={accent} strokeWidth="1.5" />
      <rect x="16" y="46" width="178" height="1.5" fill={accent} />
      <rect x="16" y="58" width="44" height="4" rx="1" fill={accent} />
      <rect x="16" y="67" width="178" height="1" fill={accent} opacity="0.3" />
      <rect x="16" y="74" width="160" height="3" rx="1" fill="#cbd5e1" />
      <rect x="16" y="81" width="140" height="3" rx="1" fill="#e2e8f0" />
      <rect x="16" y="88" width="170" height="3" rx="1" fill="#e2e8f0" />
      <rect x="16" y="95" width="120" height="3" rx="1" fill="#e2e8f0" />
      <rect x="16" y="110" width="50" height="4" rx="1" fill={accent} />
      <rect x="16" y="119" width="178" height="1" fill={accent} opacity="0.3" />
      <rect x="16" y="126" width="90" height="3.5" rx="1" fill="#334155" />
      <rect x="140" y="126" width="54" height="3" rx="1" fill="#94a3b8" />
      <rect x="16" y="133" width="70" height="3" rx="1" fill="#64748b" />
      <rect x="22" y="141" width="160" height="3" rx="1" fill="#e2e8f0" />
      <rect x="22" y="148" width="140" height="3" rx="1" fill="#e2e8f0" />
      <rect x="22" y="155" width="155" height="3" rx="1" fill="#e2e8f0" />
      <rect x="16" y="168" width="85" height="3.5" rx="1" fill="#334155" />
      <rect x="140" y="168" width="54" height="3" rx="1" fill="#94a3b8" />
      <rect x="16" y="175" width="65" height="3" rx="1" fill="#64748b" />
      <rect x="22" y="183" width="150" height="3" rx="1" fill="#e2e8f0" />
      <rect x="22" y="190" width="165" height="3" rx="1" fill="#e2e8f0" />
      <rect x="22" y="197" width="130" height="3" rx="1" fill="#e2e8f0" />
      <rect x="16" y="212" width="40" height="4" rx="1" fill={accent} />
      <rect x="16" y="221" width="178" height="1" fill={accent} opacity="0.3" />
      {[0,1,2,3,4].map((i) => (
        <rect key={i} x={16 + i * 36} y="228" width="30" height="9" rx="4" fill={accent} opacity="0.1" />
      ))}
      <rect x="16" y="248" width="44" height="4" rx="1" fill={accent} />
      <rect x="16" y="257" width="178" height="1" fill={accent} opacity="0.3" />
      <rect x="16" y="264" width="170" height="3" rx="1" fill="#e2e8f0" />
      <rect x="16" y="271" width="150" height="3" rx="1" fill="#e2e8f0" />
    </svg>
  );
}
