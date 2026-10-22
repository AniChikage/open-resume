export const canvasToPngBlob = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => {
  try {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PNG encoding did not produce a file.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  } catch (error) {
    reject(error);
  }
});

export const saveCanvasAsPng = async (canvas: HTMLCanvasElement, filename: string, saveBlob: (blob:Blob, filename:string) => void) => {
  const blob = await canvasToPngBlob(canvas);
  saveBlob(blob, filename);
};
import { downloadBlob } from './download.ts';

export async function exportResumeAsPng(node: HTMLElement, filename = 'resume.png') {
  const { default: html2canvas } = await import('html2canvas');
  await document.fonts?.ready;
  const rect = node.getBoundingClientRect();
  const width = Math.ceil(rect.width || node.scrollWidth);
  const height = Math.ceil(Math.max(rect.height, node.scrollHeight));
  const options = { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false, width, height, windowWidth: width, windowHeight: height, scrollX: 0, scrollY: 0 };
  let canvas: HTMLCanvasElement;
  try { canvas = await html2canvas(node, { ...options, foreignObjectRendering: true }); }
  catch { canvas = await html2canvas(node, options); }
  await saveCanvasAsPng(canvas, filename, downloadBlob);
}
