export const PAPER = '#f6f3ec';
export const CARD = '#fffdfb';
export const INK = '#1c1b19';
export const ON_SOLID_LIGHT = '#fffdfb';

const HEX = /^#[0-9a-f]{6}$/;

export interface AccentPaint {
  accent: string;
  accentInk: string;
  solid: string;
  onSolid: string;
}

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(red: number, green: number, blue: number): string {
  const part = (channel: number) => Math.round(channel).toString(16).padStart(2, '0');
  return `#${part(red)}${part(green)}${part(blue)}`;
}

function linear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [red, green, blue] = channels(hex);
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

export function contrast(first: string, second: string): number {
  const left = luminance(first);
  const right = luminance(second);
  const [high, low] = left > right ? [left, right] : [right, left];
  return (high + 0.05) / (low + 0.05);
}

function mix(base: string, target: string, amount: number): string {
  const [red, green, blue] = channels(base);
  const [targetRed, targetGreen, targetBlue] = channels(target);
  return toHex(
    red + (targetRed - red) * amount,
    green + (targetGreen - green) * amount,
    blue + (targetBlue - blue) * amount,
  );
}

function untilContrast(hex: string, against: string, minimum: number, toward: string): string {
  let current = hex;
  if (contrast(current, against) >= minimum) return current;
  for (let step = 0; step < 32; step += 1) {
    current = mix(current, toward, 0.07);
    if (contrast(current, against) >= minimum) return current;
  }
  return current;
}

export function paintFor(input: string): AccentPaint {
  const accent = input.toLowerCase();
  if (!HEX.test(accent)) {
    throw new Error(`Expected a #rrggbb color, received ${input}`);
  }

  const accentInk = untilContrast(accent, CARD, 4.5, INK);
  const lightContrast = contrast(ON_SOLID_LIGHT, accent);
  const inkContrast = contrast(INK, accent);
  let solid = accent;
  let onSolid = lightContrast >= inkContrast ? ON_SOLID_LIGHT : INK;

  if (contrast(onSolid, solid) < 4.5) {
    const darker = untilContrast(accent, ON_SOLID_LIGHT, 4.5, INK);
    if (contrast(ON_SOLID_LIGHT, darker) >= 4.5) {
      solid = darker;
      onSolid = ON_SOLID_LIGHT;
    } else {
      solid = untilContrast(accent, INK, 4.5, ON_SOLID_LIGHT);
      onSolid = INK;
    }
  }

  return { accent, accentInk, solid, onSolid };
}

export function dayWash(colors: string[]): string | null {
  if (colors.length === 0) return null;
  const tint = (color: string) => `color-mix(in srgb, ${color} 18%, ${CARD})`;
  if (colors.length === 1) return tint(colors[0] ?? CARD);
  const stops = colors.map((color, index) => {
    const at = (index / (colors.length - 1)) * 100;
    return `${tint(color)} ${at}%`;
  });
  return `linear-gradient(165deg, ${stops.join(', ')})`;
}
