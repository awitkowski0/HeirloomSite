

export default function Showroom() {
  return (
    <div>
      <section className="hero-showroom" style={{ position: 'relative', width: '100%', height: '80vh', overflow: 'hidden', backgroundColor: 'var(--surface-container-highest)' }}>
        <img style={{ width: '100%', height: '100%', objectFit: 'cover' }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuATyNgQClA8UHZnWc2RU_55kMNwSCS_f6J9c7s41gQSfBKv33hqZWFUxlmN8Di1H55cxLZa62QgsPlJFyGIARSqOK965OC3PNumjOYZLm-Tp_OwH-yLXeF_UCATtbGtlT0nk8BC-3PncWcoIlVVnLveC_nAE_wN7vuSqCX1YAxFgseWZX1RimmvrnMGCEjcMTfAr-MxQFLUYGbRyB8JE9hWhSArue1GxNCnVF1qplsZMs20_xE_aDWjKKlWiyTujxW7R0R0AERh584n" alt="Showroom" />
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.1)', pointerEvents: 'none' }}></div>
        
        {/* Hotspots would go here with CSS */}
        <div style={{ position: 'absolute', bottom: '48px', left: '48px', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          <p className="label-caps" style={{ color: 'var(--primary-fixed)', marginBottom: '8px' }}>COLLECTION 2024</p>
          <h1 className="headline-xl">The Sanctuary Series</h1>
          <p className="body-lg" style={{ marginTop: '16px', maxWidth: '400px' }}>Explore our curated nursery showroom. Interact with elements to view material details and bespoke pricing.</p>
        </div>
      </section>

      <section className="container" style={{ padding: '80px 24px' }}>
        <div style={{ marginBottom: '48px' }}>
          <span className="label-caps text-secondary">Showroom Curations</span>
          <h2 className="headline-xl text-primary" style={{ marginTop: '8px' }}>Bespoke Nursery Essentials</h2>
        </div>
        
        <div className="showroom-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', height: '600px' }}>
          <div style={{ gridColumn: 'span 2', gridRow: 'span 2', backgroundColor: 'var(--surface-container-lowest)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flexGrow: 1, position: 'relative' }}>
              <img style={{ width: '100%', height: '100%', objectFit: 'cover' }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuAsRbeE3gNqlrLqnl7VOQbXGoQyEAtYbaNGCHFNrvH11ktTn9dpg0vj8jhVJBBUxUexJy6tnD7PVxlCQXzkKUMmQyo0Ypj-9e2fXh4oj-z2B8k31uOxtLmLxgo_95wezbONqv3AkJKi-hAb-zTCe7Bw3VAt4J3HtOmVcPHuGwzx2OEfd-V24MAXvdmH0JnTLRCgRGvsAiPj0YkmjZ7_7q69VKFhyro_4NhsoE16i-GNF_DztkBET0ca63snLzMboIBUgLoFKkIf9BZ5" alt="Detail" />
            </div>
            <div style={{ padding: '32px' }}>
              <h3 className="headline-lg text-primary">The Heritage White Oak</h3>
              <p className="body-md text-on-surface-variant" style={{ margin: '8px 0 24px' }}>Meticulously hand-sanded and finished with organic, child-safe oils for a lifetime of beauty.</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="headline-md text-primary">$2,650</span>
              </div>
            </div>
          </div>
          <div style={{ gridColumn: 'span 1', gridRow: 'span 2', backgroundColor: 'var(--surface-container-low)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ height: '66%', overflow: 'hidden' }}>
              <img style={{ width: '100%', height: '100%', objectFit: 'cover' }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsxJdKC92RThTzRMif649RP1St1RLdYmAElmGkcIHMRQFsj8ZiSbP3LdSAkIIEUtkbr2liWEtQ80tTYAyHZk1hmDQ9xfBZt2uG0E9MFGlhivVJogp09azQdyHh_Fc-OuJvTR2Q9gUoI4TyhaNKi6TKUx_LRYMTJnsjpHDuyEzJMEhw6-6d1s2Jv92-EepIjidiy2VFckD8ohPJ_EKnSoSzGx3WRylVa1p18V3xvSmDa4-rfuVhrWJOr4Ab0WOijXboNLGuVXshA9Am" alt="Glider" />
            </div>
            <div style={{ padding: '24px' }}>
              <h4 className="headline-md text-primary" style={{ fontSize: '18px' }}>Serenity Glider</h4>
              <p className="label-caps text-on-surface-variant" style={{ marginTop: '4px' }}>BELGIAN LINEN</p>
              <div className="headline-md text-primary" style={{ marginTop: '16px' }}>$1,200</div>
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--surface-container)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
             <div>
               <h4 className="headline-md text-primary" style={{ fontSize: '16px' }}>Maple Teethers</h4>
             </div>
             <span className="label-caps text-primary">$45.00</span>
          </div>
          <div style={{ backgroundColor: 'var(--primary-container)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: 'var(--on-primary-container)' }}>
             <div>
               <h4 className="headline-md text-on-primary" style={{ fontSize: '16px', marginBottom: '8px' }}>The Wood Care Kit</h4>
               <p className="label-caps" style={{ opacity: 0.8 }}>MAINTAIN THE LEGACY</p>
             </div>
             <span className="headline-md text-on-primary" style={{ fontSize: '24px' }}>$85.00</span>
          </div>
        </div>
      </section>

      <section style={{ backgroundColor: 'var(--surface-container-low)', padding: '80px 32px', marginTop: '96px' }}>
        <div className="container" style={{ display: 'flex', gap: '64px', alignItems: 'center' }}>
           <div style={{ flex: 1 }}>
              <div style={{ aspectRatio: '1/1', borderRadius: '50%', overflow: 'hidden', border: '12px solid var(--surface-container-lowest)', boxShadow: 'var(--shadow-soft)' }}>
                 <img style={{ width: '100%', height: '100%', objectFit: 'cover' }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuDDNkqVDXY7HWHjfjjcf-sGrh9KX2STG4e1JLADE5KcUnH9I-Bd9trecc-2tmm8YIUYQUiseEGEOPhRa-7AIHHRCNlOrHqAROyo2bM8jYdI_nhqLkCfIfWhCgKxMxkjsaublgLOUssEh26hDkIeLRDyV54G4VoMLvLpWT_ax5B6tpRVwnzKvXXsREuFDHsJz8wMpHhNtwZGG_c7G5LB0iDj5XH5hVJaKJdGJup4AGd9DhZxa6lvKWoOFnjebDIFUYXoTd2Pql4jfvsU" alt="Craftsmanship" />
              </div>
           </div>
           <div style={{ flex: 1 }}>
              <span className="label-caps text-secondary">OUR PHILOSOPHY</span>
              <h2 className="headline-xl text-primary" style={{ margin: '16px 0 24px' }}>Designed for a Lifetime, Built for a Legacy.</h2>
              <p className="body-lg text-on-surface-variant" style={{ marginBottom: '32px' }}>
                At Heirloom Cribs, we reject the disposable culture of modern nursery furniture. Every crib is crafted from sustainably harvested solid hardwoods, hand-joined using traditional dovetail techniques, and finished with botanical oils.
              </p>
           </div>
        </div>
      </section>
    </div>
  );
}
