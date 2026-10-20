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
