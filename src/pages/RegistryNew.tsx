import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function RegistryNew() {
  const navigate = useNavigate();
  const inventoryData = useQuery(api.inventory.get as any, {});
  const inventory: any[] = inventoryData || [];
  const createRegistry = useMutation(api.registries.create);

  const [creatorName, setCreatorName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [message, setMessage] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ productName: string; wood: string; stainName: string; title: string }[]>([]);
  const [creating, setCreating] = useState(false);
  const [slug, setSlug] = useState('');

  const products = inventory.reduce((acc: any[], item: any) => {
    const pName = item.productName ?? item.cribName;
    if (!acc.find(p => p.productName === pName)) {
      acc.push({
        productName: pName,
        woods: [...new Set(inventory.filter((i: any) => (i.productName ?? i.cribName) === pName).map((i: any) => i.wood))],
        stains: item.stains || [],
      });
    }
    return acc;
  }, []);

  const toggleItem = (productName: string) => {
    const item = inventory.find((i: any) => (i.productName ?? i.cribName) === productName);
    if (!item) return;
    const stain = item.stains?.find((s: any) => s.inStock) || item.stains?.[0];
    if (!stain) return;
    const wood = item.wood;
    const exists = selectedItems.find(s => s.productName === productName);
    if (exists) {
      setSelectedItems(prev => prev.filter(s => s.productName !== productName));
    } else {
      setSelectedItems(prev => [...prev, { productName, wood, stainName: stain.name, title: item.description || productName }]);
    }
  };

  const handleCreate = async () => {
    if (!creatorName || selectedItems.length === 0) return;
    setCreating(true);
    const result = await createRegistry({
      creatorName,
      eventDate: eventDate || undefined,
      message: message || undefined,
      items: selectedItems.map(i => ({ productName: i.productName, wood: i.wood, stainName: i.stainName })),
    });
    setSlug(result);
    setCreating(false);
  };

  return (
    <>
      <Helmet>
        <title>Create a Baby Registry | Heirloom Cribs and More</title>
        <meta name="description" content="Create a baby registry with handcrafted heirloom cribs and nursery furniture. Share a unique link with friends and family." />
      </Helmet>
      <div className="container" style={{ padding: '80px 24px', maxWidth: '720px', margin: '0 auto' }}>
        <header style={{ marginBottom: '40px' }}>
          <h1 className="headline-lg text-primary" style={{ fontSize: '28px', marginBottom: '8px' }}>Create a Registry</h1>
          <p className="body-md text-on-surface-variant">Select the items you'd like, then share your unique registry link.</p>
        </header>

        {slug ? (
          <section style={{ padding: '40px', borderRadius: '12px', backgroundColor: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'green', display: 'block', marginBottom: '16px' }}>check_circle</span>
            <h2 className="headline-md" style={{ marginBottom: '8px' }}>Registry Created!</h2>
            <p className="body-md text-on-surface-variant" style={{ marginBottom: '24px' }}>Share this link with friends and family:</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
              <code style={{ padding: '12px 20px', backgroundColor: 'var(--surface)', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--outline-variant)', wordBreak: 'break-all' }}>
                {window.location.origin}/registry/{slug}
              </code>
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/registry/${slug}`); }} className="filter-btn active" style={{ padding: '12px 20px', fontSize: '12px', whiteSpace: 'nowrap' }}>Copy</button>
            </div>
            <button onClick={() => navigate(`/registry/${slug}`)} className="filter-btn" style={{ marginTop: '16px', padding: '12px 24px', fontSize: '12px' }}>View Registry</button>
          </section>
        ) : (
          <>
            <section style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="name" className="label-caps" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>YOUR NAME</label>
                <input id="name" type="text" value={creatorName} onChange={e => setCreatorName(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', fontSize: '14px' }} placeholder="e.g. Jane & Michael" />
              </div>
              <div>
                <label htmlFor="date" className="label-caps" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>EVENT DATE (optional)</label>
                <input id="date" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', fontSize: '14px' }} />
              </div>
              <div>
                <label htmlFor="msg" className="label-caps" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>MESSAGE (optional)</label>
                <textarea id="msg" value={message} onChange={e => setMessage(e.target.value)} rows={3}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', fontSize: '14px', resize: 'vertical' }} placeholder="A note for your guests..." />
              </div>
            </section>

            <section>
              <h2 className="headline-sm" style={{ fontSize: '18px', marginBottom: '16px' }}>Select Items</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {products.map((p: any) => {
                  const selected = selectedItems.some(s => s.productName === p.productName);
                  return (
                    <div key={p.productName} onClick={() => toggleItem(p.productName)}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '10px', cursor: 'pointer', backgroundColor: selected ? 'var(--primary-container)' : 'var(--surface)', border: `1px solid ${selected ? 'var(--primary)' : 'var(--outline-variant)'}`, transition: 'all 0.15s' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: `2px solid ${selected ? 'var(--primary)' : 'var(--outline-variant)'}`, backgroundColor: selected ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {selected && <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'white' }}>check</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '14px', fontWeight: 600 }}>{p.productName}</p>
                        <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{p.woods.length} wood option{p.woods.length > 1 ? 's' : ''} · {p.stains.length} stain finish{p.stains.length > 1 ? 'es' : ''}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={handleCreate} disabled={!creatorName || selectedItems.length === 0 || creating}
                className="add-to-cart" style={{ alignSelf: 'flex-start', opacity: (!creatorName || selectedItems.length === 0 || creating) ? 0.5 : 1 }}>
                {creating ? 'Creating...' : `Create Registry (${selectedItems.length} items)`}
              </button>
            </section>
          </>
        )}
      </div>
    </>
  );
}
