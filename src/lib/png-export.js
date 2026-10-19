export const canvasToPngBlob = (canvas) => new Promise((resolve, reject) => {
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

export const saveCanvasAsPng = async (canvas, filename, saveBlob) => {
  const blob = await canvasToPngBlob(canvas);
  saveBlob(blob, filename);
};
