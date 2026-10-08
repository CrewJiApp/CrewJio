import Image from "next/image";

interface PhoneShotProps {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
}

/** App screen in a double-bezel frame: aluminium tray outside, glass screen inside. */
export function PhoneShot({ src, alt, priority = false, className = "", sizes = "(min-width: 1024px) 320px, 80vw" }: PhoneShotProps) {
  return (
    <div
      className={`rounded-[2.75rem] bg-white/[0.04] p-2 ring-1 ring-white/10 shadow-[0_40px_80px_-30px_rgb(4_8_15/0.9)] ${className}`}
    >
      <div className="overflow-hidden rounded-[calc(2.75rem-0.5rem)] bg-night shadow-[inset_0_1px_1px_rgb(255_255_255/0.12)] ring-1 ring-white/5">
        <Image src={src} alt={alt} width={878} height={1899} priority={priority} sizes={sizes} className="h-auto w-full" />
      </div>
    </div>
  );
}
