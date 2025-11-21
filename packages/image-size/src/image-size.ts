import imageSize from 'image-size'

export async function getDimensions(input: Buffer) {
  return imageSize(input)
}
