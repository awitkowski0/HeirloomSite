import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PRODUCTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/data/products')
const NL = '\n'

const overrides = {
  'addison-6-drawer-dresser':
    "Meet your nursery's storage needs with the Addison 6 Drawer Dresser, solid hardwood built for daily family life.",
  'addison-toddler-bed':
    'Complete your Addison crib with this toddler bed rail kit, made to match the collection as your child grows.',
  'french-country-chest':
    'Maximize nursery floor space with the French Country Chest: tall solid-wood storage with warm, family-friendly style.',
  'mackenzie-6-drawer-dresser':
    'Storage and style come together in the Mackenzie 6 Drawer Dresser, crafted to keep your nursery calm and organized.',
  'mackenzie-7-drawer-dresser':
    'Maximize nursery storage with the Mackenzie 7 Drawer Dresser: roomy drawers and a timeless hardwood finish.',
  'mackenzie-crib-panel-back':
    'The Mackenzie Panel Back Crib offers a solid raised panel headboard and a warm, convertible path as your child grows.',
  'mackenzie-nightstand':
    'Keep nursery essentials close at hand with the Mackenzie Nightstand, scaled for bedside calm and everyday use.',
  'moyerton':
    'Rustic warmth and heirloom quality come together in the Moyerton Convertible Crib, built for years of family life.',
  'princeton':
    'Handcrafted from solid American hardwoods, the Princeton Convertible Crib brings raised-panel style and lasting durability.',
  'west-lake-6-drawer-dresser':
    'Ample storage meets classic style in the West Lake 6 Drawer Dresser, ready for nursery through big-kid years.',
  'west-lake-chest':
    'Make the most of nursery space with the West Lake Chest: upright storage in a warm, family-friendly finish.',
}

let n = 0
for (const d of fs.readdirSync(PRODUCTS, { withFileTypes: true }).filter((x) => x.isDirectory() && x.name !== 'showroom')) {
  const p = path.join(PRODUCTS, d.name, 'product.json')
  const j = JSON.parse(fs.readFileSync(p, 'utf8'))
  if (/rug|lamp/i.test(j.category || '')) continue

  // clean doubled phrases
  j.description = (j.description || '')
    .replace(/\bconversion kit conversion kit\b/gi, 'conversion kit')
    .replace(/\brail kit rail kit\b/gi, 'rail kit')
    .replace(/\bkit kit\b/gi, 'kit')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (overrides[j.slug]) {
    j.metaDescription = overrides[j.slug]
  } else {
    let m = (j.metaDescription || '').trim()
    if (m.length < 70 || m.length > 165 || !/[.!?]$/.test(m) || /kit kit|conversion kit conversion/i.test(m)) {
      const sents = ((j.description || '').match(/[^.!?]+[.!?]+/g) || [])
        .map((s) => s.trim())
        .filter((s) => s.length >= 40 && !/Get Personal Assistance/i.test(s))
      m = sents[0] || `${j.productName}.`
      if (m.length < 90 && sents[1] && `${m} ${sents[1]}`.length <= 158) m = `${m} ${sents[1]}`
      if (m.length > 158) {
        m = sents[0]
        if (m.length > 158) m = m.slice(0, 155).replace(/\s+\S*$/, '') + '.'
      }
      if (!/[.!?]$/.test(m)) m += '.'
      j.metaDescription = m
    }
  }
  // final meta bounds
  if (j.metaDescription.length > 165) {
    j.metaDescription = j.metaDescription.slice(0, 155).replace(/\s+\S*$/, '') + '.'
  }
  if (j.metaDescription.length < 70) {
    j.metaDescription = `${j.productName}: solid hardwood nursery furniture for your family.`.slice(0, 160)
    if (!/[.!?]$/.test(j.metaDescription)) j.metaDescription += '.'
  }

  fs.writeFileSync(p, JSON.stringify(j, null, 2) + NL)
  n++
}
console.log('updated', n)
