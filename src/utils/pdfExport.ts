import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/**
 * Helper to temporarily silence benign cross-origin Google Fonts CSS rules warnings
 * during html-to-image DOM snapshot capture.
 */
async function withSuppressedCssWarnings<T>(fn: () => Promise<T>): Promise<T> {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  console.error = (...args: any[]) => {
    const msg = String(args[0] || '');
    if (
      msg.includes('remote css') ||
      msg.includes('CSSStyleSheet') ||
      msg.includes('cssRules') ||
      msg.includes('Error inlining remote css') ||
      msg.includes('Error while reading CSS rules')
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
  console.warn = (...args: any[]) => {
    const msg = String(args[0] || '');
    if (
      msg.includes('remote css') ||
      msg.includes('CSSStyleSheet') ||
      msg.includes('cssRules') ||
      msg.includes('Failed to fetch resource')
    ) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  try {
    return await fn();
  } finally {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  }
}

/**
 * Safely loads an image from a URL or Data URI without throwing an unhandled Event rejection.
 */
function loadImageSafe(src: string, timeoutMs = 5000): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (img: HTMLImageElement | null) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(img);
      }
    };

    const timer = setTimeout(() => finish(null), timeoutMs);
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    img.src = src;
  });
}

/**
 * Extracts the first url(...) value from a CSS background-image string.
 */
function extractBackgroundImageUrl(bgImageCss: string | null | undefined): string | null {
  if (!bgImageCss || bgImageCss === 'none') return null;
  const match = bgImageCss.match(/url\((['"]?)(.*?)\1\)/i);
  if (match && match[2]) {
    return match[2].trim();
  }
  return null;
}

/**
 * Draws an image onto a 2D canvas context using 'cover' or 'contain' object-fit math.
 */
function drawImageWithObjectFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dWidth: number,
  dHeight: number,
  fit: 'cover' | 'contain' | 'fill' = 'contain'
) {
  const sWidth = img.naturalWidth || img.width;
  const sHeight = img.naturalHeight || img.height;
  if (!sWidth || !sHeight || !dWidth || !dHeight) return;

  if (fit === 'fill') {
    ctx.drawImage(img, dx, dy, dWidth, dHeight);
    return;
  }

  const scale =
    fit === 'cover'
      ? Math.max(dWidth / sWidth, dHeight / sHeight)
      : Math.min(dWidth / sWidth, dHeight / sHeight);

  const renderW = sWidth * scale;
  const renderH = sHeight * scale;
  const offsetX = dx + (dWidth - renderW) / 2;
  const offsetY = dy + (dHeight - renderH) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, dWidth, dHeight);
  ctx.clip();
  ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
  ctx.restore();
}

/**
 * Pre-converts any live <img> inside `element` to an inline data URL so html-to-image
 * never triggers network/CORS/decode rejections, and replaces broken images with a 1x1 pixel.
 * Returns a cleanup callback that restores original `src` attributes.
 */
async function inlineLiveImages(element: HTMLElement): Promise<() => void> {
  const restorers: Array<() => void> = [];
  const imgs = Array.from(element.querySelectorAll('img'));

  for (const img of imgs) {
    const origSrc = img.getAttribute('src') || '';
    if (!origSrc) {
      img.setAttribute('src', TRANSPARENT_PIXEL);
      restorers.push(() => img.setAttribute('src', origSrc));
      continue;
    }

    if (origSrc.startsWith('data:')) {
      continue;
    }

    try {
      let sourceImg: HTMLImageElement | null = img;
      if (!img.complete || img.naturalWidth === 0) {
        sourceImg = await loadImageSafe(img.src, 3000);
      }

      if (sourceImg && sourceImg.naturalWidth > 0 && sourceImg.naturalHeight > 0) {
        const c = document.createElement('canvas');
        c.width = sourceImg.naturalWidth;
        c.height = sourceImg.naturalHeight;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(sourceImg, 0, 0);
          const dataUrl = c.toDataURL('image/png');
          img.setAttribute('src', dataUrl);
          restorers.push(() => img.setAttribute('src', origSrc));
        }
      } else {
        img.setAttribute('src', TRANSPARENT_PIXEL);
        restorers.push(() => img.setAttribute('src', origSrc));
      }
    } catch {
      // Leave as-is if tainted, or fallback if broken
      if (!img.complete || img.naturalWidth === 0) {
        img.setAttribute('src', TRANSPARENT_PIXEL);
        restorers.push(() => img.setAttribute('src', origSrc));
      }
    }
  }

  return () => {
    for (const restore of restorers) {
      try {
        restore();
      } catch {
        // Ignore restore errors
      }
    }
  };
}

/**
 * Draws a rounded rectangle path onto a 2D canvas context.
 */
function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Normalizes any CSS color (including Tailwind v4 oklch/oklab/color-mix) into standard rgba/hex
 * that CanvasRenderingContext2D understands across all browsers.
 */
let colorProbeCtx: CanvasRenderingContext2D | null = null;
function normalizeCssColor(colorStr: string | null | undefined, fallback = 'transparent'): string {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') {
    return 'transparent';
  }
  try {
    if (!colorProbeCtx) {
      const c = document.createElement('canvas');
      c.width = 1;
      c.height = 1;
      colorProbeCtx = c.getContext('2d', { willReadFrequently: true });
    }
    if (!colorProbeCtx) return fallback;
    colorProbeCtx.clearRect(0, 0, 1, 1);
    colorProbeCtx.fillStyle = '#000000';
    colorProbeCtx.fillStyle = colorStr;
    // If browser supports the color directly in canvas, return it or sample pixel
    if (!colorStr.includes('oklch') && !colorStr.includes('oklab') && !colorStr.includes('color-mix')) {
      return colorProbeCtx.fillStyle || colorStr;
    }
    colorProbeCtx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = colorProbeCtx.getImageData(0, 0, 1, 1).data;
    if (a === 0) return 'transparent';
    return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
  } catch {
    return fallback;
  }
}

/**
 * Direct Native 2D Canvas DOM Renderer Fallback.
 * Renders the certificate or report DOM tree directly onto an HTML5 2D Canvas using live
 * layout coordinates (`getBoundingClientRect` + `Range.getClientRects`) without relying on SVG `<foreignObject>`.
 */
async function renderDomDirectlyToCanvas(
  rootElement: HTMLElement,
  targetWidth: number,
  targetHeight: number,
  scale: number,
  bgImage: HTMLImageElement | null
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(targetWidth * scale);
  canvas.height = Math.round(targetHeight * scale);
  const ctx = canvas.getContext('2d')!;

  ctx.save();
  ctx.scale(scale, scale);

  // 1. Base white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // 2. Draw background image if present
  if (bgImage) {
    drawImageWithObjectFit(ctx, bgImage, 0, 0, targetWidth, targetHeight, 'cover');
  }

  const rootRect = rootElement.getBoundingClientRect();
  const scaleX = rootRect.width > 0 ? targetWidth / rootRect.width : 1;
  const scaleY = rootRect.height > 0 ? targetHeight / rootRect.height : 1;

  const toLocalRect = (r: DOMRect) => ({
    x: (r.left - rootRect.left) * scaleX,
    y: (r.top - rootRect.top) * scaleY,
    w: r.width * scaleX,
    h: r.height * scaleY,
  });

  // Collect all elements in painting order
  const elements: HTMLElement[] = [rootElement];
  const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_ELEMENT);
  let currentNode = walker.nextNode();
  while (currentNode) {
    if (currentNode instanceof HTMLElement && !currentNode.classList.contains('no-print')) {
      elements.push(currentNode);
    }
    currentNode = walker.nextNode();
  }

  for (const el of elements) {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') === 0) {
      continue;
    }

    const rect = toLocalRect(el.getBoundingClientRect());
    if (rect.w <= 0 || rect.h <= 0) continue;

    const radius = parseFloat(style.borderTopLeftRadius || '0') || 0;

    // Draw background color (skip root if bgImage already drawn)
    if (el !== rootElement) {
      const bgColor = normalizeCssColor(style.backgroundColor);
      if (bgColor !== 'transparent') {
        ctx.save();
        traceRoundedRect(ctx, rect.x, rect.y, rect.w, rect.h, radius);
        ctx.fillStyle = bgColor;
        ctx.fill();
        ctx.restore();
      }
    }

    // Draw borders
    const bt = parseFloat(style.borderTopWidth || '0') || 0;
    const br = parseFloat(style.borderRightWidth || '0') || 0;
    const bb = parseFloat(style.borderBottomWidth || '0') || 0;
    const bl = parseFloat(style.borderLeftWidth || '0') || 0;

    if (bt > 0 && br > 0 && bb > 0 && bl > 0) {
      const bColor = normalizeCssColor(style.borderTopColor, '#d97706');
      if (bColor !== 'transparent') {
        ctx.save();
        const half = bt / 2;
        traceRoundedRect(ctx, rect.x + half, rect.y + half, rect.w - bt, rect.h - bt, Math.max(0, radius - half));
        ctx.strokeStyle = bColor;
        ctx.lineWidth = bt;
        ctx.stroke();
        ctx.restore();
      }
    } else if (bt > 0 || bb > 0) {
      if (bt > 0) {
        const bColor = normalizeCssColor(style.borderTopColor, '#cbd5e1');
        if (bColor !== 'transparent') {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(rect.x, rect.y + bt / 2);
          ctx.lineTo(rect.x + rect.w, rect.y + bt / 2);
          ctx.strokeStyle = bColor;
          ctx.lineWidth = bt;
          ctx.stroke();
          ctx.restore();
        }
      }
      if (bb > 0) {
        const bColor = normalizeCssColor(style.borderBottomColor, '#cbd5e1');
        if (bColor !== 'transparent') {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(rect.x, rect.y + rect.h - bb / 2);
          ctx.lineTo(rect.x + rect.w, rect.y + rect.h - bb / 2);
          ctx.strokeStyle = bColor;
          ctx.lineWidth = bb;
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Draw <img> elements
    if (el instanceof HTMLImageElement) {
      let imgToDraw: HTMLImageElement | null = el;
      if (!el.complete || el.naturalWidth === 0) {
        imgToDraw = await loadImageSafe(el.src, 2500);
      }
      if (imgToDraw && imgToDraw.naturalWidth > 0) {
        const fit = style.objectFit === 'cover' ? 'cover' : 'contain';
        drawImageWithObjectFit(ctx, imgToDraw, rect.x, rect.y, rect.w, rect.h, fit);
      }
    }

    // Draw direct child text nodes
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType !== Node.TEXT_NODE) continue;
      const rawText = child.textContent || '';
      if (!rawText.trim()) continue;

      const fontWeight = style.fontWeight || '400';
      const fontSize = parseFloat(style.fontSize || '16') || 16;
      const fontFamily = style.fontFamily || "'Sarabun', 'Prompt', sans-serif";
      const textColor = normalizeCssColor(style.color, '#0f172a');

      ctx.save();
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = textColor;
      ctx.textBaseline = 'middle';

      const range = document.createRange();
      range.selectNodeContents(child);
      const clientRects = Array.from(range.getClientRects());

      if (clientRects.length <= 1) {
        const r = clientRects[0] ? toLocalRect(clientRects[0]) : rect;
        const textAlign = style.textAlign;
        const trimmed = rawText.replace(/\s+/g, ' ').trim();
        if (textAlign === 'center') {
          ctx.textAlign = 'center';
          ctx.fillText(trimmed, rect.x + rect.w / 2, r.y + r.h / 2);
        } else if (textAlign === 'right' || textAlign === 'end') {
          ctx.textAlign = 'right';
          ctx.fillText(trimmed, r.x + r.w, r.y + r.h / 2);
        } else {
          ctx.textAlign = 'left';
          ctx.fillText(trimmed, r.x, r.y + r.h / 2);
        }
      } else {
        // Multi-line text node: wrap words to fit parent width
        const words = rawText.replace(/\s+/g, ' ').trim().split(' ');
        const lines: string[] = [];
        let currentLine = '';
        const maxW = rect.w - 4;

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (ctx.measureText(testLine).width <= maxW || !currentLine) {
            currentLine = testLine;
          } else {
            lines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) lines.push(currentLine);

        const lineH = parseFloat(style.lineHeight) || fontSize * 1.15;
        const totalH = lines.length * lineH;
        const startY = rect.y + (rect.h - totalH) / 2 + lineH / 2;
        const textAlign = style.textAlign;

        lines.forEach((line, idx) => {
          const yPos = startY + idx * lineH;
          if (textAlign === 'center') {
            ctx.textAlign = 'center';
            ctx.fillText(line, rect.x + rect.w / 2, yPos);
          } else if (textAlign === 'right' || textAlign === 'end') {
            ctx.textAlign = 'right';
            ctx.fillText(line, rect.x + rect.w, yPos);
          } else {
            ctx.textAlign = 'left';
            ctx.fillText(line, rect.x, yPos);
          }
        });
      }
      ctx.restore();
    }
  }

  ctx.restore();
  return canvas;
}

/**
 * Captures any certificate or report DOM element to a high-resolution JPEG Data URL.
 * Separates heavy background Data URLs before SVG serialization so Chromium's 2MB data: URL
 * limit is never exceeded, and falls back to `renderDomDirectlyToCanvas` if SVG foreignObject fails.
 */
async function captureElementHighResJpeg(
  element: HTMLElement,
  targetWidth: number,
  targetHeight: number,
  scale = 3
): Promise<string> {
  return withSuppressedCssWarnings(async () => {
    if (document.fonts) {
      try {
        await document.fonts.ready;
      } catch {
        // Ignore font ready errors
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Extract any background-image URL so we can render it directly on canvas
    // instead of duplicating a 500KB+ base64 string inside SVG foreignObject styles
    const inlineBgImage = element.style.backgroundImage;
    const computedBgImage = window.getComputedStyle(element).backgroundImage;
    const bgUrl =
      extractBackgroundImageUrl(inlineBgImage) || extractBackgroundImageUrl(computedBgImage);

    const bgImgElement = bgUrl ? await loadImageSafe(bgUrl, 4000) : null;

    // Pre-inline live <img> tags (logo, signature) so html-to-image never fails fetching them
    const restoreImages = await inlineLiveImages(element);

    // Temporarily remove heavy backgroundImage from element during foreground capture
    const prevBgImage = element.style.backgroundImage;
    const prevBgColor = element.style.backgroundColor;

    try {
      if (bgImgElement) {
        element.style.backgroundImage = 'none';
        element.style.backgroundColor = 'transparent';
      }

      const fgDataUrl = await toPng(element, {
        quality: 0.98,
        pixelRatio: scale,
        width: targetWidth,
        height: targetHeight,
        backgroundColor: bgImgElement ? undefined : '#ffffff',
        cacheBust: false,
        skipFonts: true,
        fontEmbedCSS: '',
        imagePlaceholder: TRANSPARENT_PIXEL,
        onImageErrorHandler: () => true,
        style: {
          margin: '0px',
          marginLeft: '0px',
          marginRight: '0px',
          marginTop: '0px',
          marginBottom: '0px',
          width: `${targetWidth}px`,
          height: `${targetHeight}px`,
          minWidth: `${targetWidth}px`,
          minHeight: `${targetHeight}px`,
          maxWidth: `${targetWidth}px`,
          maxHeight: `${targetHeight}px`,
          boxSizing: 'border-box',
          boxShadow: 'none',
          borderRadius: '0px',
          transform: 'none',
          overflow: 'hidden',
        },
        filter: (node: Node) => {
          if (node instanceof HTMLElement && node.classList.contains('no-print')) {
            return false;
          }
          return true;
        },
      });

      const fgImg = await loadImageSafe(fgDataUrl, 4000);
      if (fgImg) {
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = Math.round(targetWidth * scale);
        finalCanvas.height = Math.round(targetHeight * scale);
        const ctx = finalCanvas.getContext('2d')!;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

        if (bgImgElement) {
          drawImageWithObjectFit(
            ctx,
            bgImgElement,
            0,
            0,
            finalCanvas.width,
            finalCanvas.height,
            'cover'
          );
        }

        ctx.drawImage(fgImg, 0, 0, finalCanvas.width, finalCanvas.height);
        return finalCanvas.toDataURL('image/jpeg', 0.96);
      }
    } catch {
      // Fall through to direct 2D Canvas renderer
    } finally {
      element.style.backgroundImage = prevBgImage;
      element.style.backgroundColor = prevBgColor;
      restoreImages();
    }

    // Fallback: Direct 2D Canvas DOM Renderer (never uses SVG foreignObject, 100% reliable)
    const fallbackCanvas = await renderDomDirectlyToCanvas(
      element,
      targetWidth,
      targetHeight,
      scale,
      bgImgElement
    );
    return fallbackCanvas.toDataURL('image/jpeg', 0.96);
  });
}

/**
 * Internal helper that captures the certificate DOM element at locked A4 Landscape
 * dimensions (840px x 594px -> 29.7cm x 21.0cm) with zero margin offset and builds a jsPDF document.
 */
async function buildCertificatePdf(
  element: HTMLElement,
  recipientName: string
): Promise<{ pdf: jsPDF; dataUrl: string; filename: string }> {
  // Exact A4 landscape canvas coordinate system (840 / 594 = 297 / 210 = 1.41414)
  const targetWidth = 840;
  const targetHeight = 594;

  const dataUrl = await captureElementHighResJpeg(element, targetWidth, targetHeight, 3);

  // Create A4 Landscape PDF (297mm wide x 210mm high = 29.7cm x 21.0cm)
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [297, 210],
    compress: true,
  });

  // Safe 3.5mm x 2.5mm margin inside the 297mm x 210mm sheet so the outer border
  // fits 100% within the paper and never overflows or clips on any printer/viewer
  const marginX = 3.5; // mm
  const marginY = 2.5; // mm
  const printWidth = 297 - marginX * 2; // 290mm
  const printHeight = 210 - marginY * 2; // 205mm

  pdf.addImage(dataUrl, 'JPEG', marginX, marginY, printWidth, printHeight, undefined, 'FAST');

  const cleanName = recipientName ? recipientName.trim().replace(/\s+/g, '_') : 'ผู้ผ่านการอบรม';
  const filename = `เกียรติบัตร_${cleanName}_สพป_สุโขทัย_เขต2.pdf`;

  return { pdf, dataUrl, filename };
}

/**
 * Downloads an HTML element as an official A4 landscape PDF certificate (29.7cm x 21cm).
 * Fits inside the page perfectly without any clipping ("อยู่ในหน้ากระดาษพอดี ไม่หลุดขอบ").
 */
export async function downloadCertificatePdf(
  element: HTMLElement | null,
  recipientName: string,
  onProgress?: (loading: boolean) => void
): Promise<boolean> {
  if (!element) {
    return false;
  }

  try {
    onProgress?.(true);
    const { pdf, filename } = await buildCertificatePdf(element, recipientName);
    pdf.save(filename);
    return true;
  } catch {
    await printCertificate(element, recipientName);
    return false;
  } finally {
    onProgress?.(false);
  }
}

/**
 * Triggers a clean, reliable A4 landscape print flow for the certificate.
 * 1. Synchronously mounts a dedicated print clone on document.body and attempts native window.print().
 * 2. If running inside a sandboxed preview iframe where native window.print() is ignored,
 *    automatically opens an interactive A4 Landscape PDF Print Preview modal with autoPrint enabled.
 */
export async function printCertificate(
  element: HTMLElement | null,
  recipientName: string,
  onProgress?: (loading: boolean) => void
): Promise<void> {
  if (!element) return;

  const prevTitle = document.title;
  const cleanName = (recipientName || 'สพป_สุโขทัย_เขต2').trim().replace(/\s+/g, '_');
  document.title = `เกียรติบัตร_${cleanName}`;

  // Remove any previous print mount
  const existingMount = document.getElementById('direct-print-mount');
  if (existingMount) {
    existingMount.remove();
  }

  // 1. Synchronously create top-level print mount on document.body so user gesture is preserved
  const printMount = document.createElement('div');
  printMount.id = 'direct-print-mount';
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.margin = '0';
  clone.style.width = '840px';
  clone.style.height = '594px';
  clone.style.maxWidth = '840px';
  clone.style.maxHeight = '594px';
  clone.style.boxShadow = 'none';
  clone.style.borderRadius = '0';
  printMount.appendChild(clone);
  document.body.appendChild(printMount);

  const startTime = Date.now();
  let printDialogOpened = false;

  const handleBeforePrint = () => {
    printDialogOpened = true;
  };
  window.addEventListener('beforeprint', handleBeforePrint, { once: true });

  try {
    window.print();
  } catch {
    // Ignore synchronous print error
  }

  window.removeEventListener('beforeprint', handleBeforePrint);
  const elapsed = Date.now() - startTime;

  // Cleanup print mount after native print
  setTimeout(() => {
    const m = document.getElementById('direct-print-mount');
    if (m) m.remove();
    document.title = prevTitle;
  }, 1500);

  // If native window.print() was blocked by iframe sandbox (returned immediately without beforeprint),
  // build the exact A4 Landscape PDF with autoPrint and display the interactive Print Modal.
  if (!printDialogOpened && elapsed < 150) {
    try {
      onProgress?.(true);
      const { pdf, dataUrl, filename } = await buildCertificatePdf(element, recipientName);
      pdf.autoPrint({ variant: 'non-conform' });
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      showPdfPrintModal(
        blobUrl,
        dataUrl,
        filename,
        'พรีวิวการพิมพ์เกียรติบัตร (ขนาด A4 แนวนอน 29.7 x 21 ซม.)',
        'จัดหน้ากระดาษพอดีกรอบ A4 แนวนอน พร้อมพิมพ์หรือบันทึกเป็นไฟล์ PDF',
        () => {
          pdf.save(filename);
        }
      );
    } finally {
      onProgress?.(false);
    }
  }
}

/**
 * Internal helper that captures the Survey Infographic Report DOM element and builds an A4 Portrait jsPDF document.
 */
async function buildSurveyReportPdf(
  element: HTMLElement,
  reportTitle: string = 'รายงานสรุปผลแบบสอบถาม_สพป_สุโขทัย_เขต2'
): Promise<{ pdf: jsPDF; dataUrl: string; filename: string }> {
  const rect = element.getBoundingClientRect();
  const targetWidth = Math.max(rect.width || element.offsetWidth || 760, 720);
  const targetHeight = Math.max(rect.height || element.offsetHeight || 1020, 800);

  const dataUrl = await captureElementHighResJpeg(element, targetWidth, targetHeight, 2.5);

  // A4 Portrait (210mm x 297mm)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 8; // 8mm safe margin around A4 sheet
  const maxPrintW = pageWidth - margin * 2; // 194mm
  const maxPrintH = pageHeight - margin * 2; // 281mm

  const imgRatio = targetWidth / targetHeight;
  let renderW = maxPrintW;
  let renderH = renderW / imgRatio;

  // If taller than 1 A4 page height, scale down proportionally so it fits on a single A4 Infographic sheet
  if (renderH > maxPrintH) {
    renderH = maxPrintH;
    renderW = renderH * imgRatio;
  }

  const offsetX = (pageWidth - renderW) / 2;
  const offsetY = margin;

  pdf.addImage(dataUrl, 'JPEG', offsetX, offsetY, renderW, renderH, undefined, 'FAST');

  const cleanTitle = reportTitle.trim().replace(/\s+/g, '_');
  const filename = `${cleanTitle}.pdf`;

  return { pdf, dataUrl, filename };
}

/**
 * Downloads the Survey Infographic Report as an A4 Portrait PDF file.
 */
export async function downloadSurveyReportPdf(
  element: HTMLElement | null,
  reportTitle: string = 'รายงานสรุปผลแบบสอบถาม_สพป_สุโขทัย_เขต2',
  onProgress?: (loading: boolean) => void
): Promise<boolean> {
  if (!element) {
    return false;
  }

  try {
    onProgress?.(true);
    const { pdf, filename } = await buildSurveyReportPdf(element, reportTitle);
    pdf.save(filename);
    return true;
  } catch {
    return false;
  } finally {
    onProgress?.(false);
  }
}

/**
 * Prints or opens Print Preview for the Survey Infographic Report (A4 Portrait).
 */
export async function printSurveyReport(
  element: HTMLElement | null,
  reportTitle: string = 'รายงานสรุปผลแบบสอบถาม_สพป_สุโขทัย_เขต2',
  onProgress?: (loading: boolean) => void
): Promise<void> {
  if (!element) return;

  try {
    onProgress?.(true);
    const { pdf, dataUrl, filename } = await buildSurveyReportPdf(element, reportTitle);
    pdf.autoPrint({ variant: 'non-conform' });
    const pdfBlob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    showPdfPrintModal(
      blobUrl,
      dataUrl,
      filename,
      'พรีวิวรายงานสรุปผลแบบสอบถามความพึงพอใจ (ขนาด A4)',
      'พร้อมสั่งพิมพ์ออกเครื่องพิมพ์ หรือดาวน์โหลดเป็นไฟล์ PDF',
      () => {
        pdf.save(filename);
      }
    );
  } finally {
    onProgress?.(false);
  }
}

/**
 * Displays an in-app Print Preview & Print Dialog when browser iframe sandboxing
 * blocks native window.print(), ensuring the "พิมพ์" and "ดาวน์โหลด PDF" buttons always work seamlessly.
 */
function showPdfPrintModal(
  blobUrl: string,
  imageDataUrl: string,
  filename: string,
  modalTitle: string,
  modalSubtitle: string,
  onDownload: () => void
) {
  const existingModal = document.getElementById('cert-print-preview-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const overlay = document.createElement('div');
  overlay.id = 'cert-print-preview-modal';
  overlay.className =
    'fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fadeIn no-print';
  overlay.style.fontFamily = "'Prompt', sans-serif";

  overlay.innerHTML = `
    <div class="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border-2 border-amber-200 overflow-hidden">
      <div class="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold">
            🖨️
          </div>
          <div>
            <h3 class="font-extrabold text-sm sm:text-base text-white">${modalTitle}</h3>
            <p class="text-[11px] text-slate-300">${modalSubtitle}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button id="cert-modal-download-btn" class="px-4 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow transition cursor-pointer flex items-center gap-1.5">
            <span>⬇️ ดาวน์โหลดไฟล์ PDF</span>
          </button>
          <button id="cert-modal-print-btn" class="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow transition cursor-pointer flex items-center gap-1.5">
            <span>🖨️ สั่งพิมพ์</span>
          </button>
          <button id="cert-modal-close-btn" class="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition cursor-pointer">
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
      <div class="p-4 sm:p-6 bg-slate-100 flex-1 overflow-auto flex flex-col items-center justify-center gap-4">
        <div class="bg-white p-2 rounded-lg shadow-xl border border-slate-300 max-w-full overflow-auto">
          <img src="${imageDataUrl}" alt="PDF Preview" class="w-[740px] max-w-full h-auto block" />
        </div>
        <iframe id="cert-hidden-pdf-frame" src="${blobUrl}" class="w-0 h-0 border-0 absolute opacity-0 pointer-events-none" title="PDF Print Frame"></iframe>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => {
    URL.revokeObjectURL(blobUrl);
    overlay.remove();
  };

  const closeBtn = overlay.querySelector('#cert-modal-close-btn');
  closeBtn?.addEventListener('click', closeModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  const downloadBtn = overlay.querySelector('#cert-modal-download-btn');
  downloadBtn?.addEventListener('click', () => {
    onDownload();
  });

  const printBtn = overlay.querySelector('#cert-modal-print-btn');
  printBtn?.addEventListener('click', () => {
    const pdfFrame = overlay.querySelector('#cert-hidden-pdf-frame') as HTMLIFrameElement | null;
    try {
      if (pdfFrame?.contentWindow) {
        pdfFrame.contentWindow.focus();
        pdfFrame.contentWindow.print();
      } else {
        onDownload();
      }
    } catch {
      onDownload();
    }
  });

  // Automatically trigger the embedded PDF iframe's print dialog once loaded
  const pdfFrame = overlay.querySelector('#cert-hidden-pdf-frame') as HTMLIFrameElement | null;
  if (pdfFrame) {
    pdfFrame.addEventListener('load', () => {
      setTimeout(() => {
        try {
          pdfFrame.contentWindow?.focus();
          pdfFrame.contentWindow?.print();
        } catch {
          // User can click print or download button manually
        }
      }, 300);
    });
  }
}
