/**
 * Bespoke Hand-Drawn Ink & Gold Leaf SVG Ornament Primitives
 * Used across the VALDRION artisanal editorial cinema & AI Commander Atelier.
 */

export function SketchCorners({
  className = 'text-[#D9A441]/55',
  size = 18,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <>
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={`pointer-events-none absolute right-1.5 top-1.5 ${className}`}
      >
        <path
          d="M21 15C20.8 10 21.1 5.5 20.5 3.5C18.5 2.9 13.8 3.2 9 3.1M17.5 6.5C15 6.3 13 6.5 11.5 6.6"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <circle cx="18.2" cy="5.8" r="1.1" fill="currentColor" />
      </svg>
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={`pointer-events-none absolute left-1.5 top-1.5 ${className}`}
      >
        <path
          d="M3 15C3.2 10 2.9 5.5 3.5 3.5C5.5 2.9 10.2 3.2 15 3.1M6.5 6.5C9 6.3 11 6.5 12.5 6.6"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <circle cx="5.8" cy="5.8" r="1.1" fill="currentColor" />
      </svg>
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={`pointer-events-none absolute right-1.5 bottom-1.5 ${className}`}
      >
        <path
          d="M21 9C20.8 14 21.1 18.5 20.5 20.5C18.5 21.1 13.8 20.8 9 20.9"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={`pointer-events-none absolute left-1.5 bottom-1.5 ${className}`}
      >
        <path
          d="M3 9C3.2 14 2.9 18.5 3.5 20.5C5.5 21.1 10.2 20.8 15 20.9"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </>
  );
}

export function HandDrawnDivider({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex w-full items-center justify-center gap-3 py-1 ${className}`}
    >
      <svg
        viewBox="0 0 240 10"
        fill="none"
        preserveAspectRatio="none"
        className="h-2.5 flex-1 text-[#D9A441]/40"
      >
        <path
          d="M2 5.5C60 3.8 140 6.5 238 4.8"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M40 7.6C110 7.1 175 7.9 235 6.8"
          stroke="currentColor"
          strokeWidth="0.55"
          strokeOpacity="0.55"
          strokeLinecap="round"
        />
      </svg>
      <svg
        width="26"
        height="14"
        viewBox="0 0 26 14"
        fill="none"
        className="shrink-0 text-[#D9A441]"
      >
        <path
          d="M13 1.5L17.5 7L13 12.5L8.5 7L13 1.5Z"
          stroke="currentColor"
          strokeWidth="1.15"
        />
        <circle cx="13" cy="7" r="1.6" fill="#B8243A" />
        <path
          d="M1 7C3.5 5.2 5.5 5.4 7.5 7C5.5 8.6 3.5 8.8 1 7Z"
          stroke="currentColor"
          strokeWidth="0.9"
        />
        <path
          d="M25 7C22.5 5.2 20.5 5.4 18.5 7C20.5 8.6 22.5 8.8 25 7Z"
          stroke="currentColor"
          strokeWidth="0.9"
        />
      </svg>
      <svg
        viewBox="0 0 240 10"
        fill="none"
        preserveAspectRatio="none"
        className="h-2.5 flex-1 text-[#D9A441]/40"
      >
        <path
          d="M2 4.8C100 6.5 180 3.8 238 5.5"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M5 6.8C65 7.9 130 7.1 200 7.6"
          stroke="currentColor"
          strokeWidth="0.55"
          strokeOpacity="0.55"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function HandDrawnQuillIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M20.2 3.8C15.5 4.2 10.6 7.4 7.4 12.2C6.2 14 5.4 16 4.8 18.2L3.5 20.5L5.8 19.2C8 18.6 10 17.8 11.8 16.6C16.6 13.4 19.8 8.5 20.2 3.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 20.5L14.5 9.5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M11 10.5L13.5 10.5M9 13.5L12 13.5"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
