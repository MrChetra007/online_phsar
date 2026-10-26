import { describe, expect, it } from 'vitest'
import {
  imageExtensionForType,
  MAX_PRODUCT_IMAGE_BYTES,
  productImagePathFromUrl,
  validateProductImageFile,
} from './image'

describe('validateProductImageFile', () => {
  it('accepts allowed types up to the size limit', () => {
    expect(
      validateProductImageFile({ type: 'image/webp', size: 1024 }),
    ).toBeNull()
    expect(
      validateProductImageFile({
        type: 'image/jpeg',
        size: MAX_PRODUCT_IMAGE_BYTES,
      }),
    ).toBeNull()
  })

  it('rejects unsupported types and oversized files', () => {
    expect(validateProductImageFile({ type: 'image/gif', size: 1024 })).toBe(
      'store.errorImageType',
    )
    expect(
      validateProductImageFile({
        type: 'image/png',
        size: MAX_PRODUCT_IMAGE_BYTES + 1,
      }),
    ).toBe('store.errorImageSize')
  })
})

describe('imageExtensionForType', () => {
  it('maps supported types to file extensions', () => {
    expect(imageExtensionForType('image/jpeg')).toBe('jpg')
    expect(imageExtensionForType('image/png')).toBe('png')
    expect(imageExtensionForType('image/webp')).toBe('webp')
    expect(imageExtensionForType('image/other')).toBe('jpg')
  })
})

describe('productImagePathFromUrl', () => {
  it('extracts and decodes the storage path', () => {
    expect(
      productImagePathFromUrl(
        'https://example.supabase.co/storage/v1/object/public/product-images/store-id/product-id/photo%201.webp',
      ),
    ).toBe('store-id/product-id/photo 1.webp')
  })

  it('returns null for unrelated URLs', () => {
    expect(productImagePathFromUrl('https://example.com/photo.jpg')).toBeNull()
  })
})
