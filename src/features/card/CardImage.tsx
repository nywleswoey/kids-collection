import Image from "next/image";

/** Shared square card artwork. Every card surface renders the card's imageUrl
 *  as a square, object-cover thumbnail; only the pixel size and the
 *  priority/loading hints vary. The default className covers all full-width
 *  slots; the fixed-size CardMini variant overrides it. */
export function CardImage({
  src,
  alt,
  dim,
  priority,
  loading,
  className = "aspect-square w-full object-cover",
}: {
  src: string;
  alt: string;
  dim: number;
  priority?: boolean;
  loading?: "lazy" | "eager";
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={dim}
      height={dim}
      className={className}
      priority={priority}
      loading={loading}
    />
  );
}
