import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlug, getAllProductSlugs, getInventory } from '@/lib/content';
import { categoryToSlug } from '@/lib/categories';
import {
  truncate,
  stripSiteSuffix,
  productJsonLd,
  breadcrumbJsonLd,
  absoluteUrl,
  jsonLdScript,
} from '@/lib/seo';
import { galleryImagesFor } from '@/lib/images';
import { humanizeWood, stainLabel, variantLabel } from '@/lib/labels';
import { resolveVariant, variantPathsFor, variantHref } from '@/lib/variants';
import ProductConfigurator from '@/components/product/ProductConfigurator';

// Unknown slugs - and unknown wood/finish segments - 404 instead of rendering
// an empty shell, or the default configuration, with HTTP 200.
export const dynamicParams = false;

type Params = { slug: string; variant: string[] };

/**
 * Every product, every wood, and every finish that is distinct from its wood.
 *
 * ~800 pages rather than 73. The point is that a finish is a real URL a
 * crawler can index and a customer can send to someone: /product/bloomington
 * /cherry_wood/antique_slate renders that exact configuration in the server
 * HTML, instead of every finish sharing one URL behind a ?stain= parameter
 * applied after hydration.
 */
export function generateStaticParams(): Params[] {
  const slugs = getAllProductSlugs();
  // Mirrors the guard in build-data.mjs. If the data artifact is short, refuse
  // to build rather than ship a deploy that 404s already-indexed product URLs.
  if (slugs.length < 67) {
    throw new Error(
      `Refusing to build: only ${slugs.length} product slugs found. Run \`npm run data:build\`.`
    );
  }

  const inventory = getInventory();
  const params: Params[] = [];
  for (const slug of slugs) {
    const configurations = inventory.filter(i => i.slug === slug);
    for (const variant of variantPathsFor(configurations)) {
      // The `variant` key must be present even when empty: an optional
      // catch-all matches zero segments as [], not as an absent param.
      params.push({ slug, variant });
    }
  }
  return params;
}

/** Shared resolution so metadata and the page cannot disagree about validity. */
function load(slug: string, variant: string[] | undefined) {
  const product = getProductBySlug(slug);
  if (!product) return null;
  const resolved = resolveVariant(product.configurations, variant);
  if (!resolved) return null;

  const config =
    product.configurations.find(c => c.wood === resolved.wood) ?? product.configurations[0];
  const stain =
    (resolved.stain && config.stains.find(s => s.name === resolved.stain)) ||
    config.stains.find(s => s.inStock) ||
    config.stains[0];

  return { product, resolved, config, stain };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug, variant } = await params;
  const data = load(slug, variant);
  if (!data) return { title: 'Product not found', robots: { index: false } };

  const { product, resolved, stain } = data;
  const primary = product.configurations[0];

  // Stored titles already end in "— Heirloom Cribs and More" (all 73 of them),
  // so the layout's "%s | Heirloom Cribs and More" template would double it.
  const baseTitle = stripSiteSuffix(primary.title || product.productName);
  // Each variant gets its own title and description. Without that, 800 pages
  // would carry 73 distinct titles and read as duplicates.
  // variantLabel joins with a bullet for on-page display; a title tag reads
  // better with a comma.
  const variantName = resolved.wood
    ? variantLabel(resolved.wood, resolved.stain ?? '').replace(' • ', ', ')
    : '';
  const title = variantName ? `${product.productName} in ${variantName}` : baseTitle;

  const description = resolved.wood
    ? truncate(
        `${product.productName} in ${variantName}. ${primary.metaDescription || primary.description || ''}`,
        155
      )
    : truncate(primary.metaDescription || primary.description, 155);

  const canonical = variantHref(slug, resolved.wood, resolved.stain);
  const images = resolved.wood
    ? [stain?.gallery?.[0]?.url || stain?.image].filter((u): u is string => Boolean(u))
    : galleryImagesFor(product.configurations).slice(0, 4);

  return {
    title: { absolute: `${title} | Heirloom Cribs and More` },
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title,
      description,
      url: canonical,
      images: images.length > 0 ? images.map(src => ({ url: absoluteUrl(src) })) : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.length > 0 ? [absoluteUrl(images[0])] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug, variant } = await params;
  const data = load(slug, variant);
  if (!data) notFound();

  const { product, resolved } = data;
  const primary = product.configurations[0];
  const images = galleryImagesFor(product.configurations);
  const category = primary.category;

  const breadcrumb = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    ...(category ? [{ name: category, path: `/products/${categoryToSlug(category)}` }] : []),
    { name: product.productName, path: `/product/${slug}` },
    ...(resolved.wood
      ? [
          {
            name: humanizeWood(resolved.wood),
            path: variantHref(slug, resolved.wood),
          },
        ]
      : []),
    ...(resolved.stain
      ? [
          {
            name: stainLabel(resolved.stain),
            path: variantHref(slug, resolved.wood, resolved.stain),
          },
        ]
      : []),
  ];

  return (
    <div className="container product-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            productJsonLd({
              productName: product.productName,
              slug,
              description: truncate(primary.description || primary.metaDescription, 300),
              images: images.slice(0, 6),
              sku: primary.sku,
              configurations: product.configurations,
            })
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(breadcrumb)) }}
      />

      <nav aria-label="Breadcrumb" className="breadcrumb">
        <ol>
          {breadcrumb.map((crumb, i) => (
            <li key={crumb.path}>
              {i === breadcrumb.length - 1 ? (
                <span aria-current="page">{crumb.name}</span>
              ) : (
                <Link href={crumb.path}>{crumb.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/*
        The product name is the page's h1. It was previously an <h2
        className="headline-xl"> with no h1 anywhere on the page, so the visual
        hierarchy contradicted the semantic one.
      */}
      <h1 className="headline-xl product-title">{product.productName}</h1>

      {/*
        Rendered on the server so the description is in the initial HTML for
        crawlers, rather than appearing only after the configurator hydrates.
      */}
      {primary.description && (
        <p className="body-lg subtitle product-description">{primary.description}</p>
      )}

      <ProductConfigurator
        productName={product.productName}
        configurations={product.configurations}
        slug={slug}
        initialWood={resolved.wood ?? data.config.wood}
        initialStain={resolved.stain}
      />

      {primary.extendedDescription && (
        <section className="product-extended">
          <h2 className="headline-md">Details</h2>
          <p className="body-md">{primary.extendedDescription}</p>
        </section>
      )}
    </div>
  );
}
