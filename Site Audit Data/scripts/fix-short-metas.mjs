import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/data/products')

const fixes = {
  'addison-6-drawer-dresser':
    "Meet your nursery's storage powerhouse with the Addison 6 Drawer Dresser — solid hardwood built for daily family life.",
  'addison-toddler-bed':
    'Complete your Addison crib with this toddler bed conversion kit, made to match the collection as your child grows.',
  'mackenzie-6-drawer-dresser':
    'Storage and style come together in the Mackenzie 6 Drawer Dresser, crafted to keep your nursery calm and organized.',
  'mackenzie-7-drawer-dresser':
    'Maximize nursery storage with the Mackenzie 7 Drawer Dresser — roomy drawers and a timeless hardwood finish.',
  'mackenzie-nightstand':
    'Keep nursery essentials close at hand with the Mackenzie Nightstand, scaled for bedside calm and everyday use.',
  'west-lake-6-drawer-dresser':
    'Ample storage meets classic style in the West Lake 6 Drawer Dresser, ready for nursery through big-kid years.',
  'west-lake-chest':
    'Make the most of nursery space with the West Lake Chest — upright storage in a warm, family-friendly finish.',
  'west-lake-full-bed-rail-kit':
    'Convert your West Lake crib into a full-size bed with this rail kit, extending the life of furniture you already love.',
}

let n = 0
for (const d of fs.readdirSync(root, { withFileTypes: true }).filter((x) => x.isDirectory())) {
  const p = path.join(root, d.name, 'product.json')
  if (!fs.existsSync(p)) continue
  const j = JSON.parse(fs.readFileSync(p, 'utf8'))
  if (fixes[j.slug]) {
    j.metaDescription = fixes[j.slug]
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n')
    n++
    console.log('fixed', j.slug, j.metaDescription.length)
  }
}
console.log('fixed count', n)
