const GOLDEN_ANGLE_DEGREES = 137.508;
const BASE_HUE_DEGREES = 26;
const PLAYER_CURSOR_SATURATION = 0.9;
const PLAYER_CURSOR_LIGHTNESS = 0.68;

const hslToRgb = (h: number, s: number, l: number): number => {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const huePrime = h / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));

  let r = 0;
  let g = 0;
  let b = 0;

  if (huePrime >= 0 && huePrime < 1) {
    r = chroma;
    g = x;
  } else if (huePrime < 2) {
    r = x;
    g = chroma;
  } else if (huePrime < 3) {
    g = chroma;
    b = x;
  } else if (huePrime < 4) {
    g = x;
    b = chroma;
  } else if (huePrime < 5) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  const m = l - chroma / 2;
  const toByte = (value: number): number => Math.round((value + m) * 255);

  const red = toByte(r);
  const green = toByte(g);
  const blue = toByte(b);

  return (red << 16) | (green << 8) | blue;
};

export const resolvePlayerCursorTint = (playerId: number): number => {
  const playerIndex = Math.max(0, Math.trunc(playerId) - 1);
  const hue = (BASE_HUE_DEGREES + playerIndex * GOLDEN_ANGLE_DEGREES) % 360;
  const baseColor = hslToRgb(hue, PLAYER_CURSOR_SATURATION, PLAYER_CURSOR_LIGHTNESS);
  return baseColor;
};
