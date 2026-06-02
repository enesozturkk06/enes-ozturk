import Image from "next/image";

const SRC = "/images/bf9ec1d0-7dc2-4a5d-bcb8-3f7c4a807a5f.png";

interface LogoProps {
  /** px cinsinden genişlik (yükseklik otomatik) */
  size?: number;
  className?: string;
  priority?: boolean;
}

export default function Logo({ size = 40, className = "", priority = false }: LogoProps) {
  return (
    <Image
      src={SRC}
      alt="Antrenör Enes Öztürk"
      width={size}
      height={size}
      className={`object-contain select-none ${className}`}
      priority={priority}
      draggable={false}
    />
  );
}
