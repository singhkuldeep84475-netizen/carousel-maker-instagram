import { toPng, toJpeg } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export type ExportFormat = 'png' | 'jpg';

/**
 * Export a single DOM node as an image file download.
 */
export async function exportNodeAsImage(
  node: HTMLElement,
  filename: string,
  format: ExportFormat = 'png'
): Promise<void> {
  const width = node.offsetWidth || 1080;
  const height = node.offsetHeight || 1350;

  const options = {
    canvasWidth: width,
    canvasHeight: height,
    quality: 1,
    pixelRatio: width < 600 ? 3 : 2, // Use 3x for smaller slides to guarantee pristine text metrics
    cacheBust: true,
    style: {
      transform: 'none',
    },
  };

  const dataUrl = format === 'jpg'
    ? await toJpeg(node, options)
    : await toPng(node, options);

  const link = document.createElement('a');
  link.download = `${filename}.${format}`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export multiple DOM nodes as a ZIP of images.
 */
export async function exportAllAsZip(
  nodes: HTMLElement[],
  zipName: string,
  format: ExportFormat = 'png',
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();

  for (let i = 0; i < nodes.length; i++) {
    onProgress?.(i + 1, nodes.length);

    const node = nodes[i];
    const width = node.offsetWidth || 1080;
    const height = node.offsetHeight || 1350;

    const options = {
      canvasWidth: width,
      canvasHeight: height,
      quality: 1,
      pixelRatio: width < 600 ? 3 : 2,
      cacheBust: true,
      style: {
        transform: 'none',
      },
    };

    const dataUrl = format === 'jpg'
      ? await toJpeg(node, options)
      : await toPng(node, options);

    const base64Data = dataUrl.split(',')[1];
    zip.file(`slide-${String(i + 1).padStart(2, '0')}.${format}`, base64Data, { base64: true });
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, `${zipName}_slides.zip`);
}
