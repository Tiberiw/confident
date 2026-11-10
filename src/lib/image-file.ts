/** Decodes an image file. The caller revokes `url` with URL.revokeObjectURL when done. */
export function loadImageFile(file: File): Promise<{ img: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(file);
  return loadImage(url).then(
    (img) => ({ img, url }),
    (e) => {
      URL.revokeObjectURL(url);
      throw e;
    },
  );
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("This file couldn't be read as an image"));
    img.src = src;
  });
}
