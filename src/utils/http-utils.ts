import { toBase64 } from './file-utils'

/**
 * Generates a base64 file URL for the given filename.
 */
 export async function generateBase64ImageUrl(filename: string): Promise<string> {
  const image = await toBase64(filename)
  return 'data:image/jpeg;base64,' + image
}
