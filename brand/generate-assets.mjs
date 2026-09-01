import sharp from 'sharp'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const assets = join(root, 'assets')
const templates = join(root, 'templates')
const publicEmail = join(root, '..', 'public', 'email')

await mkdir(assets, { recursive: true })
await mkdir(publicEmail, { recursive: true })

for (const size of [64, 128, 256, 512]) {
  await sharp(join(assets, 'symbol-primary.svg')).resize(size, size).png().toFile(join(assets, `symbol-primary-${size}.png`))
}

for (const [source, target, width] of [
  ['logo-nexlab-primary.svg', 'logo-nexlab-primary.png', 1280],
  ['logo-nexlab-reverse.svg', 'logo-nexlab-reverse.png', 1280],
  ['logo-nexlab-mono-dark.svg', 'logo-nexlab-mono-dark.png', 1280],
  ['logo-nexlab-mono-light.svg', 'logo-nexlab-mono-light.png', 1280],
]) {
  await sharp(join(assets, source)).resize({ width }).png().toFile(join(assets, target))
}

await sharp(join(templates, 'social-card.svg')).png().toFile(join(templates, 'social-card.png'))
await sharp(join(templates, 'presentation-cover.svg')).png().toFile(join(templates, 'presentation-cover.png'))
await sharp(join(assets, 'logo-nexlab-reverse.svg'))
  .resize({ width: 400 })
  .png()
  .toFile(join(publicEmail, 'logo-nexlab-reverse.png'))
await copyFile(join(root, '..', 'public', 'favicon.svg'), join(assets, 'favicon.svg'))
await copyFile(join(root, '..', 'public', 'favicon.ico'), join(assets, 'favicon.ico'))

console.log('Brand assets generated in brand/assets and brand/templates.')
