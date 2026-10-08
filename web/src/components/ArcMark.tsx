/**
 * The CrewJio mark, drawn large: two flight paths (yours in amber, theirs in teal)
 * meeting at one point, the day you're both home. Geometry follows media/crewjio-app-icon.png.
 */
export function ArcMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 300" className={className} role="img" aria-labelledby="arc-title">
      <title id="arc-title">Two flight paths, from London and Tokyo, meeting in Singapore</title>
      {/* Faint inner route, like a great-circle line on a flight map */}
      <path
        d="M70 300 C 105 150, 160 92, 210 92 C 260 92, 315 150, 350 300"
        fill="none"
        stroke="rgb(154 168 191 / 0.22)"
        strokeWidth="1.5"
        strokeDasharray="2 7"
        strokeLinecap="round"
      />
      <path
        className="arc-path"
        pathLength={1}
        d="M28 300 C 52 160, 120 58, 210 58"
        fill="none"
        stroke="#F5B642"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        className="arc-path arc-path-b"
        pathLength={1}
        d="M392 300 C 368 160, 300 58, 210 58"
        fill="none"
        stroke="#4FD1C5"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle className="arc-dot" cx="210" cy="58" r="30" fill="rgb(238 242 247 / 0.08)" />
      <circle className="arc-dot" cx="210" cy="58" r="15" fill="#EEF2F7" />
      <g className="arc-label" fill="#9AA8BF" fontFamily="var(--font-jetbrains-mono)" fontSize="13" fontWeight="500" letterSpacing="1">
        <text x="210" y="18" textAnchor="middle" fill="#EEF2F7">SIN</text>
        <text x="58" y="214">LHR</text>
        <text x="362" y="214" textAnchor="end">NRT</text>
      </g>
    </svg>
  );
}
