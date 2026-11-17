import { useId } from "react";

/** DecisionLab's mark: an Erlenmeyer flask, half full of bubbling grape "reagent". */
export function Beaker({
  className = "h-6 w-6",
  liquid = "var(--color-grape)",
  stroke = "var(--color-ink)",
  title,
}: {
  className?: string;
  liquid?: string;
  stroke?: string;
  title?: string;
}) {
  const clip = useId();
  const body = "M13 4V12L5.5 25A2.5 2.5 0 0 0 7.7 28.8H24.3A2.5 2.5 0 0 0 26.5 25L19 12V4";
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <clipPath id={clip}>
          <path d={`${body}Z`} />
        </clipPath>
      </defs>
      {/* liquid */}
      <g clipPath={`url(#${clip})`}>
        <path d="M0 19.5Q8 17.5 16 19.5T32 19.5V32H0Z" fill={liquid} />
        <circle cx="13.5" cy="23.5" r="1.3" fill="#fff" opacity=".85" />
        <circle cx="18.5" cy="25.5" r="0.9" fill="#fff" opacity=".85" />
        <circle cx="17" cy="21.8" r="0.7" fill="#fff" opacity=".85" />
      </g>
      {/* rising bubbles */}
      <circle cx="16" cy="15.5" r="0.9" fill={liquid} />
      <circle cx="14.6" cy="9.5" r="0.7" fill={liquid} opacity=".7" />
      {/* glass */}
      <path d={body} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 4H21" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
      {/* measurement ticks */}
      <path d="M19.6 16.5H17.6M21.2 19.4H19.2" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" opacity=".5" />
    </svg>
  );
}
