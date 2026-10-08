"use client";

import { AirplaneIcon } from "@phosphor-icons/react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CtaLink } from "@/components/CtaLink";

/**
 * Hero based on media/crewjio-tally-cover.png, drawn live so it fits any screen.
 * Two flight paths (yours amber, theirs teal) meet over SIN. While the hero is pinned,
 * scrolling flies one plane along each path; they cross at SIN, the day you're both
 * home, and carry on to the other side.
 */

interface Geometry {
  w: number;
  h: number;
  cx: number;
  apexY: number;
  amber: string;
  teal: string;
  route: string;
  dotted: string;
  cities: { code: string; x: number; y: number }[];
}

const CITIES = [
  { code: "CDG", side: -1, f: 0.07 },
  { code: "LHR", side: -1, f: 0.25 },
  { code: "DXB", side: -1, f: 0.44 },
  { code: "NRT", side: 1, f: 0.06 },
  { code: "SYD", side: 1, f: 0.26 },
  { code: "HKG", side: 1, f: 0.44 },
];

function buildGeometry(w: number, h: number): Geometry {
  const cx = w / 2;
  const portrait = w / h < 1.1;
  const apexY = Math.max(portrait ? 130 : 104, h * 0.17);
  const exitY = h + 24;

  // Wide screens: an ellipse centred well below the fold, leaving through the bottom
  // corners at a shallow angle, like the cover. Phones: a wider, flatter arch that
  // leaves through the sides above the headline, so the lines never cross the text.
  // Phones: the arch fills the top half and leaves the sides at sideExitY; the copy sits below it.
  const sideX = w / 2 + 24;
  const sideExitY = h * 0.46;
  const rxPortrait = w * 0.9;
  const ry = portrait
    ? (sideExitY - apexY) / (1 - Math.sqrt(1 - (sideX / rxPortrait) ** 2))
    : h * 1.9 - apexY;
  const cy = apexY + ry;
  const rx = portrait ? rxPortrait : (w / 2 + 8) / Math.sqrt(1 - ((cy - exitY) / ry) ** 2);
  const xAt = (rxx: number, ryy: number, y: number) => rxx * Math.sqrt(Math.max(0, 1 - ((cy - y) / ryy) ** 2));
  const yAt = (rxx: number, ryy: number, x: number) => cy - ryy * Math.sqrt(Math.max(0, 1 - (x / rxx) ** 2));

  // Where the route leaves the screen: bottom edge, or the side edges if it gets there first.
  let ex = xAt(rx, ry, exitY);
  let ey = exitY;
  if (ex > w / 2 + 24) {
    ex = w / 2 + 24;
    ey = yAt(rx, ry, ex);
  }

  // Dotted outer route, slightly wider and flatter, where the city markers sit.
  const ry2 = ry + h * 0.025;
  const rx2 = rx * 1.12;
  const apex2 = cy - ry2;
  const x2b = xAt(rx2, ry2, exitY);

  const cities = portrait
    ? []
    : CITIES.map(({ code, side, f }) => {
        const y = apex2 + f * (h - apex2);
        return { code, x: cx + side * xAt(rx2, ry2, y), y };
      }).filter((c) => c.x > 24 && c.x < w - 64 && Math.abs(c.x - cx) > w * 0.3);

  return {
    w,
    h,
    cx,
    apexY,
    amber: `M ${cx - ex} ${ey} A ${rx} ${ry} 0 0 1 ${cx} ${apexY}`,
    teal: `M ${cx + ex} ${ey} A ${rx} ${ry} 0 0 0 ${cx} ${apexY}`,
    route: `M ${cx - ex} ${ey} A ${rx} ${ry} 0 0 1 ${cx} ${apexY} A ${rx} ${ry} 0 0 1 ${cx + ex} ${ey}`,
    dotted: `M ${cx - x2b} ${exitY} A ${rx2} ${ry2} 0 0 1 ${cx + x2b} ${exitY}`,
    cities,
  };
}

// Planes start this far along the route (in px) so they're fully on screen, and stop
// the same distance before the far end.
const EDGE_INSET = 84;
// Where planes sit when motion is reduced.
const STILL_PROGRESS = 0.16;

export function FlightHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<SVGPathElement>(null);
  const amberPlane = useRef<SVGGElement>(null);
  const tealPlane = useRef<SVGGElement>(null);
  const [geo, setGeo] = useState<Geometry | null>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  // The meeting point glows as the planes pass over SIN.
  const haloScale = useTransform(scrollYProgress, [0.4, 0.5, 0.6], [1, 1.45, 1]);
  const haloOpacity = useTransform(scrollYProgress, [0.4, 0.5, 0.6], [0.07, 0.15, 0.07]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const { width, height } = stage.getBoundingClientRect();
      setGeo((g) => (g && g.w === width && g.h === height ? g : buildGeometry(width, height)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  // Places both planes for a scroll progress 0..1. Writes SVG attributes directly,
  // so scrolling never re-renders React.
  const place = useCallback((progress: number) => {
    const path = routeRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    const put = (el: SVGGElement | null, s: number, forward: boolean) => {
      if (!el) return;
      const p = path.getPointAtLength(s * length);
      const ahead = path.getPointAtLength(Math.min(length, Math.max(0, s * length + (forward ? 1 : -1))));
      // Phosphor's airplane points up; rotate it to the direction of travel.
      const angle = (Math.atan2(ahead.y - p.y, ahead.x - p.x) * 180) / Math.PI + 90;
      el.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${angle})`);
    };
    const inset = Math.min(0.2, EDGE_INSET / length);
    const s = inset + (1 - 2 * inset) * progress;
    put(amberPlane.current, s, true);
    put(tealPlane.current, 1 - s, false);
  }, []);

  useEffect(() => {
    if (geo) place(reduce ? STILL_PROGRESS : scrollYProgress.get());
  }, [geo, reduce, place, scrollYProgress]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (!reduce) place(v);
  });

  return (
    // Tall section + sticky stage = pinned hero. Without motion it's one screen.
    <section ref={sectionRef} className={`relative ${reduce ? "" : "h-[210vh]"}`} aria-labelledby="hero-title">
      <div
        ref={stageRef}
        className="sticky top-0 flex h-[100dvh] min-h-[560px] flex-col items-center justify-end overflow-hidden pb-[9dvh] [@media(min-aspect-ratio:11/10)]:justify-center [@media(min-aspect-ratio:11/10)]:pb-0 bg-[radial-gradient(rgb(154_168_191/0.13)_1px,transparent_1.6px)] bg-[length:52px_52px] bg-center px-4"
      >
        {geo && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${geo.w} ${geo.h}`}
            aria-hidden
          >
            <path d={geo.dotted} fill="none" stroke="rgb(154 168 191 / 0.3)" strokeWidth="1.5" strokeDasharray="1.5 7" strokeLinecap="round" />
            {geo.cities.map((c) => (
              <g key={c.code} className="arc-label" transform={`translate(${c.x} ${c.y})`}>
                <circle r="4.5" fill="#0E1726" stroke="#7A89A3" strokeWidth="1.5" />
                <text x="12" y="5" fill="#7A89A3" fontFamily="var(--font-jetbrains-mono)" fontSize="14" fontWeight="500" letterSpacing="0.5">
                  {c.code}
                </text>
              </g>
            ))}

            <path ref={routeRef} d={geo.route} fill="none" stroke="none" />
            <path className="arc-path" pathLength={1} d={geo.amber} fill="none" stroke="#F5B642" strokeWidth="6" strokeLinecap="round" />
            <path className="arc-path arc-path-b" pathLength={1} d={geo.teal} fill="none" stroke="#4FD1C5" strokeWidth="6" strokeLinecap="round" />

            <motion.circle
              cx={geo.cx}
              cy={geo.apexY}
              r="46"
              fill="#EEF2F7"
              style={{ scale: reduce ? 1 : haloScale, opacity: reduce ? 0.08 : haloOpacity, transformBox: "fill-box", transformOrigin: "center" }}
            />
            <g className="arc-dot">
              <circle cx={geo.cx} cy={geo.apexY} r="25" fill="rgb(238 242 247 / 0.12)" />
              <circle cx={geo.cx} cy={geo.apexY} r="14" fill="#EEF2F7" />
            </g>

            <g className="arc-label">
              <g ref={amberPlane}>
                <AirplaneIcon x={-17} y={-17} size={34} weight="fill" color="#F5B642" stroke="#0E1726" strokeWidth={22} paintOrder="stroke" />
              </g>
              <g ref={tealPlane}>
                <AirplaneIcon x={-17} y={-17} size={34} weight="fill" color="#4FD1C5" stroke="#0E1726" strokeWidth={22} paintOrder="stroke" />
              </g>
            </g>
          </svg>
        )}

        <div className="relative flex [@media(min-aspect-ratio:11/10)]:mt-[12vh] max-w-[56rem] flex-col items-center gap-6 text-center">
          <p className="rise font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-amber sm:text-[13px] sm:tracking-[0.32em]">
            Early access · SG crew &amp; pilots
          </p>
          <h1
            id="hero-title"
            className="rise text-[2.6rem] font-bold leading-[1.04] tracking-[-0.035em] text-balance sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "80ms" }}
          >
            Find the days you&apos;re both home.
          </h1>
          <p className="rise max-w-[34ch] text-lg leading-relaxed text-muted md:text-xl" style={{ animationDelay: "160ms" }}>
            Share rosters with your crew friends and partner. No more group-chat date juggling.
          </p>
          <div className="rise" style={{ animationDelay: "240ms" }}>
            <CtaLink href="#waitlist">Get early access</CtaLink>
          </div>
        </div>
      </div>
    </section>
  );
}
