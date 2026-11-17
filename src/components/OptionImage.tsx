import { imageSrc } from "@/lib/image";
import type { Option } from "@/lib/types";

/** An option's photo, or nothing. `size` picks a preset; pass className to override. */
export function OptionImage({
  o, size = "thumb", className = "",
}: { o: Pick<Option, "image" | "imageId" | "label">; size?: "dot" | "thumb" | "card" | "hero"; className?: string }) {
  const src = imageSrc(o);
  if (!src) return null;
  const sizes = {
    dot: "h-5 w-5 rounded-full",
    thumb: "h-10 w-10 rounded-md",
    card: "aspect-[4/3] w-full rounded-md",
    hero: "aspect-square w-full rounded-md",
  };
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local data: URLs and our own API; next/image adds nothing here
    <img src={src} alt={o.label} className={`shrink-0 bg-ink/5 object-cover ${sizes[size]} ${className}`} draggable={false} />
  );
}
