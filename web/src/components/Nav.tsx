"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#privacy", label: "Privacy" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-20 flex justify-center px-4 pt-4 md:pt-6">
      <nav
        aria-label="Main"
        className="flex h-14 w-full max-w-[44rem] items-center justify-between gap-2 rounded-full bg-night/70 pl-3 pr-2 ring-1 ring-white/10 shadow-[0_12px_40px_-16px_rgb(4_8_15/0.8),inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-xl md:w-max md:gap-8"
      >
        <a href="#top" className="flex min-h-11 items-center gap-2.5 rounded-full pr-2" aria-label="CrewJio home">
          <Image src="/brand/icon.png" alt="" width={32} height={32} className="rounded-[9px]" priority />
          <span className="text-[17px] font-bold tracking-tight">
            Crew<span className="text-amber">Jio</span>
          </span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="rounded-full px-3.5 py-2.5 text-sm text-muted transition-colors duration-300 ease-fluid hover:text-cloud"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1">
          <a
            href="#waitlist"
            className="hidden min-h-10 items-center rounded-full bg-amber px-5 text-sm font-semibold text-on-amber transition-transform duration-500 ease-fluid active:scale-[0.97] sm:inline-flex"
          >
            Get early access
          </a>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative flex size-11 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 md:hidden"
          >
            <span
              className={`absolute h-[1.5px] w-4 rounded-full bg-cloud transition-transform duration-500 ease-fluid ${open ? "rotate-45" : "-translate-y-[3.5px]"}`}
            />
            <span
              className={`absolute h-[1.5px] w-4 rounded-full bg-cloud transition-transform duration-500 ease-fluid ${open ? "-rotate-45" : "translate-y-[3.5px]"}`}
            />
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        className={`fixed inset-0 -z-10 flex flex-col justify-end bg-night/85 px-6 pb-12 backdrop-blur-2xl transition-opacity duration-500 ease-fluid md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
        inert={!open}
      >
        <ul className="flex flex-col gap-2">
          {[...LINKS, { href: "#waitlist", label: "Get early access" }].map((l, i) => (
            <li
              key={l.href}
              className="overflow-hidden"
            >
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                style={{ transitionDelay: open ? `${100 + i * 60}ms` : "0ms" }}
                className={`block py-2 text-4xl font-semibold tracking-tight transition-[transform,opacity] duration-700 ease-fluid ${
                  open ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
                } ${l.href === "#waitlist" ? "text-amber" : "text-cloud"}`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
