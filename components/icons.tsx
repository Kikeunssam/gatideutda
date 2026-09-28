export function Icon({
  kind = "listen",
  size = 32,
}: {
  kind?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "listen" ? (
        <>
          <path d="M5 19v-4a11 11 0 0 1 22 0v4" />
          <rect x="4" y="16" width="6" height="11" rx="3" />
          <rect x="22" y="16" width="6" height="11" rx="3" />
          <path d="M16 11v10m0-10 4-1" />
          <circle cx="14" cy="22" r="2" />
        </>
      ) : kind === "think" ? (
        <>
          <path d="M11 23c0-4-5-5-5-11a10 10 0 0 1 20 0c0 6-5 7-5 11zM12 27h8M14 30h4M16 22v-8m-4-3 4 3 4-3" />
        </>
      ) : kind === "share" ? (
        <>
          <path d="M25 16V8a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v10a4 4 0 0 0 4 4h2v5l6-5h6" />
          <path d="M21 12h4a4 4 0 0 1 4 4v12l-5-4h-5a4 4 0 0 1-4-4v-3M9 11h10M9 16h3" />
        </>
      ) : (
        <>
          <path d="M4 13v6m5-12v18m5-15v12m5-18v24m5-18v12m5-9v6" />
        </>
      )}
    </svg>
  );
}
