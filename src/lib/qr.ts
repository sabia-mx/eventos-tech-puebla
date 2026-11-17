import { toString } from 'qrcode';

export async function qrSvg(url: string, color: string): Promise<string> {
  const raw = await toString(url, {
    type: 'svg',
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: color,
      light: '#ffffff',
    },
  });

  const svg = raw
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s(?:width|height)="[^"]*"/g, '')
    .trim();

  if (!svg.startsWith('<svg') || /<script/i.test(svg)) {
    throw new Error(`Could not build a QR for ${url}`);
  }

  return svg;
}
