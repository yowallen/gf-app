const MAX_WIDTH = 1200
const TARGET_MAX_CHARS = 700_000 // ~0.7MB data URL, under Firestore 1MB doc limit

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that photo'))
    }
    img.src = url
  })
}

function drawToDataUrl(
  img: HTMLImageElement,
  maxWidth: number,
  quality: number,
): string {
  const scale = Math.min(1, maxWidth / img.width)
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process photo')
  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}

/**
 * Compress a photo in the browser and return a JPEG data URL
 * small enough to store in a Firestore document (free Spark tier).
 */
export async function compressMeetImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Use a JPG, PNG, WEBP, or GIF photo')
  }

  const img = await loadImage(file)
  let maxWidth = MAX_WIDTH
  let quality = 0.75
  let dataUrl = drawToDataUrl(img, maxWidth, quality)

  while (dataUrl.length > TARGET_MAX_CHARS && (quality > 0.4 || maxWidth > 640)) {
    if (quality > 0.4) quality -= 0.1
    else maxWidth = Math.round(maxWidth * 0.8)
    dataUrl = drawToDataUrl(img, maxWidth, quality)
  }

  if (dataUrl.length > TARGET_MAX_CHARS) {
    throw new Error('Photo is still too large after compression — try a smaller one')
  }

  return dataUrl
}
