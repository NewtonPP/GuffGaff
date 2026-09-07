const Logo = ({ className = "", showWord = true }) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-sage-600">
      <svg viewBox="0 0 64 64" className="h-[1.15rem] w-[1.15rem]" aria-hidden="true">
        <path
          fill="#fdfbf7"
          d="M32 13c-10.5 0-19 6.7-19 15 0 4.8 2.9 9.1 7.4 11.8-.5 2.6-1.8 5-3.7 6.9 3.6-.4 7-1.8 9.8-3.9 1.8.4 3.6.6 5.5.6 10.5 0 19-6.7 19-15S42.5 13 32 13Z"
        />
        <circle cx="24.5" cy="28" r="2.7" fill="#4d6941" />
        <circle cx="32" cy="28" r="2.7" fill="#4d6941" />
        <circle cx="39.5" cy="28" r="2.7" fill="#4d6941" />
      </svg>
    </span>
    {showWord && (
      <span className="font-display text-[1.3rem] font-extrabold tracking-[-0.03em] text-graphite-900">
        Guffgaff
      </span>
    )}
  </span>
);

export default Logo;
