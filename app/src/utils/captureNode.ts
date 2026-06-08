import { toPng } from 'html-to-image';

/** Resolve any CSS color (including oklch) to a hex string the exporter accepts. */
function resolveHexColor(color: string, fallback: string): string {
  if (!color || color === 'transparent') return fallback;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return fallback;

  try {
    ctx.fillStyle = color;
    const resolved = ctx.fillStyle;
    return typeof resolved === 'string' && resolved.startsWith('#') ? resolved : fallback;
  } catch {
    return fallback;
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Capture a DOM node as PNG.
 * Uses html-to-image (SVG foreignObject) so modern CSS like oklch renders natively.
 */
export async function captureNodeAsPng(
  node: HTMLElement,
  filename: string
): Promise<void> {
  const bg = resolveHexColor(
    window.getComputedStyle(node).backgroundColor,
    '#1a1e1d'
  );

  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: bg,
  });

  downloadBlob(dataUrlToBlob(dataUrl), filename);
}
