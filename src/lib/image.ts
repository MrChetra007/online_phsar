import type { TranslationKey } from './i18n'

export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_PRODUCT_IMAGE_DIMENSION = 1600
export const PRODUCT_IMAGE_QUALITY = 0.82

export const ALLOWED_PRODUCT_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

type FileLike = {
  type: string
  size: number
}

export function validateProductImageFile(
  file: FileLike,
): TranslationKey | null {
  if (!(ALLOWED_PRODUCT_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'store.errorImageType'
  }
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return 'store.errorImageSize'
  }
  return null
}

export function imageExtensionForType(type: string): string {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  return 'jpg'
}

export function productImagePathFromUrl(url: string): string | null {
  const marker = '/storage/v1/object/public/product-images/'
  const index = url.indexOf(marker)
  if (index === -1) return null

  const path = url.slice(index + marker.length).split('?')[0]
  if (!path) return null

  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

export function productImageStoragePath(
  storeId: string,
  productId: string,
  extension: string,
): string {
  return `${storeId}/${productId}/${crypto.randomUUID()}.${extension}`
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('IMAGE_COMPRESSION_FAILED'))
      },
      type,
      quality,
    )
  })
}

export async function compressProductImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  })

  try {
    const scale = Math.min(
      1,
      MAX_PRODUCT_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height),
    )
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) throw new Error('IMAGE_COMPRESSION_FAILED')

    context.drawImage(bitmap, 0, 0, width, height)

    let blob = await canvasToBlob(canvas, 'image/webp', PRODUCT_IMAGE_QUALITY)
    if (blob.type !== 'image/webp') {
      blob = await canvasToBlob(canvas, 'image/jpeg', PRODUCT_IMAGE_QUALITY)
    }

    return blob
  } finally {
    bitmap.close()
  }
}
