import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PRODUCTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/data/products')

function load(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}
function writeJson(p, o) {
  fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n')
}

let removed = 0
const report = []

for (const d of fs.readdirSync(PRODUCTS, { withFileTypes: true }).filter((x) => x.isDirectory() && x.name !== 'showroom')) {
  const dir = path.join(PRODUCTS, d.name)
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .map((f) => {
      const fp = path.join(dir, f)
      const st = fs.statSync(fp)
      return { f, fp, size: st.size }
    })
    .sort((a, b) => a.f.localeCompare(b.f))

  const keep = []
  const drop = new Set()

  for (const file of files) {
    const near = keep.find((k) => {
      const diff = Math.abs(k.size - file.size)
      const rel = diff / Math.max(k.size, file.size)
      return diff <= 64 || rel <= 0.003 // ~0.3% or 64 bytes
    })
    if (near) {
      // prefer keeping lower index _0 over _1
      const preferNew = /_0\./.test(file.f) && !/_0\./.test(near.f)
      if (preferNew) {
        drop.add(near.f)
        keep.splice(keep.indexOf(near), 1, file)
      } else {
        drop.add(file.f)
      }
    } else {
      keep.push(file)
    }
  }

  if (!drop.size) continue

  const mediaPath = path.join(dir, 'media.json')
  if (fs.existsSync(mediaPath)) {
    const media = load(mediaPath)
    for (const [k, arr] of Object.entries(media)) {
      if (!Array.isArray(arr)) continue
      let next = arr.filter((n) => !drop.has(n) && fs.existsSync(path.join(dir, n)))
      // unique preserve order
      const seen = new Set()
      next = next.filter((n) => (seen.has(n) ? false : (seen.add(n), true)))
      if (!next.length && keep.length) next = [keep[0].f]
      media[k] = next
    }
    writeJson(mediaPath, media)
  }

  for (const f of drop) {
    try {
      fs.unlinkSync(path.join(dir, f))
      removed++
    } catch {
      /* */
    }
  }
  report.push({ dir: d.name, dropped: [...drop], kept: keep.length })
}

console.log(JSON.stringify({ removed, productsTouched: report.length, sample: report.slice(0, 15) }, null, 2))
fs.writeFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../derived/image-near-dedupe-v5.json'),
  JSON.stringify({ removed, report }, null, 2),
)
