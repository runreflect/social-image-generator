import fs from 'fs'

/**
 * Returns the base64 representation of the given filename.
 */
export async function toBase64(filename: string) {
  const file = await fs.promises.readFile(filename)
  return Buffer.from(file).toString('base64')
}

export function checkAndCreateDirectory(directory: string) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory)
  }
}
