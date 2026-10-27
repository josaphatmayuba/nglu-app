// Redimensionne/compresse une image (jpeg/png/webp) avant upload : max 2000 px, JPEG 0.8.
// Renvoie le File d'origine pour les non-images, PDF, erreurs, ou si la taille n'est pas réduite.
const MAX_SIDE = 2000;
const QUALITY = 0.8;

export async function compressImage(file) {
  try {
    if (typeof document === "undefined" || !file || !/^image\/(jpeg|png|webp)$/.test(file.type || "")) return file;
    const bitmap = typeof createImageBitmap === "function"
      ? await createImageBitmap(file)
      : await new Promise((resolve, reject) => {
          const img = new Image();
          const url = URL.createObjectURL(file);
          img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
          img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
          img.src = url;
        });
    const w = bitmap.width, h = bitmap.height;
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; // fond blanc pour PNG/WebP transparents
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if (bitmap.close) bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const name = (file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
