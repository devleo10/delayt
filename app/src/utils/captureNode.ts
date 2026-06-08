/** Style props copied before html2canvas (avoids oklch parse errors). */
const CAPTURE_STYLE_PROPS = [
  'color',
  'backgroundColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderTopStyle',
  'borderRightStyle',
  'borderBottomStyle',
  'borderLeftStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'fontSize',
  'fontWeight',
  'fontFamily',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textTransform',
  'wordBreak',
  'display',
  'gridTemplateColumns',
  'gridColumn',
  'gap',
  'alignItems',
  'justifyContent',
  'flexDirection',
  'flexWrap',
  'width',
  'maxWidth',
  'boxSizing',
] as const;

function applyComputedStyles(source: Element, target: HTMLElement): void {
  const computed = window.getComputedStyle(source);
  const style = target.style;

  for (const prop of CAPTURE_STYLE_PROPS) {
    style[prop] = computed[prop];
  }
}

/** Deep-clone a node with computed RGB styles inlined (html2canvas-safe). */
export function cloneWithComputedStyles(node: HTMLElement): HTMLElement {
  const clone = node.cloneNode(false) as HTMLElement;
  applyComputedStyles(node, clone);

  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      clone.appendChild(child.cloneNode(true));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      clone.appendChild(cloneWithComputedStyles(child as HTMLElement));
    }
  });

  return clone;
}

export async function captureNodeAsPng(
  node: HTMLElement,
  filename: string
): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;
  const wrapper = document.createElement('div');
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.style.cssText =
    'position:fixed;left:-10000px;top:0;pointer-events:none;opacity:1;';

  const captureTarget = cloneWithComputedStyles(node);
  wrapper.appendChild(captureTarget);
  document.body.appendChild(wrapper);

  try {
    const bg = window.getComputedStyle(node).backgroundColor || '#1a1e1d';
    const canvas = await html2canvas(captureTarget, {
      backgroundColor: bg,
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    document.body.removeChild(wrapper);
  }
}
