/* Bespoke RealRole illustrations. Pure SVG, themed through CSS variables, motion via globals.css. */

const C = {
  ink: "var(--ink)",
  ink2: "var(--ink-2)",
  ink3: "var(--ink-3)",
  line: "var(--line)",
  line2: "var(--line-2)",
  surface: "var(--surface-2)",
  sunken: "var(--sunken)",
  brand: "var(--brand)",
  violet: "var(--violet)",
  bad: "var(--bad)",
  warn: "var(--warn)",
};

/** Validators orbiting and wired to whatever sits in the middle (the live hero card). */
export function ValidatorHalo() {
  const nodes = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return { x: 300 + Math.cos(a) * 270, y: 300 + Math.sin(a) * 270 };
  });
  return (
    <svg viewBox="0 0 600 600" className="pointer-events-none absolute -inset-16 h-[calc(100%+8rem)] w-[calc(100%+8rem)]" aria-hidden="true">
      <defs>
        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c6ff3d" stopOpacity="0.12" />
          <stop offset="70%" stopColor="#8b7bff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#8b7bff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="300" cy="300" r="290" fill="url(#halo)" />
      <circle cx="300" cy="300" r="270" fill="none" stroke={C.line2} strokeDasharray="2 10" />
      <g className="orbit" style={{ transformOrigin: "300px 300px", animationDuration: "60s" }}>
        {nodes.map((n, i) => (
          <g key={i}>
            <line x1={n.x} y1={n.y} x2="300" y2="300" stroke={C.violet} strokeOpacity="0.18" strokeDasharray="3 7" />
            <circle cx={n.x} cy={n.y} r="15" fill={C.sunken} stroke={C.violet} strokeWidth="1.5" />
            <circle cx={n.x} cy={n.y} r="5" fill={C.brand} className="pulse" style={{ animationDelay: `${i * 0.25}s` }} />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** A job posting turned ghost: it floats, it has eyes, and its pay line is blank. */
export function GhostPosting({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 340" className={className} role="img" aria-label="Illustration: a job posting drawn as a ghost, its pay line blank, posted 847 days ago">
      <defs>
        <linearGradient id="ghostfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3f1ea" stopOpacity="0.95" />
          <stop offset="1" stopColor="#f3f1ea" stopOpacity="0.55" />
        </linearGradient>
        <filter id="ghostglow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <ellipse cx="160" cy="318" rx="86" ry="10" fill="#000" opacity="0.45" className="ghost-shadow" />
      <g className="ghost-float">
        <path
          d="M70 120 Q70 40 160 40 Q250 40 250 120 L250 268 Q236 252 222 268 Q208 284 194 268 Q180 252 166 268 Q152 284 138 268 Q124 252 110 268 Q96 284 82 268 Q76 262 70 268 Z"
          fill="#c6ff3d"
          opacity="0.18"
          filter="url(#ghostglow)"
        />
        <path
          d="M70 120 Q70 40 160 40 Q250 40 250 120 L250 268 Q236 252 222 268 Q208 284 194 268 Q180 252 166 268 Q152 284 138 268 Q124 252 110 268 Q96 284 82 268 Q76 262 70 268 Z"
          fill="url(#ghostfill)"
        />
        {/* eyes */}
        <ellipse cx="132" cy="108" rx="9" ry="12" fill="#0a0b0f" />
        <ellipse cx="188" cy="108" rx="9" ry="12" fill="#0a0b0f" />
        <circle cx="135" cy="104" r="3" fill="#fff" />
        <circle cx="191" cy="104" r="3" fill="#fff" />
        {/* the posting */}
        <rect x="96" y="140" width="128" height="9" rx="4.5" fill="#0a0b0f" opacity="0.8" />
        <rect x="96" y="158" width="96" height="6" rx="3" fill="#0a0b0f" opacity="0.35" />
        <rect x="96" y="172" width="112" height="6" rx="3" fill="#0a0b0f" opacity="0.35" />
        <rect x="96" y="194" width="128" height="28" rx="7" fill="none" stroke="#ff5a4e" strokeWidth="2" strokeDasharray="5 5" />
        <text x="160" y="213" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="13" fontWeight="700" fill="#ff5a4e">$ ??? – ???</text>
        <rect x="96" y="232" width="80" height="6" rx="3" fill="#0a0b0f" opacity="0.35" />
      </g>
      {/* "posted" tag */}
      <g transform="translate(206 26) rotate(8)">
        <rect width="104" height="30" rx="8" fill="#ffb547" />
        <text x="52" y="19.5" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="11" fontWeight="800" fill="#0a0b0f">posted 847d ago</text>
      </g>
    </svg>
  );
}

/** Web page → validators (each with its own model) → contract → stamp. */
export function TrustPipeline() {
  const vy = [70, 120, 170, 220, 270];
  return (
    <svg viewBox="0 0 960 340" className="h-auto w-full" role="img" aria-label="Diagram: a live job page is read independently by five validators, each running its own AI model; their agreed facts go to the contract, which stamps the verdict">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill={C.ink3} />
        </marker>
      </defs>

      {/* 1. the live job page */}
      <g transform="translate(20 70)">
        <rect width="200" height="200" rx="14" fill={C.surface} stroke={C.line2} />
        <rect width="200" height="30" rx="14" fill={C.sunken} />
        <circle cx="18" cy="15" r="4" fill={C.bad} />
        <circle cx="32" cy="15" r="4" fill={C.warn} />
        <circle cx="46" cy="15" r="4" fill={C.brand} />
        <rect x="62" y="9" width="122" height="12" rx="6" fill={C.line} />
        <rect x="18" y="48" width="140" height="10" rx="5" fill={C.ink2} />
        <rect x="18" y="68" width="100" height="7" rx="3.5" fill={C.line2} />
        <rect x="18" y="84" width="150" height="7" rx="3.5" fill={C.line2} />
        <rect x="18" y="108" width="164" height="30" rx="8" fill="none" stroke={C.brand} strokeOpacity="0.6" />
        <text x="100" y="128" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="12" fill={C.brand}>$150k – $185k</text>
        <rect x="18" y="152" width="120" height="7" rx="3.5" fill={C.line2} />
        <rect x="18" y="168" width="90" height="7" rx="3.5" fill={C.line2} />
        <text x="100" y="228" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="12" fill={C.ink3}>employer&apos;s own job board</text>
      </g>

      {/* fan-out lines */}
      {vy.map((y, i) => (
        <path key={`in${i}`} d={`M220 170 C 290 170, 300 ${y}, 360 ${y}`} fill="none" stroke={C.violet} strokeOpacity="0.5" strokeDasharray="4 6" className="flow" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}

      {/* 2. validators */}
      {vy.map((y, i) => (
        <g key={`v${i}`} transform={`translate(360 ${y - 18})`}>
          <rect width="150" height="36" rx="18" fill={C.sunken} stroke={C.line2} />
          <circle cx="18" cy="18" r="9" fill="none" stroke={C.violet} strokeWidth="2" />
          <circle cx="18" cy="18" r="3.5" fill={C.brand} className="pulse" style={{ animationDelay: `${i * 0.3}s` }} />
          <text x="36" y="22" fontFamily="ui-monospace, monospace" fontSize="11" fill={C.ink2}>validator {i + 1} · AI</text>
        </g>
      ))}
      <text x="435" y="318" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="12" fill={C.ink3}>fetch + observe independently</text>

      {/* fan-in */}
      {vy.map((y, i) => (
        <path key={`out${i}`} d={`M510 ${y} C 570 ${y}, 580 170, 640 170`} fill="none" stroke={C.brand} strokeOpacity="0.55" strokeDasharray="4 6" className="flow" style={{ animationDelay: `${0.6 + i * 0.2}s` }} />
      ))}

      {/* 3. contract */}
      <g transform="translate(640 110)">
        <rect width="150" height="120" rx="14" fill={C.surface} stroke={C.brand} strokeOpacity="0.7" />
        <text x="75" y="34" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="12" fontWeight="700" fill={C.brand}>contract.py</text>
        <text x="20" y="62" fontFamily="ui-monospace, monospace" fontSize="11" fill={C.ink2}>agree on facts?</text>
        <text x="20" y="82" fontFamily="ui-monospace, monospace" fontSize="11" fill={C.ink2}>apply the rules</text>
        <text x="20" y="102" fontFamily="ui-monospace, monospace" fontSize="11" fill={C.ink2}>settle the bond</text>
      </g>
      <line x1="790" y1="170" x2="822" y2="170" stroke={C.ink3} strokeWidth="1.5" markerEnd="url(#arr)" />

      {/* 4. stamp */}
      <g transform="translate(888 170) rotate(-8)">
        <rect x="-58" y="-30" width="116" height="60" rx="10" fill="none" stroke={C.brand} strokeWidth="3" />
        <text x="0" y="-3" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="13" fontWeight="900" fill={C.brand} letterSpacing="2">HONEST</text>
        <text x="0" y="16" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="13" fontWeight="900" fill={C.brand} letterSpacing="2">PAY</text>
      </g>
      <text x="888" y="250" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="12" fill={C.ink3}>on chain, for good</text>
    </svg>
  );
}

/** The pledge: a GEN bond with two exits. */
export function PledgeVault() {
  return (
    <svg viewBox="0 0 440 360" className="h-auto w-full" role="img" aria-label="Diagram: an employer's GEN bond returns to them if the pledge is kept; if broken, staked applicants share up to 40%, the enforcer gets 10% and the rest is burned">
      {/* vault */}
      <g transform="translate(150 40)">
        <rect width="140" height="150" rx="20" fill={C.surface} stroke={C.line2} strokeWidth="1.5" />
        <rect x="12" y="12" width="116" height="126" rx="14" fill={C.sunken} stroke={C.line} />
        <circle cx="70" cy="66" r="30" fill="none" stroke={C.brand} strokeWidth="3" />
        <g className="orbit" style={{ transformOrigin: "70px 66px", animationDuration: "9s" }}>
          {[0, 60, 120, 180, 240, 300].map((d) => (
            <line key={d} x1="70" y1="40" x2="70" y2="48" stroke={C.brand} strokeWidth="3" strokeLinecap="round" transform={`rotate(${d} 70 66)`} />
          ))}
        </g>
        <text x="70" y="71" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="12" fontWeight="900" fill={C.brand}>GEN</text>
        <text x="70" y="122" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="11" fill={C.ink2}>employer bond</text>
      </g>

      {/* kept */}
      <path d="M150 140 C 90 140, 70 200, 70 250" fill="none" stroke={C.brand} strokeWidth="2" strokeDasharray="5 6" className="flow" />
      <g transform="translate(10 250)">
        <rect width="130" height="74" rx="14" fill={C.surface} stroke={C.brand} strokeOpacity="0.6" />
        <text x="65" y="28" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="12" fontWeight="800" fill={C.brand}>KEPT</text>
        <text x="65" y="48" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="10.5" fill={C.ink2}>closed on time</text>
        <text x="65" y="63" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="10.5" fill={C.ink2}>bond → employer</text>
      </g>

      {/* broken */}
      <path d="M290 140 C 350 140, 370 200, 370 250" fill="none" stroke={C.bad} strokeWidth="2" strokeDasharray="5 6" className="flow" />
      <g transform="translate(300 250)">
        <rect width="130" height="74" rx="14" fill={C.surface} stroke={C.bad} strokeOpacity="0.6" />
        <text x="65" y="28" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="12" fontWeight="800" fill={C.bad}>BROKEN</text>
        <text x="65" y="48" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="10.5" fill={C.ink2}>≤40% applicants</text>
        <text x="65" y="63" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="10.5" fill={C.ink2}>10% enforcer · rest burned</text>
      </g>

      {/* applicants */}
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${318 + i * 34} 214)`}>
          <circle r="9" fill={C.sunken} stroke={C.bad} strokeOpacity="0.7" />
          <circle cy="-2" r="3" fill={C.ink2} />
          <path d="M-5 5 Q0 0 5 5" stroke={C.ink2} fill="none" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}
