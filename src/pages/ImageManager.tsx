import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PublicClientApplication, InteractionRequiredAuthError } from "@azure/msal-browser";
import { useAdminAuth } from '../context/AdminAuthContext';

const STAIN_SWATCH_COLORS: Record<string, string> = {
  natural: '#DEB887',
  slate: '#5A6064',
  smoke: '#3b3c36',
  cherry: '#651c14',
  driftwood: '#a39887',
  walnut: '#5C4033',
  ebony: '#3B3B3B',
  mahogany: '#4A2C2A',
  oak: '#B89B72',
  maple: '#DEB887',
  espresso: '#2C1E16',
  white: '#F5F5F0',
  grey: '#8C8C8C',
  gray: '#8C8C8C',
  black: '#2D2D2D',
  custom: '#8B4513',
};

function getStainColor(name: string, defaultColor?: string): string {
  if (defaultColor) return defaultColor;
  const n = name.toLowerCase();
  for (const [key, color] of Object.entries(STAIN_SWATCH_COLORS)) {
    if (n.includes(key)) return color;
  }
  return '#8B4513';
}

function FolderTreeItem({ label, count, selected, hasChildren, defaultOpen, onSelect, children }: {
  label: string;
  count?: number;
  selected?: boolean;
  hasChildren?: boolean;
  defaultOpen?: boolean;
  onSelect?: () => void;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div>
      <div
        onClick={() => { if (hasChildren) setOpen(!open); onSelect?.(); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 8px',
          borderRadius: '6px',
          cursor: 'pointer',
          backgroundColor: selected ? 'var(--primary-container, #E8D5C4)' : 'transparent',
          color: selected ? 'var(--on-primary-container, #3E2C1B)' : 'var(--on-surface-variant, #5C5248)',
          fontWeight: selected ? 600 : 400,
          fontSize: '13px',
          transition: 'all 0.15s',
        }}
      >
        {hasChildren ? (
          <span className="material-symbols-outlined" style={{ fontSize: '16px', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            chevron_right
          </span>
        ) : (
          <span style={{ width: '16px' }} />
        )}
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
          {selected ? 'folder_open' : hasChildren && open ? 'folder_open' : 'folder'}
        </span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {count !== undefined && (
          <span style={{ fontSize: '11px', opacity: 0.6, marginLeft: 'auto' }}>{count}</span>
        )}
      </div>
      {open && hasChildren && (
        <div style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function imageCountsByPath(images: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const img of images) {
    counts[`all`] = (counts[`all`] || 0) + 1;
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

interface OneDriveFile {
  id: string;
  name: string;
  size: number;
  folder?: boolean;
  downloadUrl?: string;
  mimeType?: string;
}

export default function ImageManager() {
  const { adminPassword, isAuthenticated, login, logout } = useAdminAuth();
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedCrib, setSelectedCrib] = useState<string | null>(null);
  const [selectedWood, setSelectedWood] = useState<string | null>(null);
  const [selectedStain, setSelectedStain] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [autoLink, setAutoLink] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const [showOneDrive, setShowOneDrive] = useState(false);
  const [msalInstance, setMsalInstance] = useState<PublicClientApplication | null>(null);
  const [oneDriveFiles, setOneDriveFiles] = useState<OneDriveFile[]>([]);
  const [oneDrivePath, setOneDrivePath] = useState<string>('/');
  const [oneDriveLoading, setOneDriveLoading] = useState(false);
  const [oneDriveSelected, setOneDriveSelected] = useState<Set<string>>(new Set());
  const [oneDriveImporting, setOneDriveImporting] = useState(false);
  const [oneDriveLoggedIn, setOneDriveLoggedIn] = useState(false);
  const msalInitRef = useRef(false);

  const images = useQuery(api.images.listAll);
  const stainTypes = useQuery(api.stainTypes.list);
  const inventory = useQuery(api.inventory.get as any, { useStaged: true }) as any[] | undefined;

  const linkImage = useMutation(api.images.linkImage);
  const unlinkImage = useMutation(api.images.unlinkImage);
  const deleteImage = useMutation(api.images.deleteImage);
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const bulkUpload = useMutation(api.images.bulkUpload);
  const saveInventoryMutation = useMutation(api.inventory.save);
  const verifyPassword = useMutation(api.settings.verifyPassword);

  const [editBasePrice, setEditBasePrice] = useState<number>(0);
  const [editDescription, setEditDescription] = useState<string>('');
  const [editStains, setEditStains] = useState<any[]>([]);
  const [showEditPanel, setShowEditPanel] = useState(false);

  useEffect(() => {
    if (selectedCrib && selectedWood) {
      const config = inventory?.find(i => i.cribName === selectedCrib && i.wood === selectedWood);
      if (config) {
        setEditBasePrice(config.basePrice);
        setEditDescription(config.description || '');
        setEditStains(config.stains.map((s: any) => ({ ...s })));
        setShowEditPanel(true);
      } else {
        setShowEditPanel(false);
      }
    } else {
      setShowEditPanel(false);
    }
  }, [selectedCrib, selectedWood, inventory]);

  const showNotif = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const counts = images ? imageCountsByPath(images) : {};
  const knownStains = stainTypes?.map(s => s.name) || [];

  const filteredImages = images?.filter(img => {
    if (selectedCrib && img.cribName !== selectedCrib) return false;
    if (selectedWood && img.wood !== selectedWood) return false;
    if (selectedStain === '__unassigned__' && img.stainName) return false;
    if (selectedStain && selectedStain !== '__unassigned__' && img.stainName !== selectedStain) return false;
    return true;
  }) || [];

  const getFolderBreadcrumb = () => {
    const parts: { label: string; onClick: () => void }[] = [
      { label: 'All Images', onClick: () => { setSelectedCrib(null); setSelectedWood(null); setSelectedStain(null); } }
    ];
    if (selectedCrib) {
      parts.push({ label: selectedCrib, onClick: () => { setSelectedWood(null); setSelectedStain(null); } });
    }
    if (selectedWood) {
      parts.push({ label: selectedWood, onClick: () => { setSelectedStain(null); } });
    }
    if (selectedStain === '__unassigned__') {
      parts.push({ label: 'Unassigned', onClick: () => {} });
    } else if (selectedStain) {
      parts.push({ label: selectedStain, onClick: () => { /* noop */ } });
    }
    return parts;
  };

  const cribsFromInventory = inventory ? [...new Set(inventory.map(i => i.cribName))].sort() : [];
  const cribsFromImages = images ? [...new Set(images.map(i => i.cribName))].sort() : [];
  const allCribs = [...new Set([...cribsFromImages, ...cribsFromInventory])].sort();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ok = await verifyPassword({ password: passwordInput });
      if (ok) {
        login(passwordInput);
      } else {
        alert('Incorrect password');
        setPasswordInput('');
      }
    } catch {
      alert('Error verifying password');
    }
  };

  const handleUploadFiles = async (files: File[]) => {
    if (!selectedCrib) {
      showNotif('Please select a crib folder first');
      return;
    }
    if (!selectedWood) {
      showNotif('Please select a wood type first');
      return;
    }
    setUploading(true);
    setUploadProgress(`Uploading ${files.length} file(s)...`);

    const uploads = [];
    for (const file of files) {
      try {
        setUploadProgress(`Uploading ${file.name}...`);
        const postUrl = await generateUploadUrl({ password: adminPassword });
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        const { storageId } = await result.json();
        if (storageId) {
          uploads.push({
            cribName: selectedCrib,
            wood: selectedWood,
            storageId,
            originalName: file.name,
            mimeType: file.type || "image/jpeg",
            size: file.size,
          });
        }
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err);
        showNotif(`Failed to upload ${file.name}`);
      }
    }

    if (uploads.length > 0) {
      await bulkUpload({
        password: adminPassword,
        uploads,
        autoLink,
      });
      showNotif(`Uploaded ${uploads.length} image(s) successfully`);
    }

    setUploading(false);
    setUploadProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFilePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleLinkStain = async (imageId: string, stainName: string) => {
    await linkImage({ password: adminPassword, imageId: imageId as any, stainName });
    showNotif(`Linked to stain: ${stainName}`);
  };

  const handleUnlinkStain = async (imageId: string) => {
    await unlinkImage({ password: adminPassword, imageId: imageId as any });
    showNotif('Unlinked stain');
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Delete this image permanently?')) return;
    await deleteImage({ password: adminPassword, imageId: imageId as any });
    showNotif('Image deleted');
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} image(s) permanently?`)) return;
    for (const id of selectedIds) {
      await deleteImage({ password: adminPassword, imageId: id as any });
    }
    setSelectedIds(new Set());
    showNotif(`Deleted ${selectedIds.size} image(s)`);
  };

  const handleBulkLink = async (stainName: string) => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await linkImage({ password: adminPassword, imageId: id as any, stainName });
    }
    setSelectedIds(new Set());
    showNotif(`Linked ${selectedIds.size} image(s) to ${stainName}`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (msalInitRef.current) return;
    const clientId = import.meta.env.VITE_ONEDRIVE_CLIENT_ID;
    if (!clientId) return;
    msalInitRef.current = true;

    const msal = new PublicClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_ONEDRIVE_TENANT_ID || 'consumers'}`,
        redirectUri: window.location.origin,
      },
      cache: { cacheLocation: 'localStorage' },
    });

    msal.initialize().then(async () => {
      try {
        const response = await msal.handleRedirectPromise();
        if (response) {
          setMsalInstance(msal);
          setOneDriveLoggedIn(true);
          const resumePath = localStorage.getItem('onedrive_browse_path') || '/';
          setShowOneDrive(true);
          await browseOneDrive(msal, resumePath);
        } else if (msal.getAllAccounts().length > 0) {
          setMsalInstance(msal);
          setOneDriveLoggedIn(true);
        } else {
          setMsalInstance(msal);
        }
      } catch {
        setMsalInstance(msal);
      }
    });
  }, []);

  const initOneDrive = async () => {
    if (!msalInstance) {
      showNotif('OneDrive not configured. Set VITE_ONEDRIVE_CLIENT_ID in .env');
      return;
    }
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      localStorage.setItem('onedrive_browse_path', '/');
      await msalInstance.loginRedirect({
        scopes: ['Files.Read', 'Files.Read.All', 'offline_access'],
      });
      return;
    }
    setOneDriveLoggedIn(true);
    setShowOneDrive(true);
    await browseOneDrive(msalInstance, '/');
  };

  const browseOneDrive = async (msal: PublicClientApplication, path: string) => {
    setOneDriveLoading(true);
    try {
      const accounts = msal.getAllAccounts();
      if (accounts.length === 0) {
        showNotif('Not logged into OneDrive.');
        setOneDriveLoading(false);
        return;
      }
      const tokenResult = await msal.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.Read.All'],
        account: accounts[0],
      });

      const graphPath = path === '/' ? 'root/children' : `root:/${encodeURIComponent(path.slice(1))}:/children`;
      const graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/${graphPath}`, {
        headers: { Authorization: `Bearer ${tokenResult.accessToken}` },
      });

      if (!graphRes.ok) throw new Error(`Graph API error: ${graphRes.status}`);

      const data = await graphRes.json();
      const files: OneDriveFile[] = (data.value || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        size: item.size || 0,
        folder: !!item.folder,
        downloadUrl: item['@microsoft.graph.downloadUrl'],
        mimeType: item.file?.mimeType,
      }));

      setOneDriveFiles(files);
      setOneDrivePath(path);
    } catch (err: any) {
      if (err instanceof InteractionRequiredAuthError || err.errorMessage?.includes('interaction_required')) {
        localStorage.setItem('onedrive_browse_path', path);
        await msal.acquireTokenRedirect({
          scopes: ['Files.Read', 'Files.Read.All'],
          account: msal.getAllAccounts()[0],
        });
        return;
      }
      console.error('OneDrive browse failed:', err);
      showNotif('Failed to browse OneDrive.');
    }
    setOneDriveLoading(false);
  };

  const navigateOneDrive = async (item: OneDriveFile) => {
    if (!msalInstance) return;
    const newPath = oneDrivePath === '/' ? `/${item.name}` : `${oneDrivePath}/${item.name}`;
    await browseOneDrive(msalInstance, newPath);
  };

  const goBackOneDrive = async () => {
    if (!msalInstance || oneDrivePath === '/') return;
    const parent = oneDrivePath.substring(0, oneDrivePath.lastIndexOf('/')) || '/';
    await browseOneDrive(msalInstance, parent);
  };

  const importFromOneDrive = async () => {
    if (!msalInstance || oneDriveSelected.size === 0 || !selectedCrib || !selectedWood) return;

    setOneDriveImporting(true);
    setUploadProgress(`Importing ${oneDriveSelected.size} file(s) from OneDrive...`);

    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      showNotif('OneDrive session expired.');
      setOneDriveImporting(false);
      return;
    }

    try {
      const uploads = [];
      for (const fileId of oneDriveSelected) {
        const file = oneDriveFiles.find(f => f.id === fileId);
        if (!file || file.folder || !file.downloadUrl) continue;

        setUploadProgress(`Downloading ${file.name} from OneDrive...`);
        const dlRes = await fetch(file.downloadUrl);
        const blob = await dlRes.blob();

        setUploadProgress(`Uploading ${file.name} to storage...`);
        const postUrl = await generateUploadUrl({ password: adminPassword });
        const uploadRes = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type || "image/jpeg" },
          body: blob,
        });
        const { storageId } = await uploadRes.json();
        if (storageId) {
          uploads.push({
            cribName: selectedCrib,
            wood: selectedWood,
            storageId,
            originalName: file.name,
            mimeType: blob.type || "image/jpeg",
            size: blob.size,
          });
        }
      }

      if (uploads.length > 0) {
        await bulkUpload({ password: adminPassword, uploads, autoLink });
        showNotif(`Imported ${uploads.length} image(s) from OneDrive`);
        setOneDriveSelected(new Set());
        setShowOneDrive(false);
      }
    } catch (err) {
      console.error('OneDrive import failed:', err);
      showNotif('OneDrive import failed.');
    }

    setOneDriveImporting(false);
    setUploadProgress('');
  };

  if (!isAuthenticated) return (
    <div className="container" style={{ padding: '120px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ backgroundColor: 'var(--surface-container-lowest)', padding: '48px', borderRadius: '16px', boxShadow: 'var(--shadow-ambient)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '48px', marginBottom: '16px' }}>lock</span>
        <h1 className="headline-md text-primary" style={{ marginBottom: '8px' }}>Image Manager Access</h1>
        <p className="body-md text-on-surface-variant" style={{ marginBottom: '32px' }}>Enter admin password.</p>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder="Enter Password" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', textAlign: 'center', letterSpacing: '0.2em' }} required />
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px', padding: '24px', backgroundColor: 'var(--surface-container-low)', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="headline-lg text-primary">Image Manager</h1>
            <p className="body-md text-on-surface-variant">Browse, upload, and organize product images by crib, wood, and stain.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <a href="/admin" style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--outline-variant)', textDecoration: 'none', color: 'var(--on-surface)', fontSize: '13px', fontWeight: 600 }}>Back to Admin</a>
            <button onClick={() => logout()} className="icon-btn" title="Logout" aria-label="Logout">
              <span className="material-symbols-outlined" aria-hidden="true">logout</span>
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', minHeight: '70vh' }}>
        {/* Sidebar */}
        <div style={{ width: '260px', flexShrink: 0, backgroundColor: 'var(--surface-container-lowest)', borderRadius: '12px', padding: '16px', overflowY: 'auto', maxHeight: 'calc(100vh - 240px)', boxShadow: 'var(--shadow-ambient)' }}>
          <div style={{ marginBottom: '8px', padding: '0 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label-caps" style={{ fontSize: '11px' }}>FOLDERS</span>
            <span style={{ fontSize: '11px', opacity: 0.5 }}>{counts['all'] || 0} images</span>
          </div>

          <FolderTreeItem
            label="All Images"
            count={counts['all']}
            selected={!selectedCrib && !selectedWood && !selectedStain}
            onSelect={() => { setSelectedCrib(null); setSelectedWood(null); setSelectedStain(null); }}
          />

          <div style={{ height: '1px', backgroundColor: 'var(--outline-variant)', margin: '8px 0', opacity: 0.3 }} />

          {allCribs.map(crib => {
            const woodsFromInventory = inventory ? [...new Set(inventory.filter(i => i.cribName === crib).map(i => i.wood))].sort() : [];
            const woodsFromImages = images ? [...new Set(images.filter(i => i.cribName === crib).map(i => i.wood))].sort() : [];
            const allWoods = [...new Set([...woodsFromImages, ...woodsFromInventory])].sort();

            return (
              <FolderTreeItem
                key={crib}
                label={crib}
                count={counts[`crib:${crib}`]}
                selected={selectedCrib === crib && !selectedWood}
                hasChildren
                defaultOpen={selectedCrib === crib}
                onSelect={() => { setSelectedCrib(crib); setSelectedWood(null); setSelectedStain(null); }}
              >
                {allWoods.map(wood => {
                  const stainsFromImages = images
                    ? [...new Set(images.filter(i => i.cribName === crib && i.wood === wood && i.stainName).map(i => i.stainName!))].sort()
                    : [];
                  const stainsFromInventory = inventory
                    ? [...new Set(inventory.filter(i => i.cribName === crib && i.wood === wood).flatMap((i: any) => i.stains.map((s: any) => s.name)))].sort()
                    : [];
                  const allStains = [...new Set([...stainsFromImages, ...stainsFromInventory])].sort();
                  const hasUnassigned = images?.some(i => i.cribName === crib && i.wood === wood && !i.stainName);

                  return (
                    <FolderTreeItem
                      key={wood}
                      label={wood}
                      count={counts[`wood:${crib}:${wood}`]}
                      selected={selectedCrib === crib && selectedWood === wood && !selectedStain}
                      hasChildren
                      defaultOpen={selectedWood === wood}
                      onSelect={() => { setSelectedCrib(crib); setSelectedWood(wood); setSelectedStain(null); }}
                    >
                      {hasUnassigned ? (
                        <FolderTreeItem
                          label="Unassigned"
                          count={counts[`unassigned:${crib}:${wood}`]}
                          selected={selectedCrib === crib && selectedWood === wood && selectedStain === '__unassigned__'}
                          onSelect={() => { setSelectedCrib(crib); setSelectedWood(wood); setSelectedStain('__unassigned__'); }}
                        />
                      ) : null}
                      {allStains.map(stain => (
                        <FolderTreeItem
                          key={stain}
                          label={stain}
                          count={counts[`stain:${crib}:${wood}:${stain}`]}
                          selected={selectedCrib === crib && selectedWood === wood && selectedStain === stain}
                          onSelect={() => { setSelectedCrib(crib); setSelectedWood(wood); setSelectedStain(stain); }}
                        />
                      ))}
                    </FolderTreeItem>
                  );
                })}
              </FolderTreeItem>
            );
          })}
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, minWidth: 0, backgroundColor: 'var(--surface-container-lowest)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-ambient)' }}>
          {/* Breadcrumb + Toolbar */}
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
              {getFolderBreadcrumb().map((part, i, arr) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {i > 0 && <span className="material-symbols-outlined" style={{ fontSize: '14px', opacity: 0.4 }}>chevron_right</span>}
                  <span
                    onClick={part.onClick}
                    style={{ cursor: i < arr.length - 1 ? 'pointer' : 'default', color: i < arr.length - 1 ? 'var(--primary)' : 'var(--on-surface)', fontWeight: i === arr.length - 1 ? 600 : 400 }}
                  >
                    {part.label}
                  </span>
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={autoLink} onChange={e => setAutoLink(e.target.checked)} />
                Auto-link stains
              </label>
              <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')} className="icon-btn" title="Toggle view" aria-label="Toggle view mode">
                <span className="material-symbols-outlined" aria-hidden="true">{viewMode === 'grid' ? 'view_list' : 'grid_view'}</span>
              </button>
            </div>
          </div>

          {/* Upload Zone */}
          {selectedCrib && selectedWood && (
            <div
              ref={dropRef}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--outline-variant)'}`,
                borderRadius: '12px',
                padding: '32px',
                textAlign: 'center',
                marginBottom: '24px',
                backgroundColor: dragOver ? 'var(--primary-container, #f0e8e0)' : 'var(--surface-container-low)',
                transition: 'all 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--on-surface-variant)', marginBottom: '8px', display: 'block' }}>cloud_upload</span>
              <p className="body-md" style={{ marginBottom: '12px' }}>
                {uploading ? uploadProgress : `Drop images here or click to browse${selectedStain ? ` (for ${selectedCrib} > ${selectedWood} > ${selectedStain || 'Unassigned'})` : ''}`}
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFilePicker}
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                />
                <button onClick={() => fileInputRef.current?.click()} className="filter-btn active" style={{ width: 'auto', padding: '10px 24px' }} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Select Files'}
                </button>
                {import.meta.env.VITE_ONEDRIVE_CLIENT_ID && (
                  <button onClick={initOneDrive} className="filter-btn" style={{ width: 'auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '6px' }} disabled={uploading}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cloud</span>
                    {oneDriveLoggedIn ? 'Open OneDrive' : 'Login with Microsoft'}
                  </button>
                )}
              </div>
            </div>
          )}

          {showEditPanel && selectedCrib && selectedWood && (
            <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: 'var(--surface-container-low)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className="headline-sm text-primary" style={{ fontSize: '18px' }}>Inventory Settings</h3>
                <button
                  onClick={async () => {
                    if (!inventory) return;
                    const updated = inventory.map(item => {
                      if (item.cribName === selectedCrib && item.wood === selectedWood) {
                        return {
                          ...item,
                          basePrice: editBasePrice,
                          description: editDescription,
                          stains: editStains,
                        };
                      }
                      return item;
                    });
                    await saveInventoryMutation({ password: adminPassword, inventory: updated });
                    showNotif('Inventory settings saved!');
                  }}
                  className="filter-btn active"
                  style={{ width: 'auto', padding: '8px 20px' }}
                >
                  Save Changes
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="label-caps" style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>BASE PRICE ($)</label>
                  <input type="number" value={editBasePrice} onChange={e => setEditBasePrice(Number(e.target.value))} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--outline-variant)', fontSize: '14px' }} />
                </div>
                <div>
                  <label className="label-caps" style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>DESCRIPTION</label>
                  <input type="text" value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Product description" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--outline-variant)', fontSize: '14px' }} />
                </div>
              </div>

              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '8px', fontSize: '11px' }}>STAINS</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {editStains.map((stain, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: 'var(--surface)', borderRadius: '8px' }}>
                      <input
                        type="text"
                        value={stain.name}
                        onChange={e => {
                          const next = [...editStains];
                          next[i] = { ...next[i], name: e.target.value };
                          setEditStains(next);
                        }}
                        style={{ width: '120px', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--outline-variant)', fontSize: '13px', fontWeight: 600 }}
                      />
                      <span className="label-caps" style={{ fontSize: '10px' }}>+$</span>
                      <input
                        type="number"
                        value={stain.priceAddition}
                        onChange={e => {
                          const next = [...editStains];
                          next[i] = { ...next[i], priceAddition: Number(e.target.value) };
                          setEditStains(next);
                        }}
                        style={{ width: '70px', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--outline-variant)', fontSize: '13px' }}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={stain.inStock}
                          onChange={e => {
                            const next = [...editStains];
                            next[i] = { ...next[i], inStock: e.target.checked };
                            setEditStains(next);
                          }}
                        />
                        In Stock
                      </label>
                      <div style={{ flex: 1 }} />
                      {selectedStain !== stain.name && (
                        <button
                          onClick={() => { setSelectedCrib(selectedCrib); setSelectedWood(selectedWood); setSelectedStain(stain.name); }}
                          className="icon-btn" title="View images for this stain"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!selectedCrib && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', display: 'block', opacity: 0.3 }}>folder_open</span>
              <p className="body-lg">Select a folder from the sidebar to view and upload images.</p>
            </div>
          )}

          {/* Selection Toolbar */}
          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', padding: '12px', backgroundColor: 'var(--surface-container-low)', borderRadius: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{selectedIds.size} selected</span>
              <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--outline-variant)' }} />
              <select
                onChange={e => { if (e.target.value) handleBulkLink(e.target.value); e.target.value = ''; }}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--outline-variant)', fontSize: '12px' }}
              >
                <option value="">Link to stain...</option>
                {knownStains.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={handleBulkDelete} style={{ padding: '6px 16px', backgroundColor: 'var(--error, #b3261e)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                Delete Selected
              </button>
            </div>
          )}

          {/* Image Grid */}
          {selectedCrib && filteredImages.length === 0 && !uploading && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', marginBottom: '12px', display: 'block', opacity: 0.3 }}>photo_library</span>
              <p className="body-md">No images in this folder. Upload some above!</p>
            </div>
          )}

          {viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {filteredImages.map(img => (
                <div key={img._id} style={{
                  position: 'relative',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  backgroundColor: 'var(--surface)',
                  border: selectedIds.has(img._id) ? '2px solid var(--primary)' : '1px solid var(--outline-variant)',
                  boxShadow: selectedIds.has(img._id) ? 'var(--shadow-hard)' : 'var(--shadow-ambient)',
                  transition: 'all 0.2s',
                }}>
                  <div
                    onClick={() => toggleSelect(img._id)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      zIndex: 2,
                      width: '22px',
                      height: '22px',
                      borderRadius: '4px',
                      border: '2px solid white',
                      backgroundColor: selectedIds.has(img._id) ? 'var(--primary)' : 'rgba(0,0,0,0.3)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selectedIds.has(img._id) && (
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'white' }}>check</span>
                    )}
                  </div>

                  {img.resolvedUrl ? (
                    <img src={img.resolvedUrl} alt={img.originalName} style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-highest)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>broken_image</span>
                    </div>
                  )}

                  <div style={{ padding: '10px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>{img.originalName}</p>
                    {img.stainName ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getStainColor(img.stainName), display: 'inline-block' }} />
                        <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{img.stainName}</span>
                      </div>
                    ) : (
                      <div style={{ marginBottom: '4px' }}>
                        <select
                          onChange={e => { const val = e.target.value; if (val) handleLinkStain(img._id, val); e.target.value = ''; }}
                          onClick={e => e.stopPropagation()}
                          style={{ width: '100%', padding: '4px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--outline-variant)', color: 'var(--on-surface-variant)' }}
                          defaultValue=""
                        >
                          <option value="" disabled>Link stain...</option>
                          {knownStains.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      {img.stainName && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUnlinkStain(img._id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--on-surface-variant)', fontSize: '14px' }}
                          title="Unlink stain"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>link_off</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteImage(img._id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--error, #b3261e)', fontSize: '14px' }}
                        title="Delete image"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredImages.map(img => (
                <div key={img._id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--surface-container-low)',
                  border: selectedIds.has(img._id) ? '2px solid var(--primary)' : '1px solid transparent',
                  cursor: 'pointer',
                }}
                  onClick={() => toggleSelect(img._id)}
                >
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '4px', border: '2px solid var(--outline-variant)',
                    backgroundColor: selectedIds.has(img._id) ? 'var(--primary)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {selectedIds.has(img._id) && <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'white' }}>check</span>}
                  </div>
                  {img.resolvedUrl ? (
                    <img src={img.resolvedUrl} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '4px', backgroundColor: 'var(--surface-container-highest)', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.originalName}</p>
                    <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{img.cribName} &gt; {img.wood}{img.stainName ? ` > ${img.stainName}` : ' > Unassigned'}</p>
                  </div>
                  {img.stainName ? (
                    <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: getStainColor(img.stainName), color: 'white', borderRadius: '4px', fontWeight: 600 }}>{img.stainName}</span>
                  ) : (
                    <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: 'var(--surface-container-highest)', color: 'var(--on-surface-variant)', borderRadius: '4px' }}>Unlinked</span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteImage(img._id); }} className="icon-btn" title="Delete" aria-label="Delete image">
                    <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '18px', color: 'var(--error, #b3261e)' }}>delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* OneDrive Modal */}
      {showOneDrive && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowOneDrive(false)}>
          <div style={{ backgroundColor: 'var(--surface)', borderRadius: '16px', width: '90%', maxWidth: '700px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="headline-md" style={{ marginBottom: '4px' }}>Import from OneDrive</h2>
                <p className="body-sm text-on-surface-variant">Select images to import. Files will be downloaded and uploaded to your selected folder.</p>
              </div>
              <button onClick={() => setShowOneDrive(false)} className="icon-btn" aria-label="Close">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>

            {!selectedCrib && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--error)' }}>
                <p className="body-md">{'Please select a destination folder (crib > wood) in the sidebar first.'}</p>
              </div>
            )}

            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--outline-variant)', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
              <button onClick={goBackOneDrive} disabled={oneDrivePath === '/'} className="icon-btn" title="Go back" aria-label="Go back">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
              </button>
              <span style={{ fontWeight: 600 }}>OneDrive{oneDrivePath !== '/' ? oneDrivePath : ' /'}</span>
              <span style={{ flex: 1 }} />
              <button
                onClick={importFromOneDrive}
                disabled={oneDriveSelected.size === 0 || oneDriveImporting || !selectedCrib}
                className="filter-btn active"
                style={{ width: 'auto', padding: '8px 20px' }}
              >
                {oneDriveImporting ? 'Importing...' : `Import ${oneDriveSelected.size} file(s)`}
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', minHeight: '300px', padding: '8px' }}>
              {oneDriveLoading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>Loading...</div>
              ) : oneDriveFiles.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', marginBottom: '12px', display: 'block', opacity: 0.3 }}>cloud_off</span>
                  <p className="body-md">This folder is empty.</p>
                </div>
              ) : (
                oneDriveFiles.map(file => {
                  const isImage = file.mimeType?.startsWith('image/');
                  const selected = oneDriveSelected.has(file.id);
                  return (
                    <div
                      key={file.id}
                      onClick={() => {
                        if (file.folder) navigateOneDrive(file);
                        else if (isImage) {
                          setOneDriveSelected(prev => {
                            const next = new Set(prev);
                            if (next.has(file.id)) next.delete(file.id); else next.add(file.id);
                            return next;
                          });
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        cursor: file.folder ? 'pointer' : isImage ? 'pointer' : 'default',
                        backgroundColor: selected ? 'var(--primary-container, #E8D5C4)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: file.folder ? 'var(--primary)' : 'var(--on-surface-variant)' }}>
                        {file.folder ? 'folder' : isImage ? 'image' : 'description'}
                      </span>
                      <span style={{ flex: 1, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', flexShrink: 0 }}>
                        {file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : ''}
                      </span>
                      {isImage && !file.folder && (
                        <div style={{
                          width: '18px', height: '18px', borderRadius: '3px', border: `2px solid ${selected ? 'var(--primary)' : 'var(--outline-variant)'}`,
                          backgroundColor: selected ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {selected && <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'white' }}>check</span>}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
