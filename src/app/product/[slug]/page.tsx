import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlug, getAllProductSlugs } from '@/lib/content';
import { categoryToSlug } from '@/lib/categories';
import {
  truncate,
  stripSiteSuffix,
  productJsonLd,
  breadcrumbJsonLd,
  absoluteUrl,
} from '@/lib/seo';
import { galleryImagesFor } from '@/lib/images';
import ProductConfigurator from '@/components/product/ProductConfigurator';

// Unknown slugs 404 instead of rendering an empty shell with HTTP 200.
export const dynamicParams = false;

export function generateStaticParams() {
  const slugs = getAllProductSlugs();
  // Mirrors the guard in build-data.mjs. If the data artifact is short, refuse
  // to build rather than ship a deploy that 404s already-indexed product URLs.
  if (slugs.length < 70) {
    throw new Error(
      `Refusing to build: only ${slugs.length} product slugs found. Run \`npm run data:build\`.`
    );
  }
  return slugs.map(slug => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: 'Product not found', robots: { index: false } };

  const primary = product.configurations[0];
  // Stored titles already end in "— Heirloom Cribs and More" (all 73 of them),
  // so the layout's "%s | Heirloom Cribs and More" template would double it.
  const title = stripSiteSuffix(primary.title || product.productName);
  // Stored metaDescriptions are the full description paragraph: 258 of 273
  // exceed 155 characters, median 474, max 1566.
  const description = truncate(primary.metaDescription || primary.description, 155);
  const images = galleryImagesFor(product.configurations).slice(0, 4);

  return {
    title: { absolute: `${title} | Heirloom Cribs and More` },
    description,
    alternates: { canonical: `/product/${slug}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/product/${slug}`,
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

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const primary = product.configurations[0];
  const images = galleryImagesFor(product.configurations);
  const category = primary.category;

  const breadcrumb = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    ...(category ? [{ name: category, path: `/products/${categoryToSlug(category)}` }] : []),
    { name: product.productName, path: `/product/${slug}` },
  ];

  return (
    <div className="container product-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumb)) }}
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
