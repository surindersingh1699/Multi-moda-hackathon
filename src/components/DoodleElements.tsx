/* ── Cute Plush SVG Illustrations ──
   Soft, filled, puffy stuffed-toy style with warm terracotta palette.
   All components accept className for sizing/positioning. */

// ── Plush Bear (sitting, holding a pillow) ──
export function DoodleBear({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bearFur" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#F2C4BB" />
          <stop offset="100%" stopColor="#D4877A" />
        </radialGradient>
        <radialGradient id="bearInner" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FBE8E4" />
          <stop offset="100%" stopColor="#F2C4BB" />
        </radialGradient>
        <radialGradient id="pillowFill" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FEF3EC" />
        </radialGradient>
      </defs>
      {/* Ears */}
      <circle cx="36" cy="26" r="14" fill="url(#bearFur)" />
      <circle cx="84" cy="26" r="14" fill="url(#bearFur)" />
      <circle cx="36" cy="26" r="7" fill="url(#bearInner)" />
      <circle cx="84" cy="26" r="7" fill="url(#bearInner)" />
      {/* Body */}
      <ellipse cx="60" cy="88" rx="28" ry="26" fill="url(#bearFur)" />
      {/* Arms */}
      <ellipse cx="30" cy="82" rx="10" ry="14" fill="url(#bearFur)" transform="rotate(-15 30 82)" />
      <ellipse cx="90" cy="82" rx="10" ry="14" fill="url(#bearFur)" transform="rotate(15 90 82)" />
      {/* Head */}
      <circle cx="60" cy="48" r="28" fill="url(#bearFur)" />
      {/* Face patch */}
      <ellipse cx="60" cy="54" rx="18" ry="14" fill="url(#bearInner)" />
      {/* Eyes */}
      <ellipse cx="50" cy="44" rx="4" ry="4.5" fill="#2C1810" />
      <ellipse cx="70" cy="44" rx="4" ry="4.5" fill="#2C1810" />
      <ellipse cx="51.5" cy="42.5" rx="1.8" ry="2" fill="white" />
      <ellipse cx="71.5" cy="42.5" rx="1.8" ry="2" fill="white" />
      {/* Nose */}
      <ellipse cx="60" cy="52" rx="5" ry="3.5" fill="#B84E20" />
      <ellipse cx="60" cy="51" rx="2.5" ry="1.5" fill="#D4622D" opacity="0.6" />
      {/* Mouth */}
      <path d="M57 55.5 Q60 60 63 55.5" stroke="#8C3B18" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Blush */}
      <circle cx="42" cy="52" r="5" fill="#FBE8E4" opacity="0.7" />
      <circle cx="78" cy="52" r="5" fill="#FBE8E4" opacity="0.7" />
      {/* Pillow in front */}
      <rect x="38" y="92" rx="10" ry="10" width="44" height="18" fill="url(#pillowFill)" stroke="#F9B889" strokeWidth="1.5" />
      <path d="M46 99 L74 99" stroke="#FDDCC6" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M48 104 L72 104" stroke="#FDDCC6" strokeWidth="1.5" strokeLinecap="round" />
      {/* Feet */}
      <ellipse cx="46" cy="112" rx="10" ry="6" fill="url(#bearFur)" />
      <ellipse cx="74" cy="112" rx="10" ry="6" fill="url(#bearFur)" />
      <ellipse cx="46" cy="112" rx="5" ry="3" fill="url(#bearInner)" />
      <ellipse cx="74" cy="112" rx="5" ry="3" fill="url(#bearInner)" />
    </svg>
  );
}

// ── Plush Bear Thinking (loading state) ──
export function DoodleBearThinking({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="thinkFur" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#F2C4BB" />
          <stop offset="100%" stopColor="#D4877A" />
        </radialGradient>
        <radialGradient id="thinkInner" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FBE8E4" />
          <stop offset="100%" stopColor="#F2C4BB" />
        </radialGradient>
      </defs>
      {/* Ears */}
      <circle cx="36" cy="26" r="14" fill="url(#thinkFur)" />
      <circle cx="84" cy="26" r="14" fill="url(#thinkFur)" />
      <circle cx="36" cy="26" r="7" fill="url(#thinkInner)" />
      <circle cx="84" cy="26" r="7" fill="url(#thinkInner)" />
      {/* Body */}
      <ellipse cx="60" cy="90" rx="28" ry="26" fill="url(#thinkFur)" />
      {/* Arm touching chin */}
      <ellipse cx="34" cy="68" rx="9" ry="16" fill="url(#thinkFur)" transform="rotate(20 34 68)" />
      {/* Other arm */}
      <ellipse cx="90" cy="85" rx="9" ry="14" fill="url(#thinkFur)" transform="rotate(15 90 85)" />
      {/* Head */}
      <circle cx="60" cy="48" r="28" fill="url(#thinkFur)" />
      {/* Face patch */}
      <ellipse cx="60" cy="54" rx="18" ry="14" fill="url(#thinkInner)" />
      {/* Eyes - looking up */}
      <ellipse cx="50" cy="42" rx="4" ry="4.5" fill="#2C1810" />
      <ellipse cx="70" cy="42" rx="4" ry="4.5" fill="#2C1810" />
      <ellipse cx="51" cy="40" rx="1.8" ry="2" fill="white" />
      <ellipse cx="71" cy="40" rx="1.8" ry="2" fill="white" />
      {/* Nose */}
      <ellipse cx="60" cy="52" rx="5" ry="3.5" fill="#B84E20" />
      <ellipse cx="60" cy="51" rx="2.5" ry="1.5" fill="#D4622D" opacity="0.6" />
      {/* Mouth - flat thinking */}
      <path d="M56 56 Q60 57 64 56" stroke="#8C3B18" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Blush */}
      <circle cx="42" cy="52" r="5" fill="#FBE8E4" opacity="0.7" />
      <circle cx="78" cy="52" r="5" fill="#FBE8E4" opacity="0.7" />
      {/* Feet */}
      <ellipse cx="46" cy="114" rx="10" ry="6" fill="url(#thinkFur)" />
      <ellipse cx="74" cy="114" rx="10" ry="6" fill="url(#thinkFur)" />
      {/* Thought bubbles */}
      <circle cx="96" cy="30" r="4" fill="#FEF3EC" stroke="#F9B889" strokeWidth="1" />
      <circle cx="104" cy="18" r="6" fill="#FEF3EC" stroke="#F9B889" strokeWidth="1" />
      <circle cx="114" cy="6" r="8" fill="#FEF3EC" stroke="#F9B889" strokeWidth="1" />
      <text x="111" y="10" textAnchor="middle" fontSize="8" fill="#E8753A">?</text>
    </svg>
  );
}

// ── Plush Bear Happy (results state) ──
export function DoodleBearHappy({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="happyFur" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#F2C4BB" />
          <stop offset="100%" stopColor="#D4877A" />
        </radialGradient>
        <radialGradient id="happyInner" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FBE8E4" />
          <stop offset="100%" stopColor="#F2C4BB" />
        </radialGradient>
      </defs>
      {/* Ears */}
      <circle cx="24" cy="17" r="9" fill="url(#happyFur)" />
      <circle cx="56" cy="17" r="9" fill="url(#happyFur)" />
      <circle cx="24" cy="17" r="4.5" fill="url(#happyInner)" />
      <circle cx="56" cy="17" r="4.5" fill="url(#happyInner)" />
      {/* Body */}
      <ellipse cx="40" cy="60" rx="18" ry="16" fill="url(#happyFur)" />
      {/* Arms up! */}
      <ellipse cx="18" cy="45" rx="6" ry="12" fill="url(#happyFur)" transform="rotate(-25 18 45)" />
      <ellipse cx="62" cy="45" rx="6" ry="12" fill="url(#happyFur)" transform="rotate(25 62 45)" />
      {/* Head */}
      <circle cx="40" cy="33" r="19" fill="url(#happyFur)" />
      {/* Face patch */}
      <ellipse cx="40" cy="37" rx="12" ry="10" fill="url(#happyInner)" />
      {/* Eyes - happy crescents */}
      <path d="M33 31 Q35 27 37 31" stroke="#2C1810" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M43 31 Q45 27 47 31" stroke="#2C1810" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Nose */}
      <ellipse cx="40" cy="36" rx="3" ry="2.2" fill="#B84E20" />
      {/* Big smile */}
      <path d="M35 39 Q40 45 45 39" stroke="#8C3B18" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Blush */}
      <circle cx="29" cy="38" r="3.5" fill="#FBE8E4" opacity="0.7" />
      <circle cx="51" cy="38" r="3.5" fill="#FBE8E4" opacity="0.7" />
      {/* Sparkles */}
      <circle cx="10" cy="28" r="2" fill="#F9B889" />
      <circle cx="70" cy="26" r="2" fill="#F9B889" />
      <circle cx="8" cy="22" r="1" fill="#FDDCC6" />
      <circle cx="72" cy="20" r="1" fill="#FDDCC6" />
    </svg>
  );
}

// ── Small Plush Elements ──

export function DoodleStar({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2 L14 9 L21 9 L15.5 13.5 L17.5 21 L12 16.5 L6.5 21 L8.5 13.5 L3 9 L10 9 Z"
        fill="#FEF3EC" stroke="#F9B889" strokeWidth="1" strokeLinejoin="round" />
      <path d="M12 5 L13.2 9.5 L17.5 9.5 L14 12.5 L15.2 17 L12 14.5 L8.8 17 L10 12.5 L6.5 9.5 L10.8 9.5 Z"
        fill="#FDDCC6" opacity="0.5" />
    </svg>
  );
}

export function DoodleHeart({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="heartGrad" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#F2C4BB" />
          <stop offset="100%" stopColor="#D4877A" />
        </radialGradient>
      </defs>
      <path d="M12 21 C12 21 3 14 3 8.5 C3 5.5 5.5 3 8.5 3 C10 3 11.5 4 12 5 C12.5 4 14 3 15.5 3 C18.5 3 21 5.5 21 8.5 C21 14 12 21 12 21Z"
        fill="url(#heartGrad)" />
      <path d="M9 7 Q10 5.5 11.5 7" stroke="white" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  );
}

export function DoodleCloud({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="cloudGrad" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FEF3EC" />
        </radialGradient>
      </defs>
      <path d="M8 20 Q2 20 2 15 Q2 11 6 10 Q6 5 12 5 Q17 5 18 9 Q24 7 26 11 Q30 11 30 15 Q30 20 24 20 Z"
        fill="url(#cloudGrad)" stroke="#F9B889" strokeWidth="0.8" />
    </svg>
  );
}

export function DoodlePlant({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 28" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="potGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8753A" />
          <stop offset="100%" stopColor="#D4622D" />
        </linearGradient>
      </defs>
      {/* Pot */}
      <path d="M7 19 L9 27 L15 27 L17 19 Z" fill="url(#potGrad)" />
      <rect x="6" y="18" rx="1" ry="1" width="12" height="2" fill="#E8753A" />
      {/* Stem */}
      <path d="M12 18 L12 10" stroke="#7EA86A" strokeWidth="2" strokeLinecap="round" />
      {/* Leaves */}
      <ellipse cx="8" cy="13" rx="4" ry="2.5" fill="#7EA86A" transform="rotate(-30 8 13)" />
      <ellipse cx="16" cy="10" rx="4" ry="2.5" fill="#7EA86A" transform="rotate(30 16 10)" />
      <ellipse cx="15" cy="14" rx="3" ry="2" fill="#7EA86A" transform="rotate(20 15 14)" />
      {/* Leaf highlights */}
      <ellipse cx="8" cy="12.5" rx="2" ry="1" fill="#ECF2E8" transform="rotate(-30 8 12.5)" opacity="0.5" />
      <ellipse cx="16" cy="9.5" rx="2" ry="1" fill="#ECF2E8" transform="rotate(30 16 9.5)" opacity="0.5" />
    </svg>
  );
}

export function DoodlePillow({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 20" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="pillGrad" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FEF3EC" />
        </radialGradient>
      </defs>
      <rect x="2" y="3" rx="7" ry="7" width="24" height="14" fill="url(#pillGrad)" stroke="#F9B889" strokeWidth="1" />
      <path d="M8 8 L20 8" stroke="#FDDCC6" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 12 L19 12" stroke="#FDDCC6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function DoodleLamp({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 28" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shadeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FEF3EC" />
          <stop offset="100%" stopColor="#FDDCC6" />
        </linearGradient>
      </defs>
      {/* Glow */}
      <ellipse cx="12" cy="8" rx="12" ry="8" fill="#FEF3EC" opacity="0.4" />
      {/* Shade */}
      <path d="M5 4 L12 2 L19 4 L17 14 L7 14 Z" fill="url(#shadeGrad)" stroke="#F9B889" strokeWidth="1" />
      {/* Pole */}
      <rect x="11" y="14" width="2" height="8" rx="1" fill="#D4622D" />
      {/* Base */}
      <ellipse cx="12" cy="24" rx="6" ry="2.5" fill="#D4622D" />
      <ellipse cx="12" cy="23.5" rx="6" ry="2" fill="#E8753A" />
    </svg>
  );
}

export function DoodleCamera({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="camGrad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FEF3EC" />
          <stop offset="100%" stopColor="#FDDCC6" />
        </radialGradient>
      </defs>
      {/* Body */}
      <rect x="3" y="8" rx="4" ry="4" width="26" height="17" fill="url(#camGrad)" stroke="#E8753A" strokeWidth="1.5" />
      {/* Top bump */}
      <path d="M11 8 L13 4 L19 4 L21 8" fill="#FDDCC6" stroke="#E8753A" strokeWidth="1.5" />
      {/* Lens outer */}
      <circle cx="16" cy="17" r="6" fill="#FBE8E4" stroke="#E8753A" strokeWidth="1.5" />
      {/* Lens inner */}
      <circle cx="16" cy="17" r="3" fill="#D4877A" />
      <circle cx="16" cy="17" r="1.5" fill="#E8753A" />
      {/* Lens shine */}
      <circle cx="14.5" cy="15.5" r="1" fill="white" opacity="0.7" />
      {/* Flash */}
      <circle cx="24" cy="12" r="2" fill="#F9B889" />
      <circle cx="24" cy="12" r="1" fill="white" opacity="0.5" />
    </svg>
  );
}

export function DoodleFrame({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="frameGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8753A" />
          <stop offset="100%" stopColor="#D4622D" />
        </linearGradient>
      </defs>
      {/* Outer frame */}
      <rect x="2" y="2" rx="3" ry="3" width="24" height="20" fill="url(#frameGrad)" />
      {/* Inner mat */}
      <rect x="5" y="5" rx="1.5" ry="1.5" width="18" height="14" fill="#FEF3EC" />
      {/* Picture area */}
      <rect x="7" y="7" rx="1" ry="1" width="14" height="10" fill="#FDDCC6" />
      {/* Mountain scene */}
      <path d="M7 17 L12 10 L16 14 L18 11 L21 17 Z" fill="#D4877A" opacity="0.6" />
      {/* Sun */}
      <circle cx="18" cy="9" r="2" fill="#F9B889" />
    </svg>
  );
}

export function DoodleAccessory({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 28" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="candleGrad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FEF3EC" />
          <stop offset="100%" stopColor="#FDDCC6" />
        </radialGradient>
      </defs>
      {/* Flame */}
      <ellipse cx="12" cy="6" rx="3" ry="4.5" fill="#F9B889" />
      <ellipse cx="12" cy="6" rx="1.5" ry="3" fill="#E8753A" opacity="0.7" />
      {/* Glow */}
      <circle cx="12" cy="6" r="6" fill="#FEF3EC" opacity="0.3" />
      {/* Wick */}
      <rect x="11.5" y="9" width="1" height="3" rx="0.5" fill="#8C3B18" />
      {/* Candle body */}
      <rect x="7" y="12" rx="3" ry="3" width="10" height="12" fill="url(#candleGrad)" stroke="#F9B889" strokeWidth="1" />
      {/* Wax drip detail */}
      <path d="M9 12 Q10 14 11 12" fill="#FDDCC6" />
      {/* Base */}
      <ellipse cx="12" cy="25" rx="7" ry="2" fill="#F2C4BB" />
    </svg>
  );
}

// ── Floating Doodles Background ──

const floatingItems = [
  { Component: DoodleStar, x: '8%', y: '15%', size: 'w-6 h-6', anim: 'animate-twinkle', delay: '0s', dur: '3s' },
  { Component: DoodleHeart, x: '85%', y: '12%', size: 'w-5 h-5', anim: 'animate-heartBeat', delay: '0.5s', dur: '4s' },
  { Component: DoodleCloud, x: '75%', y: '8%', size: 'w-12 h-12', anim: 'animate-drift', delay: '0s', dur: '12s' },
  { Component: DoodleStar, x: '92%', y: '35%', size: 'w-5 h-5', anim: 'animate-twinkle', delay: '1s', dur: '3.5s' },
  { Component: DoodlePlant, x: '5%', y: '60%', size: 'w-7 h-7', anim: 'animate-sway', delay: '0.3s', dur: '4s' },
  { Component: DoodleHeart, x: '15%', y: '80%', size: 'w-5 h-5', anim: 'animate-heartBeat', delay: '1.5s', dur: '3s' },
  { Component: DoodleStar, x: '50%', y: '5%', size: 'w-4 h-4', anim: 'animate-twinkle', delay: '2s', dur: '2.5s' },
  { Component: DoodleCloud, x: '20%', y: '30%', size: 'w-10 h-10', anim: 'animate-drift', delay: '2s', dur: '15s' },
  { Component: DoodlePlant, x: '90%', y: '70%', size: 'w-6 h-6', anim: 'animate-sway', delay: '0.8s', dur: '5s' },
  { Component: DoodleHeart, x: '55%', y: '90%', size: 'w-4 h-4', anim: 'animate-heartBeat', delay: '0.7s', dur: '3.5s' },
];

export function FloatingDoodles() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {floatingItems.map((item, i) => (
        <div
          key={i}
          className={`absolute opacity-40 ${item.anim}`}
          style={{
            left: item.x,
            top: item.y,
            animationDelay: item.delay,
            animationDuration: item.dur,
          }}
        >
          <item.Component className={item.size} />
        </div>
      ))}
    </div>
  );
}
