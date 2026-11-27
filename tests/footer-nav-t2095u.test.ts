import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * HeirloomSite #159 / Phil t2095u: footer Shop and About section titles,
 * with /about-heirloom kept as the About Us URL.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const footer = readFileSync(resolve(root, 'src/components/layout/Footer.tsx'), 'utf8');

test('footer Shop includes Changing tables and Night stands on existing category routes', () => {
  assert.ok(footer.includes('href="/products/dressers-changing-tables"'), 'changing tables href missing');
  assert.ok(footer.includes('>Changing tables<'), 'Changing tables label missing');
  assert.ok(footer.includes('href="/products/nightstands-storage"'), 'night stands href missing');
  assert.ok(footer.includes('>Night stands<'), 'Night stands label missing');
  assert.ok(footer.includes('href="/products">All Products<') || footer.includes('href="/products">All Products</Link>'));
  assert.ok(footer.includes('href="/products/cribs">Cribs<') || footer.includes('href="/products/cribs">Cribs</Link>'));
});

test('footer section is About Us, with About our builder and the three builders under it', () => {
  assert.ok(!footer.includes('Our builders'), 'Our builders section title still present');
  assert.ok(!footer.includes('About Heirloom'), 'About Heirloom link text still present');
  assert.ok(footer.includes('<Link href="/about-heirloom">About Us</Link>'), 'About Us must keep the /about-heirloom route');
  assert.ok(footer.includes('>About our builder<'), 'About our builder subtitle missing');
  const aboutIdx = footer.indexOf('<Link href="/about-heirloom">About Us</Link>');
  const subIdx = footer.indexOf('>About our builder<');
  const oto = footer.indexOf('href="/builders/old-town-oak"');
  const fqp = footer.indexOf('href="/builders/fishers-quality-products"');
  const kc = footer.indexOf('href="/builders/kids-comfort"');
  assert.ok(aboutIdx !== -1 && subIdx !== -1 && oto !== -1 && fqp !== -1 && kc !== -1);
  assert.ok(aboutIdx < subIdx && subIdx < oto && oto < fqp && fqp < kc, 'About Us, subtitle, then the three builders must appear in that order');
  assert.ok(footer.includes('>Old Town Oak<') || footer.includes('>Old Town Oak</Link>'));
  assert.ok(footer.includes('fishers-quality-products'));
  assert.ok(footer.includes('kids-comfort'));
});
