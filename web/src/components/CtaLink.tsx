import { ArrowDownIcon, ArrowUpRightIcon } from "@phosphor-icons/react/ssr";

interface CtaLinkProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  icon?: "down" | "out";
  className?: string;
}

/** Pill CTA with the arrow nested in its own circle. Presses down on tap. */
export function CtaLink({ href, children, variant = "primary", icon = "down", className = "" }: CtaLinkProps) {
  const Icon = icon === "down" ? ArrowDownIcon : ArrowUpRightIcon;
  const primary = variant === "primary";
  return (
    <a
      href={href}
      className={`group inline-flex min-h-12 items-center gap-3 whitespace-nowrap rounded-full py-2 pl-6 pr-2 text-[15px] font-semibold transition-[transform,background-color,box-shadow] duration-500 ease-fluid active:scale-[0.97] ${
        primary
          ? "bg-amber text-on-amber shadow-[0_10px_40px_-12px_rgb(245_182_66/0.55),inset_0_1px_0_rgb(255_255_255/0.35)] hover:bg-[#f8c25d]"
          : "bg-white/[0.04] text-cloud ring-1 ring-white/10 hover:bg-white/[0.08]"
      } ${className}`}
    >
      {children}
      <span
        aria-hidden
        className={`flex size-8 items-center justify-center rounded-full transition-transform duration-500 ease-fluid group-hover:scale-105 ${
          icon === "down" ? "group-hover:translate-y-0.5" : "group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        } ${primary ? "bg-on-amber/10" : "bg-white/10"}`}
      >
        <Icon size={16} weight="bold" />
      </span>
    </a>
  );
}
