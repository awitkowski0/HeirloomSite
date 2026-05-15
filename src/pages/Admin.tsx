import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAdminAuth } from '../context/AdminAuthContext';

const STAIN_SWATCH_COLORS: Record<string, string> = {
  natural: '#DEB887', slate: '#5A6064', smoke: '#3b3c36', cherry: '#651c14',
  driftwood: '#a39887', walnut: '#5C4033', ebony: '#3B3B3B', mahogany: '#4A2C2A',
  oak: '#B89B72', maple: '#DEB887', espresso: '#2C1E16', white: '#F5F5F0',
  grey: '#8C8C8C', gray: '#8C8C8C', black: '#2D2D2D', custom: '#8B4513',
};

function getStainColor(name: string, defaultColor?: string): string {
  if (defaultColor) return defaultColor;
  const n = name.toLowerCase();
  for (const [key, color] of Object.entries(STAIN_SWATCH_COLORS)) {
    if (n.includes(key)) return color;
  }
  return '#8B4513';
}

function imageCountsByPath(images: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const img of images) {
    counts['all'] = (counts['all'] || 0) + 1;
    counts[`crib:${img.cribName}`] = (counts[`crib:${img.cribName}`] || 0) + 1;
    counts[`wood:${img.cribName}:${img.wood}`] = (counts[`wood:${img.cribName}:${img.wood}`] || 0) + 1;
    if (img.stainName) {
      counts[`stain:${img.cribName}:${img.wood}:${img.stainName}`] = (counts[`stain:${img.cribName}:${img.wood}:${img.stainName}`] || 0) + 1;
    } else {
      counts[`unassigned:${img.cribName}:${img.wood}`] = (counts[`unassigned:${img.cribName}:${img.wood}`] || 0) + 1;
    }
  }
  return counts;
}

interface TreeFolderProps {
  label: string; count?: number; selected?: boolean; hasChildren?: boolean;
  defaultOpen?: boolean; onSelect?: () => void; actions?: React.ReactNode; children?: React.ReactNode;
}
function TreeFolder({ label, count, selected, hasChildren, defaultOpen, onSelect, actions, children }: TreeFolderProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div>
      <div onClick={() => { if (hasChildren) setOpen(!open); onSelect?.(); }}
        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer',
          backgroundColor: selected ? 'var(--primary-container, #E8D5C4)' : 'transparent',
          color: selected ? 'var(--on-primary-container, #3E2C1B)' : 'var(--on-surface-variant)', fontWeight: selected ? 600 : 400,
          fontSize: '13px', transition: 'all 0.15s' }}>
        {hasChildren ? (
          <span className="material-symbols-outlined" style={{ fontSize: '16px', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>chevron_right</span>
        ) : <span style={{ width: '16px' }} />}
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{selected || (hasChildren && open) ? 'folder_open' : 'folder'}</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {count !== undefined && <span style={{ fontSize: '11px', opacity: 0.5, marginRight: '2px' }}>{count}</span>}
        {actions && <div onClick={e => e.stopPropagation()}>{actions}</div>}
      </div>
      {open && hasChildren && <div style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '1px' }}>{children}</div>}
    </div>
  );
}

export default function Admin() {
  const { adminPassword, isAuthenticated, login, logout } = useAdminAuth();
  const [passwordInput, setPasswordInput] = useState('');

  // File explorer state
  const [selectedCrib, setSelectedCrib] = useState<string | null>(null);
  const [selectedWood, setSelectedWood] = useState<string | null>(null);
  const [selectedStain, setSelectedStain] = useState<string | null>(null);
  const [autoLink, setAutoLink] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Edit panel state
  const [editBasePrice, setEditBasePrice] = useState<number>(0);
  const [editDescription, setEditDescription] = useState<string>('');
  const [editExtendedDescription, setEditExtendedDescription] = useState<string>('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editSku, setEditSku] = useState<string>('');
  const [editSlug, setEditSlug] = useState<string>('');
  const [editDimensions, setEditDimensions] = useState<string>('');
  const [editWeight, setEditWeight] = useState<number>(0);
  const [editStains, setEditStains] = useState<any[]>([]);
  const [editAddons, setEditAddons] = useState<any[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonDescription, setNewAddonDescription] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState(0);
  const [newAddonPriceStained, setNewAddonPriceStained] = useState(0);
  const [newAddonCategory, setNewAddonCategory] = useState('conversion');
  const [newAddonStainable, setNewAddonStainable] = useState(false);

  // Stain type manager
  const [showStainManager, setShowStainManager] = useState(false);
  const [newStainName, setNewStainName] = useState('');
  const [newStainColor, setNewStainColor] = useState('');
  const [newStainPrice, setNewStainPrice] = useState(0);

  // Drag-reorder state
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const showNotif = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const images = useQuery(api.images.listAll);
  const stainTypes = useQuery(api.stainTypes.list);
  const inventory = useQuery(api.inventory.get as any, { useStaged: true }) as any[] | undefined;
  const showroomQuery = useQuery(api.showroom.get);

  const linkImage = useMutation(api.images.linkImage);
  const unlinkImage = useMutation(api.images.unlinkImage);
  const deleteImage = useMutation(api.images.deleteImage);
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const bulkUpload = useMutation(api.images.bulkUpload);
  const saveInventoryMutation = useMutation(api.inventory.save);
  const publishInventory = useMutation(api.inventory.publish as any);
  const publishShowroom = useMutation(api.showroom.save as any);
  const saveStainType = useMutation(api.stainTypes.save);
  const verifyPassword = useMutation(api.settings.verifyPassword);
  const deleteCribMutation = useMutation(api.inventory.deleteCrib);
  const deleteWoodMutation = useMutation(api.inventory.deleteWood);
  const reorderCribsMutation = useMutation(api.inventory.reorderCribs);
  const reorderWoodsMutation = useMutation(api.inventory.reorderWoods);

  const counts = images ? imageCountsByPath(images) : {};
  const knownStains = stainTypes?.map(s => s.name) || [];

  const filteredImages = images?.filter(img => {
    if (selectedCrib && img.cribName !== selectedCrib) return false;
    if (selectedWood && img.wood !== selectedWood) return false;
    if (selectedStain === '__unassigned__' && img.stainName) return false;
    if (selectedStain && selectedStain !== '__unassigned__' && img.stainName !== selectedStain) return false;
    return true;
  }) || [];

  const cribsFromInventory = inventory ? [...new Set(inventory.map(i => i.cribName))] : [];
  const cribsFromImages = images ? [...new Set(images.map(i => i.cribName))] : [];
  const allCribs = [...new Set([...cribsFromImages, ...cribsFromInventory])].sort((a, b) => {
    const orderA = inventory ? Math.min(...inventory.filter(i => i.cribName === a).map(i => i.order ?? 9999)) : 9999;
    const orderB = inventory ? Math.min(...inventory.filter(i => i.cribName === b).map(i => i.order ?? 9999)) : 9999;
    return orderA - orderB || a.localeCompare(b);
  });

  const currentConfig = selectedCrib && selectedWood
    ? inventory?.find(i => i.cribName === selectedCrib && i.wood === selectedWood)
    : null;

  useEffect(() => {
    if (selectedCrib && selectedWood && currentConfig) {
      setEditBasePrice(currentConfig.basePrice);
      setEditDescription(currentConfig.description || '');
      setEditExtendedDescription(currentConfig.extendedDescription || '');
      setEditTags(currentConfig.tags || []);
      setEditSku(currentConfig.sku || '');
      setEditSlug(currentConfig.slug || '');
      setEditDimensions(currentConfig.dimensions || '');
      setEditWeight(currentConfig.weight ?? 0);
      setEditStains(currentConfig.stains.map((s: any) => ({ ...s })));
      setEditAddons(currentConfig.addons ? currentConfig.addons.map((a: any) => ({ ...a })) : []);
    }
  }, [selectedCrib, selectedWood, currentConfig]);

  const breadcrumb = () => {
    const parts: { label: string; onClick: () => void }[] = [
      { label: 'All', onClick: () => { setSelectedCrib(null); setSelectedWood(null); setSelectedStain(null); } }
    ];
    if (selectedCrib) parts.push({ label: selectedCrib, onClick: () => { setSelectedWood(null); setSelectedStain(null); } });
    if (selectedWood) parts.push({ label: selectedWood, onClick: () => { setSelectedStain(null); } });
    if (selectedStain === '__unassigned__') parts.push({ label: 'Unassigned', onClick: () => {} });
    else if (selectedStain) parts.push({ label: selectedStain, onClick: () => {} });
    return parts;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ok = await verifyPassword({ password: passwordInput });
      if (ok) { login(passwordInput); }
      else { alert('Incorrect password'); setPasswordInput(''); }
    } catch { alert('Error verifying password'); }
  };

  const handleUploadFiles = async (files: File[]) => {
    if (!selectedCrib || !selectedWood) { showNotif('Select a crib and wood folder first'); return; }
    setUploading(true);
    setUploadProgress(`Uploading ${files.length} file(s)...`);
    const uploads = [];
    for (const file of files) {
      try {
        setUploadProgress(`Uploading ${file.name}...`);
        const postUrl = await generateUploadUrl({ password: adminPassword });
        const result = await fetch(postUrl, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
        const { storageId } = await result.json();
        if (storageId) uploads.push({ cribName: selectedCrib, wood: selectedWood, storageId, originalName: file.name, mimeType: file.type || "image/jpeg", size: file.size });
      } catch (err) { console.error(`Failed to upload ${file.name}:`, err); showNotif(`Failed to upload ${file.name}`); }
    }
    if (uploads.length > 0) { await bulkUpload({ password: adminPassword, uploads, autoLink }); showNotif(`Uploaded ${uploads.length} image(s)`); }
    setUploading(false); setUploadProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length > 0) handleUploadFiles(Array.from(e.dataTransfer.files)); };
  const handleLinkStain = async (imageId: string, stainName: string) => { await linkImage({ password: adminPassword, imageId: imageId as any, stainName }); showNotif(`Linked to ${stainName}`); };
  const handleUnlinkStain = async (imageId: string) => { await unlinkImage({ password: adminPassword, imageId: imageId as any }); showNotif('Unlinked'); };
  const handleDeleteImage = async (imageId: string) => { if (!confirm('Delete permanently?')) return; await deleteImage({ password: adminPassword, imageId: imageId as any }); showNotif('Deleted'); };

  const reorderImages = useMutation(api.images.reorderImages);
  const backfillImages = useMutation(api.inventory.backfillImages);

  // Showroom editing state
  const [showShowroomPanel, setShowShowroomPanel] = useState(false);
  const [editFeaturedIndex, setEditFeaturedIndex] = useState<number | null>(null);
  const [editFeaturedCrib, setEditFeaturedCrib] = useState('');
  const [editFeaturedStain, setEditFeaturedStain] = useState('');
  const slideDesktopInputRef = useRef<HTMLInputElement>(null);
  const slideMobileInputRef = useRef<HTMLInputElement>(null);
  const [slideUploading, setSlideUploading] = useState(false);
  const [slideUploadTarget, setSlideUploadTarget] = useState<{index: number, slot: 'desktop' | 'mobile'} | null>(null);
  const slides = showroomQuery?.slides || [];
  const featured = showroomQuery?.featured || [];

  const allStainOptions = inventory
    ? [...new Set(inventory.flatMap((i: any) => i.stains.map((s: any) => s.name)))]
    : [];

  const saveShowroomData = async (overrides: {
    slides?: any[];
    featured?: any[];
  }) => {
    try {
      await publishShowroom({ password: adminPassword, ...overrides });
      showNotif('Showroom updated');
    } catch (err: any) {
      showNotif('Error: ' + (err?.message || 'Unknown error'));
      console.error('saveShowroomData error', err);
    }
  };

  const handleSlideFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !slideUploadTarget) return;
    setSlideUploading(true);
    try {
      const postUrl = await generateUploadUrl({ password: adminPassword });
      const result = await fetch(postUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await result.json();

      const mergeSlide = (slide: any, slot: 'desktop' | 'mobile', id: string) => {
        if (slot === 'desktop') return { ...slide, image: id };
        return { ...slide, imageMobile: id };
      };

      if (slideUploadTarget.index === -1) {
        const newSlide: any = { image: '', imageMobile: undefined, productId: undefined };
        const merged = mergeSlide(newSlide, slideUploadTarget.slot, storageId);
        const productId = prompt("Enter product ID to link (or leave blank):") || undefined;
        if (productId) merged.productId = productId;
        await saveShowroomData({ slides: [...slides, merged] });
      } else {
        const newSlides = [...slides];
        newSlides[slideUploadTarget.index] = mergeSlide({ ...newSlides[slideUploadTarget.index] }, slideUploadTarget.slot, storageId);
        await saveShowroomData({ slides: newSlides });
      }
    } catch { showNotif('Failed to upload slide image'); }
    finally { setSlideUploading(false); if (e.target) e.target.value = ''; }
  };

  const startAddSlide = (slot: 'desktop' | 'mobile') => {
    setSlideUploadTarget({ index: -1, slot });
    if (slot === 'desktop') slideDesktopInputRef.current?.click();
    else slideMobileInputRef.current?.click();
  };
  const replaceSlideImage = (index: number, slot: 'desktop' | 'mobile') => {
    setSlideUploadTarget({ index, slot });
    if (slot === 'desktop') slideDesktopInputRef.current?.click();
    else slideMobileInputRef.current?.click();
  };
  const [editingSlideProduct, setEditingSlideProduct] = useState<number | null>(null);
  const [editSlideProductCrib, setEditSlideProductCrib] = useState('');

  const startEditSlideProduct = (index: number) => {
    setEditingSlideProduct(index);
    setEditSlideProductCrib(slides[index].productId || '');
  };

  const saveSlideProduct = async () => {
    if (editingSlideProduct === null) return;
    const productId = editSlideProductCrib || undefined;
    const newSlides = [...slides];
    newSlides[editingSlideProduct] = { ...slides[editingSlideProduct], productId };
    await saveShowroomData({ slides: newSlides });
    setEditingSlideProduct(null);
  };

  const cancelEditSlideProduct = () => { setEditingSlideProduct(null); };

  const portAllProducts = async () => {
    const names = [...new Set((inventory || []).map((i: any) => i.cribName))];
    if (names.length === 0) { showNotif('No inventory to port'); return; }
    const existing = new Set(featured.map((f: any) => f.cribName));
    const newFeatured = names.filter((n) => !existing.has(n)).map((n) => ({ cribName: n, stainName: undefined as string | undefined }));
    if (newFeatured.length === 0) { showNotif('All products already featured'); return; }
    await saveShowroomData({ featured: [...featured, ...newFeatured] });
    showNotif(`Added ${newFeatured.length} product(s) to featured`);
  };

  const removeSlide = async (index: number) => {
    await saveShowroomData({ slides: slides.filter((_: any, i: number) => i !== index) });
  };

  const moveSlide = async (index: number, direction: number) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= slides.length) return;
    const newSlides = [...slides];
    [newSlides[index], newSlides[newIndex]] = [newSlides[newIndex], newSlides[index]];
    await saveShowroomData({ slides: newSlides });
  };

  const startAddFeatured = () => {
    setEditFeaturedIndex(-1);
    setEditFeaturedCrib('');
    setEditFeaturedStain('');
  };

  const startEditFeatured = (index: number) => {
    const item = featured[index];
    setEditFeaturedIndex(index);
    setEditFeaturedCrib(item.cribName || '');
    setEditFeaturedStain(item.stainName || '');
  };

  const cancelEditFeatured = () => { setEditFeaturedIndex(null); };

  const saveEditFeatured = async () => {
    if (!editFeaturedCrib) return;
    const stainName = editFeaturedStain || undefined;
    if (editFeaturedIndex === -1) {
      await saveShowroomData({ featured: [...featured, { cribName: editFeaturedCrib, stainName }] });
    } else if (editFeaturedIndex !== null) {
      const newFeatured = [...featured];
      newFeatured[editFeaturedIndex] = { cribName: editFeaturedCrib, stainName };
      await saveShowroomData({ featured: newFeatured });
    }
    cancelEditFeatured();
  };

  const removeFeatured = async (index: number) => {
    await saveShowroomData({ featured: featured.filter((_: any, i: number) => i !== index) });
  };

  const moveFeatured = async (index: number, direction: number) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= featured.length) return;
    const newFeatured = [...featured];
    [newFeatured[index], newFeatured[newIndex]] = [newFeatured[newIndex], newFeatured[index]];
    await saveShowroomData({ featured: newFeatured });
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    const reordered = [...filteredImages];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    await reorderImages({ password: adminPassword, imageIds: reordered.map(i => i._id as any) });
    showNotif('Reordered');
  };

  const saveStainsArray = async (stains: any[]) => {
    setEditStains(stains);
    if (!inventory) return;
    const inv = inventory.map(item => {
      if (item.cribName === selectedCrib && item.wood === selectedWood) return { ...item, stains };
      return item;
    });
    await saveInventoryMutation({ password: adminPassword, inventory: inv });
  };

  if (!isAuthenticated) return (
    <div className="container" style={{ padding: '120px 24px', display: 'flex', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ backgroundColor: 'var(--surface-container-lowest)', padding: '48px', borderRadius: '16px', boxShadow: 'var(--shadow-ambient)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '48px', marginBottom: '16px' }}>lock</span>
        <h1 className="headline-md text-primary" style={{ marginBottom: '8px' }}>Admin Access</h1>
        <p className="body-md text-on-surface-variant" style={{ marginBottom: '32px' }}>Enter admin password.</p>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder="Password" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', textAlign: 'center', letterSpacing: '0.2em' }} required />
          <button type="submit" className="add-to-cart" style={{ width: '100%' }}>Authenticate</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="container" style={{ padding: '80px 24px', maxWidth: '1400px' }}>
      {notification && (
        <div style={{ position: 'fixed', top: '100px', right: '24px', backgroundColor: 'var(--primary)', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontSize: '14px', fontWeight: 600 }}>
          {notification}
        </div>
      )}

      {/* Top toolbar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', padding: '20px 24px', backgroundColor: 'var(--surface-container-low)', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="headline-lg text-primary" style={{ fontSize: '22px' }}>Admin Dashboard</h1>
            <p className="body-sm text-on-surface-variant" style={{ fontSize: '13px' }}>File-based product & image manager</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={async () => { if (!confirm('Publish all staged inventory to live?')) return; await publishInventory({ password: adminPassword }); showNotif('Inventory published!'); }}
              className="filter-btn active" style={{ padding: '8px 16px', fontSize: '12px' }}>Publish Inventory
            </button>
            <button onClick={async () => { await publishShowroom({ password: adminPassword }); showNotif('Showroom published!'); }}
              className="filter-btn" style={{ padding: '8px 16px', fontSize: '12px', backgroundColor: 'var(--tertiary)', color: 'white', border: 'none' }}>Publish Showroom
            </button>
            <button onClick={async () => { await backfillImages({ password: adminPassword }); showNotif('Images linked from inventory!'); }}
              className="filter-btn" style={{ padding: '8px 16px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>link</span> Link Images
            </button>
            <button onClick={() => setShowStainManager(!showStainManager)}
              className="filter-btn" style={{ padding: '8px 16px', fontSize: '12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>palette</span> Stains
            </button>
            <button onClick={() => setShowShowroomPanel(!showShowroomPanel)}
              className="filter-btn" style={{ padding: '8px 16px', fontSize: '12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>store</span> Showroom
            </button>
            <button onClick={() => logout()} className="icon-btn" title="Logout">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stain type manager panel */}
      {showStainManager && (
        <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: 'var(--surface-container-lowest)', borderRadius: '12px', boxShadow: 'var(--shadow-ambient)' }}>
          <h3 className="headline-sm" style={{ fontSize: '16px', marginBottom: '16px' }}>Stain Types</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            {stainTypes?.map(s => (
              <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--outline-variant)' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getStainColor(s.name, s.color), display: 'inline-block' }} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{s.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>+${s.defaultPriceAddition}</span>
              </div>
            ))}
            <button onClick={async () => { if (!newStainName) return; await saveStainType({ password: adminPassword, name: newStainName, color: newStainColor, defaultPriceAddition: newStainPrice }); setNewStainName(''); setNewStainColor(''); setNewStainPrice(0); showNotif(`Stain "${newStainName}" saved`); }}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px dashed var(--outline-variant)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              <input type="text" value={newStainName} onChange={e => setNewStainName(e.target.value)} placeholder="New stain name" style={{ border: 'none', background: 'none', outline: 'none', fontSize: '13px', width: '100px' }} />
              <input type="text" value={newStainColor} onChange={e => setNewStainColor(e.target.value)} placeholder="hex color" style={{ border: 'none', background: 'none', outline: 'none', fontSize: '11px', width: '70px', color: 'var(--on-surface-variant)' }} />
              <span style={{ fontSize: '11px' }}>+$</span>
              <input type="number" value={newStainPrice} onChange={e => setNewStainPrice(Number(e.target.value))} style={{ border: 'none', background: 'none', outline: 'none', fontSize: '11px', width: '50px' }} />
            </button>
          </div>
        </div>
      )}

      {/* Showroom settings panel */}
      {showShowroomPanel && (
        <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: 'var(--surface-container-lowest)', borderRadius: '12px', boxShadow: 'var(--shadow-ambient)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="headline-sm" style={{ fontSize: '16px' }}>Showroom Settings</h3>
          </div>

          {/* Slideshow section */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Slideshow</h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => startAddSlide('mobile')} className="filter-btn" style={{ padding: '6px 14px', fontSize: '12px' }} disabled={slideUploading}>+ Mobile Slide</button>
                <button onClick={() => startAddSlide('desktop')} className="filter-btn" style={{ padding: '6px 14px', fontSize: '12px' }} disabled={slideUploading}>+ Desktop Slide</button>
              </div>
            </div>
            <input type="file" ref={slideDesktopInputRef} onChange={handleSlideFileChosen} accept="image/*" style={{ display: 'none' }} />
            <input type="file" ref={slideMobileInputRef} onChange={handleSlideFileChosen} accept="image/*" style={{ display: 'none' }} />
            {slideUploading && <p className="body-sm" style={{ fontSize: '12px', color: 'var(--primary)', marginBottom: '8px' }}>Uploading...</p>}
            {slides.length === 0 ? (
              <p className="body-sm text-on-surface-variant" style={{ fontSize: '13px' }}>No slides yet. Add a desktop or mobile slide to start.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {slides.map((slide: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--surface)', border: '1px solid var(--outline-variant)' }}>
                    {/* Desktop thumbnail */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div onClick={() => replaceSlideImage(i, 'desktop')} style={{ width: '80px', height: '45px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--surface-container-high)', cursor: 'pointer', position: 'relative', border: '1px solid var(--outline-variant)' }} title="Click to replace desktop image">
                        {slide.image && <img src={slide.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'white' }}>photo_camera</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '9px', color: 'var(--on-surface-variant)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Desktop</span>
                    </div>
                    {/* Mobile thumbnail */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div onClick={() => replaceSlideImage(i, 'mobile')} style={{ width: '45px', height: '45px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--surface-container-high)', cursor: 'pointer', position: 'relative', border: '1px solid var(--outline-variant)' }} title="Click to replace mobile image">
                        {slide.imageMobile && <img src={slide.imageMobile} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'white' }}>photo_camera</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '9px', color: 'var(--on-surface-variant)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mobile</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingSlideProduct === i ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <select value={editSlideProductCrib} onChange={e => setEditSlideProductCrib(e.target.value)}
                            style={{ flex: 1, padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--outline-variant)', fontSize: '12px', background: 'white' }}>
                            <option value="">No product link</option>
                            {allCribs.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <button onClick={saveSlideProduct} className="icon-btn" style={{ padding: '2px', opacity: 0.6, fontSize: '0' }}><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span></button>
                          <button onClick={cancelEditSlideProduct} className="icon-btn" style={{ padding: '2px', opacity: 0.4, fontSize: '0' }}><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span></button>
                        </div>
                      ) : (
                        <span onClick={() => startEditSlideProduct(i)} style={{ fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: '2px' }}>{slide.productId || 'Set product link'}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button onClick={() => moveSlide(i, -1)} disabled={i === 0} className="icon-btn" title="Move up" style={{ padding: '4px', opacity: i === 0 ? 0.15 : 0.5, fontSize: '0' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>keyboard_arrow_up</span></button>
                      <button onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1} className="icon-btn" title="Move down" style={{ padding: '4px', opacity: i === slides.length - 1 ? 0.15 : 0.5, fontSize: '0' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>keyboard_arrow_down</span></button>
                      <button onClick={() => removeSlide(i)} className="icon-btn" title="Delete" style={{ padding: '4px', opacity: 0.4, fontSize: '0' }}><span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--error)' }}>delete</span></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Featured section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Featured Products</h4>
              {editFeaturedIndex === null && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={portAllProducts} className="filter-btn" style={{ padding: '6px 14px', fontSize: '12px' }} title="Add all cribs from inventory to featured">Port All</button>
                  <button onClick={startAddFeatured} className="filter-btn" style={{ padding: '6px 14px', fontSize: '12px' }}>+ Add Featured</button>
                </div>
              )}
            </div>

            {/* Inline editor for adding/editing featured item */}
            {editFeaturedIndex !== null && (
              <div style={{ marginBottom: '16px', padding: '16px', borderRadius: '10px', backgroundColor: 'var(--surface)', border: '2px solid var(--primary)' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>{editFeaturedIndex === -1 ? 'Add Featured Product' : 'Edit Featured Product'}</p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <label className="label-caps" style={{ fontSize: '10px', marginBottom: '4px', display: 'block' }}>Crib</label>
                    <select value={editFeaturedCrib} onChange={e => { setEditFeaturedCrib(e.target.value); setEditFeaturedStain(''); }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--outline-variant)', fontSize: '13px', background: 'white' }}>
                      <option value="">Select a crib...</option>
                      {allCribs.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <label className="label-caps" style={{ fontSize: '10px', marginBottom: '4px', display: 'block' }}>Stain (optional)</label>
                    <select value={editFeaturedStain} onChange={e => setEditFeaturedStain(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--outline-variant)', fontSize: '13px', background: 'white' }}>
                      <option value="">Natural (default)</option>
                      {allStainOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={saveEditFeatured} className="filter-btn active" style={{ padding: '8px 16px', fontSize: '12px' }}>Save</button>
                    <button onClick={cancelEditFeatured} className="filter-btn" style={{ padding: '8px 16px', fontSize: '12px' }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {featured.length === 0 ? (
              <p className="body-sm text-on-surface-variant" style={{ fontSize: '13px' }}>No featured products yet. Click "Add Featured" to add one.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {featured.map((item: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--surface)', border: '1px solid var(--outline-variant)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--primary)' }}>child_care</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600 }}>{item.cribName}</p>
                      <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Stain: {item.stainName || 'Natural (default)'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button onClick={() => startEditFeatured(i)} className="icon-btn" title="Edit" style={{ padding: '4px', opacity: 0.5, fontSize: '0' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span></button>
                      <button onClick={() => moveFeatured(i, -1)} disabled={i === 0} className="icon-btn" title="Move up" style={{ padding: '4px', opacity: i === 0 ? 0.15 : 0.5, fontSize: '0' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>keyboard_arrow_up</span></button>
                      <button onClick={() => moveFeatured(i, 1)} disabled={i === featured.length - 1} className="icon-btn" title="Move down" style={{ padding: '4px', opacity: i === featured.length - 1 ? 0.15 : 0.5, fontSize: '0' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>keyboard_arrow_down</span></button>
                      <button onClick={() => removeFeatured(i)} className="icon-btn" title="Delete" style={{ padding: '4px', opacity: 0.4, fontSize: '0' }}><span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--error)' }}>delete</span></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* File explorer layout */}
      <div style={{ display: 'flex', gap: '20px', minHeight: '70vh' }}>
        {/* Folder tree sidebar */}
        <div style={{ width: '240px', flexShrink: 0, backgroundColor: 'var(--surface-container-lowest)', borderRadius: '12px', padding: '12px', overflowY: 'auto', maxHeight: 'calc(100vh - 260px)', boxShadow: 'var(--shadow-ambient)' }}>
          <div style={{ marginBottom: '8px', padding: '0 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label-caps" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>FOLDERS</span>
            <span style={{ fontSize: '10px', opacity: 0.4 }}>{counts['all'] || 0} files</span>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px', padding: '0 4px' }}>
            {['All', 'Cribs', 'Bassinets', 'Mattresses', 'Bedding', 'Furniture', 'Décor', 'Gear'].map(cat => (
              <span key={cat} onClick={() => { setSelectedCrib(null); setSelectedWood(null); setSelectedStain(null); }}
                style={{ padding: '2px 8px', borderRadius: '100px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', background: (selectedCrib === null && (cat === 'All')) ? 'var(--primary)' : 'transparent', color: (selectedCrib === null && (cat === 'All')) ? 'var(--on-primary)' : 'var(--on-surface-variant)', border: '1px solid var(--outline-variant)', transition: 'all 0.15s' }}>
                {cat}
              </span>
            ))}
          </div>
          <TreeFolder label="All Products" count={counts['all']} selected={!selectedCrib && !selectedWood && !selectedStain}
            onSelect={() => { setSelectedCrib(null); setSelectedWood(null); setSelectedStain(null); }} />
          <div style={{ height: '1px', backgroundColor: 'var(--outline-variant)', margin: '6px 0', opacity: 0.3 }} />
          {allCribs.map((crib, cribIdx) => {
            const woodsFromInventory = inventory ? [...new Set(inventory.filter(i => i.cribName === crib).map(i => i.wood))] : [];
            const woodsFromImages = images ? [...new Set(images.filter(i => i.cribName === crib).map(i => i.wood))] : [];
            const allWoods = [...new Set([...woodsFromImages, ...woodsFromInventory])].sort((a, b) => {
              const orderA = inventory?.find(i => i.cribName === crib && i.wood === a)?.order ?? 9999;
              const orderB = inventory?.find(i => i.cribName === crib && i.wood === b)?.order ?? 9999;
              return orderA - orderB || a.localeCompare(b);
            });
            return (
              <TreeFolder key={crib} label={crib} count={counts[`crib:${crib}`]} selected={selectedCrib === crib && !selectedWood} hasChildren defaultOpen={selectedCrib === crib}
                onSelect={() => { setSelectedCrib(crib); setSelectedWood(null); setSelectedStain(null); }}
                actions={<div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                  <button onClick={async () => { await reorderCribsMutation({ password: adminPassword, cribName: crib, newOrder: (cribIdx > 0 ? inventory?.find(i => i.cribName === allCribs[cribIdx - 1])?.order ?? 0 : 0) + 1 }); showNotif(`Moved "${crib}"`); }} disabled={cribIdx === 0}
                    className="icon-btn" title="Move up" style={{ padding: '0', height: '14px', opacity: cribIdx === 0 ? 0.15 : 0.35, fontSize: '0', cursor: cribIdx === 0 ? 'default' : 'pointer' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>keyboard_arrow_up</span>
                  </button>
                  <button onClick={async () => { await reorderCribsMutation({ password: adminPassword, cribName: crib, newOrder: (inventory?.find(i => i.cribName === allCribs[cribIdx + 1])?.order ?? 99999) - 1 }); showNotif(`Moved "${crib}"`); }} disabled={cribIdx === allCribs.length - 1}
                    className="icon-btn" title="Move down" style={{ padding: '0', height: '14px', opacity: cribIdx === allCribs.length - 1 ? 0.15 : 0.35, fontSize: '0', cursor: cribIdx === allCribs.length - 1 ? 'default' : 'pointer' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>keyboard_arrow_down</span>
                  </button>
                  <button onClick={async () => { if (!confirm(`Delete entire product "${crib}" and all its images?`)) return; await deleteCribMutation({ password: adminPassword, cribName: crib }); showNotif(`Deleted ${crib}`); }} className="icon-btn" title="Delete product" style={{ padding: '2px', opacity: 0.4, fontSize: '0' }}><span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--error)' }}>delete</span></button>
                </div>}>
                {allWoods.map((wood, woodIdx) => {
                  const stainsFromImages = images ? [...new Set(images.filter(i => i.cribName === crib && i.wood === wood && i.stainName).map(i => i.stainName!))].sort() : [];
                  const stainsFromInventory = inventory ? [...new Set(inventory.filter(i => i.cribName === crib && i.wood === wood).flatMap(i => i.stains.map((s: any) => s.name)))].sort() : [];
                  const allStains = [...new Set([...stainsFromImages, ...stainsFromInventory])].sort();
                  const hasUnassigned = images?.some(i => i.cribName === crib && i.wood === wood && !i.stainName);
                  return (
                    <TreeFolder key={wood} label={wood} count={counts[`wood:${crib}:${wood}`]} selected={selectedCrib === crib && selectedWood === wood && !selectedStain} hasChildren defaultOpen={selectedWood === wood}
                      onSelect={() => { setSelectedCrib(crib); setSelectedWood(wood); setSelectedStain(null); }}
                      actions={<div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                        <button onClick={async () => { await reorderWoodsMutation({ password: adminPassword, cribName: crib, wood, newOrder: (woodIdx > 0 ? inventory?.find(i => i.cribName === crib && i.wood === allWoods[woodIdx - 1])?.order ?? 0 : 0) + 1 }); showNotif(`Moved "${wood}"`); }} disabled={woodIdx === 0}
                          className="icon-btn" title="Move up" style={{ padding: '0', height: '14px', opacity: woodIdx === 0 ? 0.15 : 0.35, fontSize: '0', cursor: woodIdx === 0 ? 'default' : 'pointer' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>keyboard_arrow_up</span>
                        </button>
                        <button onClick={async () => { await reorderWoodsMutation({ password: adminPassword, cribName: crib, wood, newOrder: (inventory?.find(i => i.cribName === crib && i.wood === allWoods[woodIdx + 1])?.order ?? 99999) - 1 }); showNotif(`Moved "${wood}"`); }} disabled={woodIdx === allWoods.length - 1}
                          className="icon-btn" title="Move down" style={{ padding: '0', height: '14px', opacity: woodIdx === allWoods.length - 1 ? 0.15 : 0.35, fontSize: '0', cursor: woodIdx === allWoods.length - 1 ? 'default' : 'pointer' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>keyboard_arrow_down</span>
                        </button>
                        <button onClick={async () => { if (!confirm(`Delete wood "${wood}" for "${crib}" and all its images?`)) return; await deleteWoodMutation({ password: adminPassword, cribName: crib, wood }); showNotif(`Deleted ${crib} > ${wood}`); }} className="icon-btn" title="Delete wood" style={{ padding: '2px', opacity: 0.4, fontSize: '0' }}><span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--error)' }}>delete</span></button>
                      </div>}>
                      {hasUnassigned && <TreeFolder label="Unassigned" count={counts[`unassigned:${crib}:${wood}`]} selected={selectedCrib === crib && selectedWood === wood && selectedStain === '__unassigned__'}
                        onSelect={() => { setSelectedCrib(crib); setSelectedWood(wood); setSelectedStain('__unassigned__'); }} />}
                      {allStains.map(stain => (
                        <TreeFolder key={stain} label={stain} count={counts[`stain:${crib}:${wood}:${stain}`]} selected={selectedCrib === crib && selectedWood === wood && selectedStain === stain}
                          onSelect={() => { setSelectedCrib(crib); setSelectedWood(wood); setSelectedStain(stain); }} />
                      ))}
                    </TreeFolder>
                  );
                })}
              </TreeFolder>
            );
          })}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, backgroundColor: 'var(--surface-container-lowest)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-ambient)' }}>
          {/* Breadcrumb */}
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
              {breadcrumb().map((part, i, arr) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {i > 0 && <span className="material-symbols-outlined" style={{ fontSize: '14px', opacity: 0.3 }}>chevron_right</span>}
                  <span onClick={part.onClick} style={{ cursor: i < arr.length - 1 ? 'pointer' : 'default', color: i < arr.length - 1 ? 'var(--primary)' : 'var(--on-surface)', fontWeight: i === arr.length - 1 ? 600 : 400, fontSize: '13px' }}>{part.label}</span>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: 'pointer' }}>
                <input type="checkbox" checked={autoLink} onChange={e => setAutoLink(e.target.checked)} />
                Auto-link
              </label>
            </div>
          </div>

          {/* Root level: show crib cards */}
          {!selectedCrib && (
            <div>
              <p className="body-sm text-on-surface-variant" style={{ marginBottom: '16px', fontSize: '13px' }}>Select a product line to manage images, pricing, and stains.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                {allCribs.map(crib => (
                  <div key={crib} style={{ position: 'relative', borderRadius: '10px', backgroundColor: 'var(--surface)', border: '1px solid var(--outline-variant)', cursor: 'pointer', textAlign: 'center', boxShadow: 'var(--shadow-ambient)', transition: 'all 0.2s' }}>
                    <div onClick={() => { setSelectedCrib(crib); setSelectedWood(null); setSelectedStain(null); }} style={{ padding: '20px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--primary)', marginBottom: '8px', display: 'block' }}>folder</span>
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>{crib}</p>
                      <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{counts[`crib:${crib}`] || 0} images</p>
                    </div>
                    <button onClick={async (e) => { e.stopPropagation(); if (!confirm(`Delete entire product "${crib}" and all its images?`)) return; await deleteCribMutation({ password: adminPassword, cribName: crib }); showNotif(`Deleted ${crib}`); }}
                      className="icon-btn" title="Delete product" style={{ position: 'absolute', top: '6px', right: '6px', opacity: 0.3, padding: '2px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--error)' }}>delete</span>
                    </button>
                  </div>
                ))}
                <div onClick={() => {
                  const name = prompt('New product name:');
                  if (name) { setSelectedCrib(name); setSelectedWood(null); showNotif(`Product "${name}" created. Add a wood type to start.`); }
                }} style={{ padding: '20px', borderRadius: '10px', border: '2px dashed var(--outline-variant)', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--on-surface-variant)' }}>add</span>
                  <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>New Product</p>
                </div>
              </div>
            </div>
          )}

          {/* Crib level (no wood selected): show wood cards */}
          {selectedCrib && !selectedWood && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p className="body-sm text-on-surface-variant" style={{ fontSize: '13px' }}>Wood types for <strong>{selectedCrib}</strong></p>
                <button onClick={() => {
                  const name = prompt('New wood name:');
                  if (name) { setSelectedWood(name); showNotif(`Wood "${name}" added to ${selectedCrib}.`); }
                }} className="filter-btn" style={{ padding: '6px 14px', fontSize: '12px' }}>+ Add Wood</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                {(() => {
                  const woods = [...new Set([
                    ...(inventory ? inventory.filter(i => i.cribName === selectedCrib).map(i => i.wood) : []),
                    ...(images ? images.filter(i => i.cribName === selectedCrib).map(i => i.wood) : [])
                  ])].sort();
                  return woods.map(wood => (
                    <div key={wood} style={{ position: 'relative', borderRadius: '10px', backgroundColor: 'var(--surface)', border: '1px solid var(--outline-variant)', cursor: 'pointer', textAlign: 'center', boxShadow: 'var(--shadow-ambient)' }}>
                      <div onClick={() => { setSelectedWood(wood); setSelectedStain(null); }} style={{ padding: '16px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--primary)', marginBottom: '6px', display: 'block' }}>folder</span>
                        <p style={{ fontSize: '13px', fontWeight: 600 }}>{wood}</p>
                        <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{counts[`wood:${selectedCrib}:${wood}`] || 0} images</p>
                      </div>
                      <button onClick={async (e) => { e.stopPropagation(); if (!confirm(`Delete wood "${wood}" for "${selectedCrib}" and all its images?`)) return; await deleteWoodMutation({ password: adminPassword, cribName: selectedCrib, wood }); showNotif(`Deleted ${selectedCrib} > ${wood}`); }}
                        className="icon-btn" title="Delete wood" style={{ position: 'absolute', top: '4px', right: '4px', opacity: 0.3, padding: '2px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--error)' }}>delete</span>
                      </button>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Wood level: show edit panel + stain folders */}
          {selectedCrib && selectedWood && !selectedStain && (
            <>
              {/* Edit panel */}
              <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--outline-variant)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 className="headline-sm" style={{ fontSize: '16px' }}>{selectedCrib} &gt; {selectedWood}</h3>
                  <button onClick={async () => {
                    if (!inventory) return;
                    const updated = inventory.map(item => {
                      if (item.cribName === selectedCrib && item.wood === selectedWood) return { ...item, basePrice: editBasePrice, description: editDescription, extendedDescription: editExtendedDescription, tags: editTags, addons: editAddons, sku: editSku, slug: editSlug, dimensions: editDimensions, weight: editWeight, stains: editStains };
                      return item;
                    });
                    await saveInventoryMutation({ password: adminPassword, inventory: updated });
                    showNotif('Saved');
                  }} className="filter-btn active" style={{ padding: '6px 16px', fontSize: '12px' }}>Save</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label className="label-caps" style={{ fontSize: '10px', marginBottom: '4px', display: 'block' }}>BASE PRICE ($)</label>
                    <input type="number" value={editBasePrice} onChange={e => setEditBasePrice(Number(e.target.value))} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--outline-variant)', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label className="label-caps" style={{ fontSize: '10px', marginBottom: '4px', display: 'block' }}>SKU</label>
                    <input type="text" value={editSku} onChange={e => setEditSku(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--outline-variant)', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label className="label-caps" style={{ fontSize: '10px', marginBottom: '4px', display: 'block' }}>SLUG</label>
                    <input type="text" value={editSlug} onChange={e => setEditSlug(e.target.value)} placeholder="URL-friendly ID" style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--outline-variant)', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label className="label-caps" style={{ fontSize: '10px', marginBottom: '4px', display: 'block' }}>DESCRIPTION</label>
                    <input type="text" value={editDescription} onChange={e => setEditDescription(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--outline-variant)', fontSize: '13px' }} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="label-caps" style={{ fontSize: '10px', marginBottom: '4px', display: 'block' }}>EXTENDED DESCRIPTION</label>
                    <textarea rows={4} value={editExtendedDescription} onChange={e => setEditExtendedDescription(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--outline-variant)', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label className="label-caps" style={{ fontSize: '10px', marginBottom: '4px', display: 'block' }}>DIMENSIONS</label>
                    <input type="text" value={editDimensions} onChange={e => setEditDimensions(e.target.value)} placeholder='e.g. 54"L x 30"W' style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--outline-variant)', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label className="label-caps" style={{ fontSize: '10px', marginBottom: '4px', display: 'block' }}>WEIGHT (lbs)</label>
                    <input type="number" value={editWeight} onChange={e => setEditWeight(Number(e.target.value))} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--outline-variant)', fontSize: '13px' }} />
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label className="label-caps" style={{ fontSize: '10px', marginBottom: '4px', display: 'block' }}>TAGS</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--outline-variant)', minHeight: '32px', alignItems: 'center' }}>
                    {editTags.map((tag, ti) => (
                      <span key={ti} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--primary)', color: 'white', fontSize: '11px', fontWeight: 600 }}>
                        {tag}
                        <span onClick={() => setEditTags(editTags.filter((_, i) => i !== ti))} style={{ cursor: 'pointer', fontSize: '14px', lineHeight: '14px', opacity: 0.7 }}>×</span>
                      </span>
                    ))}
                    <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) { e.preventDefault(); setEditTags([...editTags, tagInput.trim()]); setTagInput(''); } }}
                      placeholder="Add tag..." style={{ border: 'none', outline: 'none', fontSize: '12px', flex: 1, minWidth: '80px', background: 'none' }} />
                  </div>
                </div>

                {/* Addon editor */}
                <div style={{ marginBottom: '12px' }}>
                  <label className="label-caps" style={{ fontSize: '10px', marginBottom: '8px', display: 'block' }}>ADDONS</label>
                  {editAddons.map((addon, ai) => (
                    <div key={ai} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--outline-variant)', flexWrap: 'wrap' }}>
                      <input type="text" value={addon.name} onChange={e => { const a = [...editAddons]; a[ai] = { ...a[ai], name: e.target.value }; setEditAddons(a); }}
                        placeholder="Name" style={{ width: '140px', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--outline-variant)', fontSize: '12px' }} />
                      <input type="text" value={addon.description || ''} onChange={e => { const a = [...editAddons]; a[ai] = { ...a[ai], description: e.target.value }; setEditAddons(a); }}
                        placeholder="Description" style={{ width: '140px', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--outline-variant)', fontSize: '12px' }} />
                      <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>$</span>
                      <input type="number" value={addon.price} onChange={e => { const a = [...editAddons]; a[ai] = { ...a[ai], price: Number(e.target.value) }; setEditAddons(a); }}
                        placeholder="Price" style={{ width: '60px', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--outline-variant)', fontSize: '12px' }} />
                      <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>$ stained</span>
                      <input type="number" value={addon.priceStained} onChange={e => { const a = [...editAddons]; a[ai] = { ...a[ai], priceStained: Number(e.target.value) }; setEditAddons(a); }}
                        placeholder="Stained" style={{ width: '60px', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--outline-variant)', fontSize: '12px' }} />
                      <select value={addon.category || 'conversion'} onChange={e => { const a = [...editAddons]; a[ai] = { ...a[ai], category: e.target.value }; setEditAddons(a); }}
                        style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--outline-variant)', fontSize: '11px' }}>
                        <option value="conversion">Conversion</option>
                        <option value="mattress">Mattress</option>
                        <option value="matching_furniture">Furniture</option>
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={addon.stainable} onChange={e => { const a = [...editAddons]; a[ai] = { ...a[ai], stainable: e.target.checked }; setEditAddons(a); }} />
                        Stainable
                      </label>
                      <span onClick={() => setEditAddons(editAddons.filter((_, i) => i !== ai))} style={{ cursor: 'pointer', color: 'var(--error)', fontSize: '16px', lineHeight: '16px', opacity: 0.6 }}>×</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="text" value={newAddonName} onChange={e => setNewAddonName(e.target.value)} placeholder="Addon name" style={{ width: '120px', padding: '4px 6px', borderRadius: '4px', border: '1px dashed var(--outline-variant)', fontSize: '12px', background: 'none' }} />
                    <select value={newAddonCategory} onChange={e => setNewAddonCategory(e.target.value)} style={{ padding: '4px 6px', borderRadius: '4px', border: '1px dashed var(--outline-variant)', fontSize: '11px', background: 'none' }}>
                      <option value="conversion">Conversion</option>
                      <option value="mattress">Mattress</option>
                      <option value="matching_furniture">Furniture</option>
                    </select>
                    <button onClick={() => {
                      if (!newAddonName.trim()) return;
                      setEditAddons([...editAddons, { name: newAddonName.trim(), description: newAddonDescription, price: newAddonPrice, priceStained: newAddonPriceStained, category: newAddonCategory, stainable: newAddonStainable, image: undefined }]);
                      setNewAddonName(''); setNewAddonDescription(''); setNewAddonPrice(0); setNewAddonPriceStained(0); setNewAddonCategory('conversion'); setNewAddonStainable(false);
                    }} className="filter-btn" style={{ padding: '4px 10px', fontSize: '11px' }}>+ Add</button>
                  </div>
                </div>
              </div>

              {/* Upload zone */}
              <div ref={dropRef} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
                style={{ border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--outline-variant)'}`, borderRadius: '10px', padding: '24px', textAlign: 'center', marginBottom: '20px', backgroundColor: dragOver ? 'var(--primary-container, #f0e8e0)' : 'var(--surface)', transition: 'all 0.2s' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '8px' }}>cloud_upload</span>
                <p className="body-sm" style={{ fontSize: '13px', marginBottom: '12px' }}>{uploading ? uploadProgress : 'Drop images or click to browse'}</p>
                <input type="file" ref={fileInputRef} onChange={e => e.target.files && handleUploadFiles(Array.from(e.target.files))} accept="image/*" multiple style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current?.click()} className="filter-btn active" style={{ padding: '8px 20px', fontSize: '12px' }} disabled={uploading}>{uploading ? 'Uploading...' : 'Select Files'}</button>
              </div>

              {/* Stain folders */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <p className="body-sm text-on-surface-variant" style={{ fontSize: '13px' }}>Stains</p>
                  <button onClick={async () => {
                    const name = prompt('New stain name:');
                    if (name) {
                      await saveStainsArray([...editStains, { name, inStock: true, priceAddition: 0 }]);
                      showNotif(`Stain "${name}" added`);
                    }
                  }} className="filter-btn" style={{ padding: '6px 14px', fontSize: '12px' }}>+ Add Stain</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(editStains.length > 0 ? editStains : currentConfig?.stains || []).map((stain: any, idx: number) => (
                    <div key={stain.name}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', borderRadius: '8px', backgroundColor: 'var(--surface)', border: '1px solid var(--outline-variant)', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <button onClick={() => { if (idx > 0) saveStainsArray(editStains.with(idx - 1, editStains[idx]).with(idx, editStains[idx - 1])); }} disabled={idx === 0}
                          className="icon-btn" title="Move up" style={{ padding: '0', height: '12px', opacity: idx === 0 ? 0.2 : 0.5, fontSize: '0' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>keyboard_arrow_up</span>
                        </button>
                        <button onClick={() => { if (idx < editStains.length - 1) saveStainsArray(editStains.with(idx + 1, editStains[idx]).with(idx, editStains[idx + 1])); }} disabled={idx === editStains.length - 1}
                          className="icon-btn" title="Move down" style={{ padding: '0', height: '12px', opacity: idx === editStains.length - 1 ? 0.2 : 0.5, fontSize: '0' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>keyboard_arrow_down</span>
                        </button>
                      </div>
                      <span onClick={() => { setSelectedStain(stain.name); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>folder</span>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getStainColor(stain.name), display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stain.name}</span>
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--on-surface-variant)', whiteSpace: 'nowrap' }}>{counts[`stain:${selectedCrib}:${selectedWood}:${stain.name}`] || 0}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <span style={{ fontSize: '10px', opacity: 0.5 }}>$</span>
                        <input type="number" value={stain.priceAddition}
                          onChange={e => { const v = Number(e.target.value); setEditStains(prev => prev.map(s => s.name === stain.name ? { ...s, priceAddition: v } : s)); }}
                          style={{ width: '40px', padding: '2px 4px', fontSize: '10px', borderRadius: '4px', border: '1px solid var(--outline-variant)', textAlign: 'center' }} />
                      </span>
                      <span onClick={() => saveStainsArray(editStains.map(s => s.name === stain.name ? { ...s, inStock: !s.inStock } : s))}
                        style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: stain.inStock ? 'rgba(0,128,0,0.08)' : 'rgba(200,0,0,0.08)', color: stain.inStock ? 'green' : 'var(--error)' }}>
                        {stain.inStock ? 'Stock' : 'Sold'}
                      </span>
                      <button onClick={async () => {
                        const newName = prompt('Rename stain:', stain.name);
                        if (!newName || newName === stain.name) return;
                        await saveStainsArray(editStains.map(s => s.name === stain.name ? { ...s, name: newName } : s));
                        showNotif(`Renamed to "${newName}"`);
                      }} className="icon-btn" title="Rename" style={{ padding: '2px', opacity: 0.35, fontSize: '0' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>edit</span>
                      </button>
                      <button onClick={async () => {
                        if (!confirm(`Delete stain "${stain.name}"?`)) return;
                        await saveStainsArray(editStains.filter(s => s.name !== stain.name));
                        showNotif(`Deleted "${stain.name}"`);
                      }} className="icon-btn" title="Delete stain" style={{ padding: '2px', opacity: 0.3, fontSize: '0' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--error)' }}>delete</span>
                      </button>
                    </div>
                  ))}
                  {images?.some(i => i.cribName === selectedCrib && i.wood === selectedWood && !i.stainName) && (
                    <div onClick={() => setSelectedStain('__unassigned__')}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--surface)', border: '1px dashed var(--outline-variant)', cursor: 'pointer' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--on-surface-variant)' }}>folder_off</span>
                      <span style={{ flex: 1, fontSize: '13px', color: 'var(--on-surface-variant)' }}>Unassigned</span>
                      <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{counts[`unassigned:${selectedCrib}:${selectedWood}`] || 0} images</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Stain level: show images */}
          {selectedCrib && selectedWood && selectedStain && (
            <>
              {/* Image grid */}
              {filteredImages.length === 0 && !uploading && (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', marginBottom: '10px', display: 'block', opacity: 0.3 }}>photo_library</span>
                  <p className="body-sm" style={{ fontSize: '13px' }}>No images here. Upload from the wood folder view.</p>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                {filteredImages.map((img, idx) => (
                  <div key={img._id} draggable onDragStart={() => setDragIndex(idx)} onDragOver={e => e.preventDefault()} onDrop={() => { if (dragIndex !== null && dragIndex !== idx) { handleReorder(dragIndex, idx); setDragIndex(null); } }}
                    style={{ borderRadius: '10px', overflow: 'hidden', backgroundColor: 'var(--surface)', border: '1px solid var(--outline-variant)', boxShadow: dragIndex === idx ? '0 0 0 2px var(--primary)' : 'var(--shadow-ambient)', opacity: dragIndex === idx ? 0.5 : 1, transition: 'all 0.15s', cursor: 'grab' }}>
                    {img.resolvedUrl ? (
                      <img src={img.resolvedUrl} alt={img.originalName} style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                    ) : (
                      <div style={{ width: '100%', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface-container-highest)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--outline-variant)' }}>broken_image</span>
                      </div>
                    )}
                    <div style={{ padding: '8px 10px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{img.originalName}</p>
                      {img.stainName ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getStainColor(img.stainName), display: 'inline-block' }} />
                          <span style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>{img.stainName}</span>
                        </div>
                      ) : (
                        <select onChange={e => { const v = e.target.value; if (v) handleLinkStain(img._id, v); }}
                          style={{ width: '100%', padding: '3px', fontSize: '10px', borderRadius: '4px', border: '1px solid var(--outline-variant)' }} defaultValue="">
                          <option value="" disabled>Link stain...</option>
                          {knownStains.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '4px' }}>
                        {img.stainName && <button onClick={() => handleUnlinkStain(img._id)} className="icon-btn" title="Unlink"><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>link_off</span></button>}
                        <button onClick={() => handleDeleteImage(img._id)} className="icon-btn" title="Delete"><span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--error)' }}>delete</span></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
