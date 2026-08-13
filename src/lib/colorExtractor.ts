// ─── colorExtractor.ts ────────────────────────────────────────────────────────
// 100% client-side color palette extraction using Canvas + median-cut algorithm.
// No external API calls or paid AI services.

// ─── Types ────────────────────────────────────────────────────────────────────

export type Orientation = 'portrait' | 'landscape';
export type FontCategory = 'serif' | 'sans-serif' | 'script' | 'display';

export interface ExtractedStyle {
  palette: string[];        // hex strings, e.g. ['#1a2b3c', ...]
  orientation: Orientation;
  aspectRatio: number;      // width / height
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

interface RGB { r: number; g: number; b: number }

function toHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

/** Average colour of a bucket of pixels */
function average(pixels: RGB[]): RGB {
  const n = pixels.length;
  if (n === 0) return { r: 128, g: 128, b: 128 };
  const sum = pixels.reduce(
    (acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b }),
    { r: 0, g: 0, b: 0 }
  );
  return { r: sum.r / n, g: sum.g / n, b: sum.b / n };
}

/** Median-cut: split the widest colour channel recursively */
function medianCut(pixels: RGB[], depth: number): RGB[] {
  if (depth === 0 || pixels.length === 0) {
    return [average(pixels)];
  }

  const rRange = Math.max(...pixels.map((p) => p.r)) - Math.min(...pixels.map((p) => p.r));
  const gRange = Math.max(...pixels.map((p) => p.g)) - Math.min(...pixels.map((p) => p.g));
  const bRange = Math.max(...pixels.map((p) => p.b)) - Math.min(...pixels.map((p) => p.b));

  const channel: keyof RGB = rRange >= gRange && rRange >= bRange ? 'r' : gRange >= bRange ? 'g' : 'b';
  const sorted = [...pixels].sort((a, b) => a[channel] - b[channel]);
  const mid = Math.floor(sorted.length / 2);

  return [
    ...medianCut(sorted.slice(0, mid), depth - 1),
    ...medianCut(sorted.slice(mid), depth - 1),
  ];
}

/**
 * Ensures extracted colours have enough visual contrast from each other.
 * Removes duplicates that are perceptually too similar (Euclidean distance < threshold).
 */
function deduplicate(colors: RGB[], threshold = 30): RGB[] {
  const result: RGB[] = [];
  for (const c of colors) {
    const tooClose = result.some((r) => {
      const d = Math.sqrt((c.r - r.r) ** 2 + (c.g - r.g) ** 2 + (c.b - r.b) ** 2);
      return d < threshold;
    });
    if (!tooClose) result.push(c);
  }
  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Loads a File or Blob into an HTMLImageElement.
 * Resolves with the image element (already loaded).
 */
export function loadImageFromBlob(blob: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível carregar a imagem.'));
    };
    img.src = url;
  });
}

/**
 * Extracts a colour palette from an HTMLImageElement using the median-cut algorithm.
 * @param img - Already-loaded HTMLImageElement
 * @param paletteSize - Number of colours to extract (default 5)
 * @param sampleRate - Read every Nth pixel to speed up (default 4)
 * @returns Array of hex colour strings
 */
export function extractPalette(
  img: HTMLImageElement,
  paletteSize = 5,
  sampleRate = 4
): string[] {
  const maxDim = 300; // downsample to speed up
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.floor(img.width * scale);
  const h = Math.floor(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return ['#888888'];

  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const pixels: RGB[] = [];
  for (let i = 0; i < data.length; i += 4 * sampleRate) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    // Skip near-transparent, near-black, and near-white pixels
    if (a < 128) continue;
    if (r > 245 && g > 245 && b > 245) continue;
    if (r < 10 && g < 10 && b < 10) continue;
    pixels.push({ r, g, b });
  }

  if (pixels.length === 0) return ['#1a1a1a', '#888888', '#eeeeee'];

  // depth = log2(paletteSize) gives us ~paletteSize buckets
  const depth = Math.ceil(Math.log2(paletteSize));
  const rawColors = medianCut(pixels, depth);
  const unique = deduplicate(rawColors);

  // Sort by perceived luminance (darkest to lightest) for a nice palette order
  const sorted = unique.sort((a, b) => {
    const lumaA = 0.299 * a.r + 0.587 * a.g + 0.114 * a.b;
    const lumaB = 0.299 * b.r + 0.587 * b.g + 0.114 * b.b;
    return lumaA - lumaB;
  });

  return sorted.slice(0, paletteSize).map(toHex);
}

/**
 * Detects orientation and aspect ratio from image dimensions.
 */
export function detectOrientation(width: number, height: number): { orientation: Orientation; aspectRatio: number } {
  const aspectRatio = parseFloat((width / height).toFixed(4));
  return {
    orientation: width >= height ? 'landscape' : 'portrait',
    aspectRatio,
  };
}

/**
 * Renders the first page of a PDF file to an image Blob using pdfjs-dist.
 * Uses dynamic import to avoid bundling pdfjs in the main chunk.
 * @param file - PDF File object
 * @param scale - Render scale (default 1.5 for good quality)
 */
export async function renderPdfFirstPage(file: File, scale = 1.5): Promise<Blob> {
  // Dynamic import avoids including pdfjs in the main bundle eagerly
  const pdfjsLib = await import('pdfjs-dist');

  // Set worker — pdfjs-dist v4+ bundles the worker automatically when using
  // the ESM build; for v6 we point to the bundled worker URL.
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString();
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context não disponível.');

  await page.render({ canvas, viewport }).promise;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Falha ao converter PDF para imagem.'));
      },
      'image/png'
    );
  });
}

/**
 * Full extraction pipeline: given a File (image or PDF), returns
 * the extracted style (palette, orientation, aspectRatio).
 */
export async function extractStyleFromFile(file: File): Promise<{
  style: ExtractedStyle;
  previewBlob: Blob;
}> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  let previewBlob: Blob;
  if (isPdf) {
    previewBlob = await renderPdfFirstPage(file);
  } else {
    previewBlob = file;
  }

  const img = await loadImageFromBlob(previewBlob);
  const palette = extractPalette(img, 5);
  const { orientation, aspectRatio } = detectOrientation(img.naturalWidth, img.naturalHeight);

  return {
    style: { palette, orientation, aspectRatio },
    previewBlob,
  };
}
