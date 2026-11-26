import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Pricing App #44 / Brand 6917264617 / L-20261115-1: live customer copy on
 * /product/addison-crib, /product/addison-7-drawer-dresser and /faq must not
 * use "match", "matching" or "to match". The house wording is "from the same
 * collection" or "for the <crib name>" / "a piece already in the room".
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

const BANNED = /\b(?:match|matching|matched)\b|\bto match\b/i;

test('/faq live copy has no match / matching / to match', () => {
  const faq = read('src/app/faq/page.tsx');
  assert.ok(faq.includes('which finish to choose for your nursery'));
  assert.ok(faq.includes('a piece already in the room, or gift timing'));
  assert.doesNotMatch(faq, /which finish will match your nursery/);
  assert.doesNotMatch(faq, /matching existing furniture/);
  assert.doesNotMatch(faq, BANNED);
});

test('/product/addison-crib and /product/addison-7-drawer-dresser have no matching copy', () => {
  const crib = read('public/data/products/Addison Crib/product.json');
  const dresser = read('public/data/products/Addison 7 Drawer Dresser/product.json');
  assert.doesNotMatch(crib, BANNED);
  assert.doesNotMatch(dresser, BANNED);
  // The Nov 16 live sentence was already replaced in PurchaseAssurances
  // (issue #52) and no longer uses "matching an existing piece".
  const assurances = read('src/components/product/PurchaseAssurances.tsx');
  assert.doesNotMatch(assurances, /or matching an existing piece/);
  assert.doesNotMatch(assurances, BANNED);
});
