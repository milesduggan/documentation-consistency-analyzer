'use client'

export default function TurboSnail({ size = 64 }: { size?: number }) {
  // 8-bit pixel art turbo snail - amber/gold color scheme to match the LED theme
  // Each rect represents a pixel in a 16x16 grid
  const pixelSize = size / 16;

  return (
    <svg
      className="turbo-snail"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      aria-label="Turbo Snail Logo"
    >
      {/* Shell - spiral pattern */}
      <rect x="8" y="2" width="1" height="1" fill="#ffb000" />
      <rect x="9" y="2" width="1" height="1" fill="#ffb000" />
      <rect x="10" y="2" width="1" height="1" fill="#ffb000" />
      <rect x="7" y="3" width="1" height="1" fill="#ffb000" />
      <rect x="11" y="3" width="1" height="1" fill="#ffb000" />
      <rect x="6" y="4" width="1" height="1" fill="#ffb000" />
      <rect x="12" y="4" width="1" height="1" fill="#ffb000" />
      <rect x="6" y="5" width="1" height="1" fill="#ffb000" />
      <rect x="12" y="5" width="1" height="1" fill="#ffb000" />
      <rect x="6" y="6" width="1" height="1" fill="#ffb000" />
      <rect x="12" y="6" width="1" height="1" fill="#ffb000" />
      <rect x="7" y="7" width="1" height="1" fill="#ffb000" />
      <rect x="11" y="7" width="1" height="1" fill="#ffb000" />
      <rect x="8" y="8" width="1" height="1" fill="#ffb000" />
      <rect x="9" y="8" width="1" height="1" fill="#ffb000" />
      <rect x="10" y="8" width="1" height="1" fill="#ffb000" />

      {/* Shell inner spiral - darker amber */}
      <rect x="8" y="3" width="1" height="1" fill="#cc8800" />
      <rect x="9" y="3" width="1" height="1" fill="#cc8800" />
      <rect x="10" y="3" width="1" height="1" fill="#cc8800" />
      <rect x="7" y="4" width="1" height="1" fill="#cc8800" />
      <rect x="11" y="4" width="1" height="1" fill="#cc8800" />
      <rect x="7" y="5" width="1" height="1" fill="#cc8800" />
      <rect x="11" y="5" width="1" height="1" fill="#cc8800" />
      <rect x="7" y="6" width="1" height="1" fill="#cc8800" />
      <rect x="11" y="6" width="1" height="1" fill="#cc8800" />
      <rect x="8" y="7" width="1" height="1" fill="#cc8800" />
      <rect x="9" y="7" width="1" height="1" fill="#cc8800" />
      <rect x="10" y="7" width="1" height="1" fill="#cc8800" />

      {/* Shell center - bright highlight */}
      <rect x="8" y="4" width="1" height="1" fill="#ffd700" />
      <rect x="9" y="4" width="1" height="1" fill="#ffd700" />
      <rect x="10" y="4" width="1" height="1" fill="#ffd700" />
      <rect x="8" y="5" width="1" height="1" fill="#ffd700" />
      <rect x="9" y="5" width="1" height="1" fill="#995500" />
      <rect x="10" y="5" width="1" height="1" fill="#ffd700" />
      <rect x="8" y="6" width="1" height="1" fill="#ffd700" />
      <rect x="9" y="6" width="1" height="1" fill="#ffd700" />
      <rect x="10" y="6" width="1" height="1" fill="#ffd700" />

      {/* Turbo exhaust - speed lines */}
      <rect x="13" y="4" width="1" height="1" fill="#ff6600" />
      <rect x="14" y="4" width="1" height="1" fill="#ff4400" />
      <rect x="13" y="5" width="1" height="1" fill="#ff6600" />
      <rect x="14" y="5" width="1" height="1" fill="#ff4400" />
      <rect x="15" y="5" width="1" height="1" fill="#ff2200" />
      <rect x="13" y="6" width="1" height="1" fill="#ff6600" />
      <rect x="14" y="6" width="1" height="1" fill="#ff4400" />

      {/* Snail body */}
      <rect x="3" y="9" width="1" height="1" fill="#ffb000" />
      <rect x="4" y="9" width="1" height="1" fill="#ffb000" />
      <rect x="5" y="9" width="1" height="1" fill="#ffb000" />
      <rect x="6" y="9" width="1" height="1" fill="#ffb000" />
      <rect x="7" y="9" width="1" height="1" fill="#ffb000" />
      <rect x="8" y="9" width="1" height="1" fill="#ffb000" />
      <rect x="9" y="9" width="1" height="1" fill="#ffb000" />
      <rect x="10" y="9" width="1" height="1" fill="#ffb000" />
      <rect x="11" y="9" width="1" height="1" fill="#ffb000" />

      {/* Snail foot/base */}
      <rect x="2" y="10" width="1" height="1" fill="#cc8800" />
      <rect x="3" y="10" width="1" height="1" fill="#cc8800" />
      <rect x="4" y="10" width="1" height="1" fill="#cc8800" />
      <rect x="5" y="10" width="1" height="1" fill="#cc8800" />
      <rect x="6" y="10" width="1" height="1" fill="#cc8800" />
      <rect x="7" y="10" width="1" height="1" fill="#cc8800" />
      <rect x="8" y="10" width="1" height="1" fill="#cc8800" />
      <rect x="9" y="10" width="1" height="1" fill="#cc8800" />
      <rect x="10" y="10" width="1" height="1" fill="#cc8800" />
      <rect x="11" y="10" width="1" height="1" fill="#cc8800" />
      <rect x="12" y="10" width="1" height="1" fill="#cc8800" />

      {/* Snail head */}
      <rect x="2" y="8" width="1" height="1" fill="#ffb000" />
      <rect x="3" y="8" width="1" height="1" fill="#ffb000" />
      <rect x="4" y="8" width="1" height="1" fill="#ffb000" />
      <rect x="1" y="9" width="1" height="1" fill="#ffb000" />
      <rect x="2" y="9" width="1" height="1" fill="#ffb000" />

      {/* Eye stalks */}
      <rect x="1" y="6" width="1" height="1" fill="#ffb000" />
      <rect x="1" y="7" width="1" height="1" fill="#ffb000" />
      <rect x="3" y="6" width="1" height="1" fill="#ffb000" />
      <rect x="3" y="7" width="1" height="1" fill="#ffb000" />

      {/* Eyes */}
      <rect x="1" y="5" width="1" height="1" fill="#ffffff" />
      <rect x="3" y="5" width="1" height="1" fill="#ffffff" />

      {/* Speed lines behind */}
      <rect x="0" y="10" width="1" height="1" fill="#555555" />
      <rect x="0" y="11" width="1" height="1" fill="#444444" />
      <rect x="1" y="11" width="1" height="1" fill="#333333" />
    </svg>
  );
}
