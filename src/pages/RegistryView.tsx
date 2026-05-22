import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function RegistryView() {
  const { slug } = useParams<{ slug: string }>();
  const registryData = useQuery(api.registries.get, { slug: slug || '' });
  const inventoryData = useQuery(api.inventory.get as any, {});
  const inventory: any[] = inventoryData || [];

  const registry = registryData as any;

  useEffect(() => {
    if (registryData === null) { }
  }, [registryData]);

  if (registryData === undefined) return (
    <div className="container" style={{ padding: '120px 24px', textAlign: 'center' }}>
      <p className="label-caps text-on-surface-variant">Loading registry...</p>
    </div>
  );

  if (!registry) return (
    <div className="container" style={{ padding: '120px 24px', textAlign: 'center' }}>
      <Helmet><title>Registry Not Found | Heirloom Cribs and More</title></Helmet>
      <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '16px' }}>sentiment_dissatisfied</span>
      <h1 className="headline-md" style={{ marginBottom: '8px' }}>Registry Not Found</h1>
      <p className="body-md text-on-surface-variant">This registry doesn't exist or may have been removed.</p>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{registry.creatorName}'s Registry | Heirloom Cribs and More</title>
        <meta name="description" content={`${registry.creatorName}'s baby registry. ${registry.message || 'Help us welcome our new arrival!'}`} />
        <meta property="og:title" content={`${registry.creatorName}'s Registry`} />
        <meta property="og:description" content={registry.message || 'Baby registry at Heirloom Cribs and More'} />
      </Helmet>
      <div className="container" style={{ padding: '80px 24px', maxWidth: '720px', margin: '0 auto' }}>
        <header style={{ marginBottom: '40px', textAlign: 'center' }}>
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>card_giftcard</span>
          <h1 className="headline-lg text-primary" style={{ fontSize: '28px', marginBottom: '8px' }}>{registry.creatorName}'s Registry</h1>
          {registry.eventDate && <p className="body-md text-on-surface-variant" style={{ marginBottom: '8px' }}>Event: {new Date(registry.eventDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>}
          {registry.message && <p className="body-md text-on-surface-variant" style={{ fontStyle: 'italic' }}>"{registry.message}"</p>}
        </header>

        <section aria-label="Registry items">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {registry.items.map((item: any, idx: number) => {
              const pName = item.productName ?? item.cribName;
              const config = inventory.find((i: any) => (i.productName ?? i.cribName) === pName && i.wood === item.wood);
              const stain = config?.stains?.find((s: any) => s.name === item.stainName);
              const price = config ? config.basePrice + (stain?.priceAddition || 0) : 0;
              return (
                <Link key={idx} to={`/product/${encodeURIComponent(pName)}?wood=${encodeURIComponent(item.wood)}&stain=${encodeURIComponent(item.stainName)}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <article style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderRadius: '12px', backgroundColor: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', cursor: 'pointer', boxShadow: 'var(--shadow-ambient)' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '8px', backgroundColor: 'var(--surface-container-highest)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {stain?.image ? (
                        <img src={stain.image} alt={pName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} loading="lazy" />
                      ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--outline-variant)' }}>crib</span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>{item.title || pName}</h2>
                      <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{item.wood} / {item.stainName}</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)', marginTop: '4px' }}>${price.toLocaleString()}</p>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>arrow_forward</span>
                  </article>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
