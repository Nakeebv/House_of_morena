export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.5 25.5 11 6.5l5 13.2 5-13.2 6.5 19"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="25.5" r="2.4" fill="currentColor" />
    </svg>
  );
}

export function Logo({
  className = "",
  tone = "ink",
  withTagline = false,
}: {
  className?: string;
  tone?: "ink" | "paper";
  withTagline?: boolean;
}) {
  const color = tone === "ink" ? "text-ink" : "text-white";
  return (
    <span className={`inline-flex items-center gap-2.5 ${color} ${className}`}>
      <LogoMark className="h-[22px] w-[22px] shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-[0.24em]">MORENA</span>
        {withTagline ? (
          <span className="mt-[3px] text-[8.5px] font-medium tracking-[0.34em] opacity-55">
            COLLECTION
          </span>
        ) : null}
      </span>
    </span>
  );
}
