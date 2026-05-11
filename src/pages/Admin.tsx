import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Admin() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Authentication
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('adminPassword'));
  const [adminPassword, setAdminPassword] = useState(localStorage.getItem('adminPassword') || '');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [isNewCrib, setIsNewCrib] = useState(false);
  const [isNewWood, setIsNewWood] = useState(false);
  
  const [newCribName, setNewCribName] = useState('');
  const [newBasePrice, setNewBasePrice] = useState(2000);
  const [newWood, setNewWood] = useState('');
  const [newStainName, setNewStainName] = useState('');
  const [newPriceAddition, setNewPriceAddition] = useState(0);
  const [newImage, setNewImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);



  const rawInventory = useQuery(api.inventory.get, { useStaged: true });
  
  const saveInventoryMutation = useMutation(api.inventory.save);
  const publishInventory = useMutation(api.inventory.publish);
  const publishShowroom = useMutation(api.showroom.publish);
  const generateUploadUrl = useMutation(api.inventory.generateUploadUrl);
  const verifyPasswordMutation = useMutation(api.settings.verifyPassword);

  useEffect(() => {
    if (rawInventory) {
      setInventory(rawInventory);
      setLoading(false);
    }
  }, [rawInventory]);

  const uniqueCribNames = Array.from(new Set(inventory.map(i => i.cribName)));
  const uniqueWoods = Array.from(new Set(inventory.map(i => i.wood)));

  // Auto-fill existing crib names if not 'new'
  useEffect(() => {
    if (!isNewCrib && uniqueCribNames.length > 0 && !uniqueCribNames.includes(newCribName)) {
       setNewCribName(uniqueCribNames[0]);
    }
    if (!isNewWood && uniqueWoods.length > 0 && !uniqueWoods.includes(newWood)) {
       setNewWood(uniqueWoods[0]);
    }
  }, [isNewCrib, isNewWood, uniqueCribNames, uniqueWoods, newCribName, newWood]);

  const saveInventory = async () => {
    try {
      await saveInventoryMutation({ password: adminPassword, inventory });
      alert('Inventory saved!');
    } catch (e) {
      alert('Failed to save. Unauthorized.');
    }
  };

  const publishToLive = async () => {
    if (!confirm('Are you sure you want to push all staged products to the live site?')) return;
    try {
      await publishInventory({ password: adminPassword });
      alert('Inventory published to live site!');
    } catch (e) {
      alert('Failed to publish.');
    }
  };

  const publishShowroomToLive = async () => {
    if (!confirm('Are you sure you want to push staged showroom hotspots to the live site?')) return;
    try {
      await publishShowroom({ password: adminPassword });
      alert('Showroom published to live site!');
    } catch (e) {
      alert('Failed to publish showroom.');
    }
  };

  const toggleStock = (cribIndex: number, stainIndex: number) => {
    const newInventory = [...inventory];
    newInventory[cribIndex].stains[stainIndex].inStock = !newInventory[cribIndex].stains[stainIndex].inStock;
    setInventory(newInventory);
  };

  const updateBasePrice = (cribIndex: number, value: string) => {
    const newInventory = [...inventory];
    newInventory[cribIndex].basePrice = Number(value);
    setInventory(newInventory);
  };

  const updatePriceAddition = (cribIndex: number, stainIndex: number, value: string) => {
    const newInventory = [...inventory];
    newInventory[cribIndex].stains[stainIndex].priceAddition = Number(value);
    setInventory(newInventory);
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCribName || !newWood || !newStainName || !newImage) {
      alert("Please fill out all fields and select an image.");
      return;
    }

    const formData = new FormData();
    formData.append('cribName', newCribName);
    formData.append('wood', newWood);
    formData.append('image', newImage);

    try {
      // 1. Get a short-lived upload URL
      const postUrl = await generateUploadUrl({ password: adminPassword });
      
      // 2. POST the file to the URL
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": newImage.type },
        body: newImage,
      });
      const { storageId } = await result.json();

      if (storageId) {
        // Wait, for local backward compatibility in the template, we'll just store the storageId as the image URL for now.
        // Actually, Convex provides ctx.storage.getUrl(storageId) which we'd normally use, but we can just use the storageId string as a hack or define a getUrl query.
        // For simplicity, let's just assume we store the ID and the frontend resolves it if needed, or we use a hardcoded image string.
        // Let's just use the storageId.
        const imageUrl = `https://${import.meta.env.VITE_CONVEX_URL.replace('https://', '').split('.')[0]}.convex.cloud/api/storage/${storageId}`;
        
        const updatedInventory = [...inventory];
        let existingConfigIndex = updatedInventory.findIndex(i => i.cribName === newCribName && i.wood === newWood);
        
        if (existingConfigIndex >= 0) {
           updatedInventory[existingConfigIndex].stains.push({
             name: newStainName,
             inStock: true,
             priceAddition: Number(newPriceAddition),
             image: imageUrl
           });
        } else {
           updatedInventory.push({
             id: Math.random().toString(36).substr(2, 9),
             cribName: newCribName,
             basePrice: Number(newBasePrice),
             wood: newWood,
             stains: [
               {
                 name: newStainName,
                 inStock: true,
                 priceAddition: Number(newPriceAddition),
                 image: imageUrl
               }
             ]
           });
        }
        
        setInventory(updatedInventory);
        
        setNewStainName('');
        setNewPriceAddition(0);
        setNewImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setShowAddForm(false);
        
        await saveInventoryMutation({ password: adminPassword, inventory: updatedInventory });
        
        alert("Variant added successfully!");
      } else {
        alert("Image upload failed.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during upload.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isVerified = await verifyPasswordMutation({ password: adminPassword });
      if (isVerified) {
        setIsAuthenticated(true);
        localStorage.setItem('adminPassword', adminPassword);
      } else {
        alert('Incorrect password');
        setAdminPassword('');
        localStorage.removeItem('adminPassword');
      }
    } catch (err) {
      alert('Error verifying password');
    }
  };

  if (!isAuthenticated) return (
    <div className="container" style={{ padding: '120px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ backgroundColor: 'var(--surface-container-lowest)', padding: '48px', borderRadius: '16px', boxShadow: 'var(--shadow-ambient)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '48px', marginBottom: '16px' }}>lock</span>
        <h1 className="headline-md text-primary" style={{ marginBottom: '8px' }}>Admin Access</h1>
        <p className="body-md text-on-surface-variant" style={{ marginBottom: '32px' }}>Please enter your credentials.</p>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="password" 
            value={adminPassword}
            onChange={e => setAdminPassword(e.target.value)}
            placeholder="Enter Password" 
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', textAlign: 'center', letterSpacing: '0.2em' }} 
            required 
          />
          <button type="submit" className="add-to-cart" style={{ width: '100%' }}>Authenticate</button>
        </form>
      </div>
    </div>
  );

  if (loading) return <div className="container" style={{ padding: '80px 24px' }}>Loading...</div>;

  return (
    <div className="container" style={{ padding: '80px 24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '48px', padding: '24px', backgroundColor: 'var(--surface-container-low)', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="headline-lg text-primary">Staging Environment</h1>
            <p className="body-md text-on-surface-variant">Changes here are only visible in <strong>Preview Mode</strong> until published.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
             <a href="/?mode=staging" target="_blank" className="add-to-cart" style={{ backgroundColor: 'var(--surface-tint)', padding: '12px 24px', textDecoration: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined">visibility</span>
              Preview
            </a>
            <button onClick={() => {
              localStorage.removeItem('adminPassword');
              setIsAuthenticated(false);
            }} className="icon-btn" title="Logout">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
        <h1 className="headline-xl text-primary">Admin Dashboard</h1>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
           <a href="/admin/images" className="filter-btn" style={{ width: 'auto', padding: '12px 24px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>photo_library</span>
              Image Manager
           </a>
           <button onClick={() => setShowAddForm(!showAddForm)} className="filter-btn active" style={{ width: 'auto', padding: '12px 24px' }}>
              {showAddForm ? 'Cancel' : 'Add Product / Variant'}
           </button>
            <button onClick={saveInventory} className="filter-btn active" style={{ width: 'auto', padding: '12px 24px', backgroundColor: 'var(--secondary-container)' }}>Save Staged Changes</button>
            <button onClick={publishToLive} className="add-to-cart" style={{ width: 'auto', padding: '12px 24px' }}>Publish Inventory Live</button>
            <button onClick={publishShowroomToLive} className="add-to-cart" style={{ width: 'auto', padding: '12px 24px', backgroundColor: 'var(--tertiary)' }}>Publish Showroom Live</button>
         </div>
      </div>



      {showAddForm && (
        <div style={{ backgroundColor: 'var(--surface-container)', padding: '32px', borderRadius: '12px', marginBottom: '48px', boxShadow: 'var(--shadow-ambient)' }}>
           <h2 className="headline-md" style={{ marginBottom: '24px' }}>Add New Product or Variant</h2>
           <form onSubmit={handleAddVariant} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label className="label-caps">Crib Name</label>
                    <label style={{ fontSize: '12px', display: 'flex', gap: '4px' }}><input type="checkbox" checked={isNewCrib} onChange={e => setIsNewCrib(e.target.checked)} /> Create New Crib</label>
                 </div>
                 {isNewCrib ? (
                   <input type="text" value={newCribName} onChange={e => setNewCribName(e.target.value)} placeholder="e.g. The Heritage Crib" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)' }} required />
                 ) : (
                   <select value={newCribName} onChange={e => setNewCribName(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)' }}>
                     {uniqueCribNames.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
                   </select>
                 )}
              </div>
              
              <div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label className="label-caps">Wood Type</label>
                    <label style={{ fontSize: '12px', display: 'flex', gap: '4px' }}><input type="checkbox" checked={isNewWood} onChange={e => setIsNewWood(e.target.checked)} /> Create New Wood</label>
                 </div>
                 {isNewWood ? (
                   <input type="text" value={newWood} onChange={e => setNewWood(e.target.value)} placeholder="e.g. Walnut" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)' }} required />
                 ) : (
                   <select value={newWood} onChange={e => setNewWood(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)' }}>
                     {uniqueWoods.map(w => <option key={w as string} value={w as string}>{w as string}</option>)}
                   </select>
                 )}
              </div>

              <div>
                 <label className="label-caps" style={{ display: 'block', marginBottom: '8px' }}>Base Price (For Crib + Wood)</label>
                 <input type="number" value={newBasePrice} onChange={e => setNewBasePrice(Number(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)' }} required />
                 <p className="body-md" style={{ fontSize: '10px', marginTop: '4px', color: 'var(--on-surface-variant)' }}>Note: This will set the base price if this is a new Wood Type for this Crib.</p>
              </div>

              <div>
                 <label className="label-caps" style={{ display: 'block', marginBottom: '8px' }}>Stain Name</label>
                 <input type="text" value={newStainName} onChange={e => setNewStainName(e.target.value)} placeholder="e.g. Natural" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)' }} required />
              </div>

              <div>
                 <label className="label-caps" style={{ display: 'block', marginBottom: '8px' }}>Stain Price Addition (+ $)</label>
                 <input type="number" value={newPriceAddition} onChange={e => setNewPriceAddition(Number(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)' }} required />
              </div>
              <div>
                 <label className="label-caps" style={{ display: 'block', marginBottom: '8px' }}>Product Image</label>
                 <input type="file" ref={fileInputRef} onChange={e => setNewImage(e.target.files ? e.target.files[0] : null)} accept="image/*" style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--surface-container-lowest)', border: '1px dashed var(--outline-variant)' }} required />
              </div>
              <div style={{ gridColumn: 'span 2', textAlign: 'right' }}>
                 <button type="submit" className="add-to-cart" style={{ width: 'auto', padding: '12px 32px' }}>Upload & Add Variant</button>
              </div>
           </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        {inventory.map((item, cribIndex) => (
          <div key={`${item.id}-${item.wood}`} style={{ backgroundColor: 'var(--surface-container-lowest)', padding: '24px', borderRadius: '12px', boxShadow: 'var(--shadow-ambient)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
              <div>
                <h2 className="headline-md text-primary">{item.cribName}</h2>
                <span className="label-caps text-on-surface-variant">WOOD: {item.wood}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="label-caps">BASE PRICE: $</span>
                <input 
                  type="number" 
                  value={item.basePrice} 
                  onChange={e => updateBasePrice(cribIndex, e.target.value)}
                  style={{ width: '100px', padding: '8px', borderRadius: '4px', border: '1px solid var(--outline-variant)' }} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
              {item.stains.map((stain: any, stainIndex: number) => (
                <div key={stain.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid var(--outline-variant)', borderRadius: '8px', backgroundColor: stain.inStock ? 'var(--surface)' : 'var(--surface-container-highest)' }}>
                  <img src={stain.image} alt={stain.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }} />
                  <div style={{ flex: 1 }}>
                    <p className="body-md text-on-surface-variant" style={{ fontSize: '14px', fontWeight: 'bold' }}>{stain.name}</p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                       <span className="label-caps" style={{ fontSize: '10px' }}>+$</span>
                       <input 
                         type="number" 
                         value={stain.priceAddition || 0} 
                         onChange={e => updatePriceAddition(cribIndex, stainIndex, e.target.value)}
                         style={{ width: '60px', padding: '4px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--outline-variant)' }} 
                       />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px' }}>
                      <input 
                        type="checkbox" 
                        checked={stain.inStock} 
                        onChange={() => toggleStock(cribIndex, stainIndex)}
                      />
                      <span className="label-caps" style={{ fontSize: '10px' }}>IN STOCK</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
