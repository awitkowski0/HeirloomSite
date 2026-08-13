import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/data/products')

const phraseFixes = [
  [/and so you are not starting over with every stage/gi, 'so you are not starting over with every stage'],
  [/refreshingly modern style making it an ideal choice/gi, 'refreshingly modern — an ideal choice'],
  [/for a cohesive, nursery that feels like home/gi, 'for a cohesive nursery that feels like home'],
  [/rock-solid durability to your nursery\./gi, 'lasting durability to your nursery.'],
  [/brings timeless raised-panel style and rock-solid durability, crafted/gi, 'brings the same raised-panel character, crafted'],
  [/distinguish custom nursery furniture from everyday store furniture\./gi, 'you can feel in solid, carefully made furniture.'],
  [/Where conversion kits are included in the listed price they are noted on this page\./gi, 'Conversion options are noted on this page where they are included.'],
  [/Conversion kits are included where stated on this product page, so one beautiful piece can stay with your child as they grow\./gi, 'Where conversion pieces are included, they are noted on this page — so the same beautiful crib can stay with your child as they grow.'],
]

function fixMeta(meta, productName, description) {
  let m = (meta || '').trim()
  // incomplete endings
  if (/\b(and|or|the|a|an|to|for|with|of|rock-solid|solid|classic|warm|beautiful)\s*\.?$/i.test(m.replace(/\.$/, ''))) {
    m = ''
  }
  if (!m || m.length < 70 || /…/.test(m) || !/[.!?]$/.test(m)) {
    const sents = (description || '').match(/[^.!?]+[.!?]+/g) || []
    const good = sents
      .map((s) => s.trim())
      .filter((s) => s.length >= 40 && !/Get Personal Assistance|Safety page/i.test(s))
    m = good[0] || `Discover the ${productName} from Heirloom Cribs and More.`
    if (m.length < 90 && good[1] && `${m} ${good[1]}`.length <= 158) m = `${m} ${good[1]}`
    if (m.length > 158) m = good[0]
    if (!/[.!?]$/.test(m)) m += '.'
  }
  return m
}

let n = 0
for (const d of fs.readdirSync(root, { withFileTypes: true }).filter((x) => x.isDirectory() && x.name !== 'showroom')) {
  const p = path.join(root, d.name, 'product.json')
  if (!fs.existsSync(p)) continue
  const j = JSON.parse(fs.readFileSync(p, 'utf8'))
  if (/rug|lamp/i.test(j.category || '')) continue
  let desc = j.description || ''
  const before = desc + j.metaDescription
  for (const [re, rep] of phraseFixes) desc = desc.replace(re, rep)
  // collapse triple-repeat imagine blocks if somehow duplicated
  const imagine =
    /Imagine it as the quiet center of the room[\s\S]*?not a piece you replace each season\./g
  const imagines = desc.match(imagine) || []
  if (imagines.length > 1) {
    let first = true
    desc = desc.replace(imagine, (m) => {
      if (first) {
        first = false
        return m
      }
      return ''
    })
  }
  desc = desc.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim()
  j.description = desc
  j.metaDescription = fixMeta(j.metaDescription, j.productName, desc)
  if (before !== j.description + j.metaDescription) {
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n')
    n++
  }
}
console.log('polished', n)
