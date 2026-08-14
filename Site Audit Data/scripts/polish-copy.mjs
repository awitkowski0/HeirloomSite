import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/data/products')

const patterns = [
  [/dreamy nursery/gi, 'nursery that feels like home'],
  [/fall in love with the first time they see it/gi, 'appreciate from the first look'],
  [/the centerpiece your nursery deserves/gi, 'a beautiful centerpiece for your nursery'],
  [/meticulous attention to detail/gi, 'careful craftsmanship'],
  [/\bUnlock /gi, 'Discover '],
  [/elevate your/gi, 'brighten your'],
  [/In conclusion,?/gi, ''],
  [/It is important to note that /gi, ''],
  [/When it comes to /gi, 'For '],
  [/keep loving for years to come/gi, 'continue to value for years'],
]

let changed = 0
for (const dir of fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  const p = path.join(root, dir.name, 'product.json')
  if (!fs.existsSync(p)) continue
  const j = JSON.parse(fs.readFileSync(p, 'utf8'))
  let d = j.description || ''
  let t = j.title || ''
  let m = j.metaDescription || ''
  const before = d + t + m
  for (const [re, rep] of patterns) {
    d = d.replace(re, rep)
    t = t.replace(re, rep)
    m = m.replace(re, rep)
  }
  d = d.replace(/\.([A-Za-z])/g, '. $1').replace(/[ \t]{2,}/g, ' ').trim()
  m = m.replace(/\.([A-Za-z])/g, '. $1').replace(/[ \t]{2,}/g, ' ').trim()
  m = m.replace(/\s+(and|or|a|the|to|for|with|of)\s*…$/i, '.')
  if (m && !/[.!?…]$/.test(m)) m += '.'
  if (before !== d + t + m) {
    j.description = d
    j.title = t
    j.metaDescription = m
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n')
    changed++
  }
}

// media file existence
let missing = 0
let multi = 0
for (const dir of fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'showroom')) {
  const mp = path.join(root, dir.name, 'media.json')
  if (!fs.existsSync(mp)) continue
  const media = JSON.parse(fs.readFileSync(mp, 'utf8'))
  for (const arr of Object.values(media)) {
    if ((arr || []).length > 1) multi++
    for (const f of arr || []) {
      if (!fs.existsSync(path.join(root, dir.name, f))) {
        missing++
        console.log('MISSING', dir.name, f)
      }
    }
  }
}
console.log(JSON.stringify({ polished: changed, multiGalleryKeys: multi, missingFiles: missing }))
