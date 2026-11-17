import { hostOf, safeUrl } from "@/lib/links";

/** External link for an option. Re-validated at render time; never rendered for non-http(s) URLs. */
export function OptionLink({ url, label = true, className = "" }: { url?: string; label?: boolean; className?: string }) {
  const href = safeUrl(url);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title={href}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-0.5 text-xs font-medium text-grape hover:underline ${className}`}
    >
      {label ? `${hostOf(href)} ↗` : "↗"}
    </a>
  );
}
