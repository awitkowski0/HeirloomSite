/*
 * ============================================================================
 *  TEST FIXTURE - NOT AN ARTICLE. NEVER ADD THIS TO src/content/guides.
 * ============================================================================
 * Used only by tests/guides.test.ts to prove the guides template works before
 * any real article exists. It lives under tests/, is not imported by anything
 * in src/, is not in the registry and has no route. Its images live in
 * tests/fixtures/public/, which is not served. All copy is placeholder text.
 */
import type { Guide } from '../../src/content/guides/types';

const fixture: Guide = {
  slug: 'test-fixture-not-an-article',
  title: 'Template test fixture: what does this placeholder guide check?',
  metaTitle: 'Template test fixture guide',
  metaDescription:
    'Placeholder description for the guides template test fixture. It is never published and exists only to exercise the checks.',
  datePublished: '2026-11-02T09:00:00-05:00',
  dateModified: '2026-11-03T10:30:00-05:00',
  answerFirst: [
    'This placeholder answer opens the fixture guide. It links to [the crib listing](/products/cribs) so the link checker has an inline link.',
    'A second placeholder sentence keeps the answer within the two to four sentence rule.',
  ],
  sections: [
    {
      h2: 'What does the first fixture section hold?',
      paragraphs: [
        'The first fixture paragraph stands on its own and names [a product page](/product/newport-crib) inline.',
        'A second fixture paragraph adds plain text only.',
      ],
      list: { ordered: true, items: ['Fixture step one.', 'Fixture step two, with a [contact link](/contact).'] },
    },
    {
      h2: 'What does the second fixture section hold?',
      paragraphs: ['The second fixture section carries a table.'],
      table: {
        caption: 'Fixture table caption',
        head: ['Column A', 'Column B'],
        rows: [
          ['Row one A', 'Row one B'],
          ['Row two A', '[All products](/products)'],
        ],
      },
    },
  ],
  faq: [
    { q: 'What is the first fixture question?', a: 'The first fixture answer, in plain text.' },
    { q: 'What is the second fixture question?', a: 'The second fixture answer, in plain text.' },
    { q: 'What is the third fixture question?', a: 'The third fixture answer, in plain text.' },
  ],
  related: [
    { label: 'Fixture related: cribs', href: '/products/cribs' },
    { label: 'Fixture related: about', href: '/about-heirloom#how-an-order-works' },
  ],
  images: [
    {
      src: '/images/guides/test-fixture-not-an-article/figure.jpg',
      alt: 'Plain beige test card used by the guides template test',
      width: 800,
      height: 600,
      caption: 'Fixture caption.',
      afterSection: 0,
    },
  ],
  ogImage: {
    src: '/images/guides/test-fixture-not-an-article/og.jpg',
    alt: 'Plain beige social preview test card',
    width: 1200,
    height: 630,
  },
  sources: [{ label: 'Fixture source (example.com)', url: 'https://example.com/fixture-source' }],
};

export default fixture;
