export const resolveEventImageSrc = (image, contentType) =>
  image ? `data:${contentType || 'image/jpeg'};base64,${image}` : null;
