import Image from "next/image";

export function BrandLogo({
  className = "brand-logo",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      className={className}
      src="/jenganasi-logo.png"
      alt="JengaNasi"
      width={1715}
      height={431}
      priority={priority}
    />
  );
}
