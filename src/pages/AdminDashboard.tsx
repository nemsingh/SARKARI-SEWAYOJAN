import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  getCategories,
  getCategoryLinks,
  getTabletItems,
  getPosts,
  getSiteSettings,
  updateSiteSetting,
  addCategoryLink,
  deleteCategoryLink,
  updateCategoryLink,
  deleteCategoryLinksByCategoryId,
  addCategory,
  updateCategory as updateCategoryFn,
  deleteCategory as deleteCategoryFn,
  addTabletItem as addTabletItemFn,
  updateTabletItem as updateTabletItemFn,
  deleteTabletItem as deleteTabletItemFn,
  deletePost as deletePostFn,
  getPostBySlug,
  updatePost,
  updateSiteLastUpdated,
} from '@/lib/firebaseService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sun, Moon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ============ CONFIRM DIALOG STATE ============
interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
}

const AdminDashboard = () => {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryLinks, setCategoryLinks] = useState<any[]>([]);
  const [tabletItems, setTabletItems] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, title: '', description: '', onConfirm: () => {} });
  const navigate = useNavigate();
  const { toast } = useToast();

  const ThemeToggle = () => {
    const [isThemeBhagwa, setIsThemeBhagwa] = useState(false);
    useEffect(() => {
      if (document.documentElement.classList.contains('theme-bhagwa') || localStorage.getItem('theme-mode') === 'bhagwa') {
        document.documentElement.classList.add('theme-bhagwa');
        setIsThemeBhagwa(true);
      }
    }, []);
    const toggle = () => {
      if (isThemeBhagwa) {
        document.documentElement.classList.remove('theme-bhagwa');
        localStorage.setItem('theme-mode', 'default');
        setIsThemeBhagwa(false);
      } else {
        document.documentElement.classList.add('theme-bhagwa');
        localStorage.setItem('theme-mode', 'bhagwa');
        setIsThemeBhagwa(true);
      }
    };
    return (
      <button onClick={toggle} className="p-2 rounded-full hover:bg-black/10 transition-colors mr-2" title="Switch Theme">
        {isThemeBhagwa ? <Sun className="w-6 h-6 text-black" /> : <Moon className="w-6 h-6 text-primary" />}
      </button>
    );
  };

  const askConfirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirm({ open: true, title, description, onConfirm });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user || !user.emailVerified) {
        navigate('/admin-vikaskumar', { replace: true });
        return;
      }
      setFirebaseUser(user);
      fetchAll().then(() => setLoading(false));
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchAll = async () => {
    const [c, cl, t, p, s] = await Promise.all([
      getCategories(),
      getCategoryLinks(),
      getTabletItems(),
      getPosts(),
      getSiteSettings(),
    ]);
    
    // Cleanup broken category links
    const postSlugs = p.map(post => post.slug);
    const postIds = p.map(post => post.id);
    const brokenLinks = cl.filter(link => {
      if (link.url && link.url.startsWith('/post/')) {
        const slug = link.url.replace('/post/', '');
        return !postSlugs.includes(slug) && !postIds.includes(slug);
      }
      return false;
    });

    if (brokenLinks.length > 0) {
      await Promise.all(brokenLinks.map(link => deleteCategoryLink(link.id)));
      // Refetch links after cleanup
      const updatedLinks = await getCategoryLinks();
      setCategoryLinks(updatedLinks);
    } else {
      setCategoryLinks(cl);
    }

    setCategories(c);
    setTabletItems(t);
    setPosts(p);
    setSettings(s);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/admin-vikaskumar', { replace: true });
  };

  const handlePublish = async () => {
    const webhookUrl = settings['build_webhook_url']?.value;
    if (!webhookUrl) {
      toast({ title: 'Error', description: 'Please configure BUILD WEBHOOK URL in Site Settings first.', variant: 'destructive' });
      return;
    }
    try {
      await updateSiteLastUpdated();
      
      const res = await fetch(webhookUrl, { method: 'POST' });
      if (res.ok) {
        toast({ title: 'Success', description: 'Publish triggered successfully! Users will see updates immediately.' });
      } else {
        toast({ title: 'Error', description: 'Failed to trigger publish.', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to trigger publish.', variant: 'destructive' });
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    await updateSiteSetting(key, value, settings[key]?.id);
    await fetchAll();
    toast({ title: 'Setting updated!' });
  };

  const handleAddLink = async (categoryId: string, title: string, url: string, isNew: boolean, lastDateText: string) => {
    await addCategoryLink({
      category_id: categoryId,
      title,
      url,
      link_timestamp: Date.now(),
      is_new: isNew,
      last_date_text: lastDateText || null,
    });
    await fetchAll();
    toast({ title: 'Link added!' });
  };

  const handleDeleteLink = (id: string) => {
    askConfirm('Delete Link', 'Kya aap sure hain ki is link ko delete karna chahte hain?', async () => {
      await deleteCategoryLink(id);
      await fetchAll();
      toast({ title: 'Link deleted!' });
    });
  };

  const handleToggleLinkNew = async (id: string, currentVal: boolean) => {
    await updateCategoryLink(id, { is_new: !currentVal });
    await fetchAll();
    toast({ title: currentVal ? 'New badge removed' : 'New badge added' });
  };

  const handleUpdateLinkLastDate = async (id: string, text: string) => {
    await updateCategoryLink(id, { last_date_text: text || null });
    await fetchAll();
    toast({ title: 'Last date updated!' });
  };

  const handleAddTabletItem = async (title: string, subtitle: string, url: string) => {
    // Top ordering: shift all down
    const items = [...tabletItems].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    for (let i = 0; i < items.length; i++) {
      await updateTabletItemFn(items[i].id, { display_order: i + 1 });
    }
    await addTabletItemFn(title, subtitle, url, 0);
    await fetchAll();
    toast({ title: 'Table item added!' });
  };

  const handleDeleteTabletItem = (id: string) => {
    askConfirm('Delete Table Item', 'Kya aap sure hain ki is item ko delete karna chahte hain?', async () => {
      await deleteTabletItemFn(id);
      await fetchAll();
      toast({ title: 'Table item deleted!' });
    });
  };

  const handleDeletePost = (id: string) => {
    const post = posts.find(p => p.id === id);
    askConfirm('Delete Post', `Kya aap "${post?.name_of_post || 'this post'}" ko delete karna chahte hain? Isse linked category links bhi delete ho jayenge.`, async () => {
      // Also delete linked category links
      if (post) {
        const slug = post.slug || post.id;
        const linkedLinks = categoryLinks.filter(l => {
          if (!l.url) return false;
          const match = l.url.match(/\/post\/(.+)/);
          const linkSlug = match ? match[1] : (!l.url.startsWith('http') && !l.url.startsWith('/') ? l.url : null);
          return linkSlug === slug || linkSlug === post.id;
        });
        await Promise.all(linkedLinks.map(l => deleteCategoryLink(l.id)));

        const linkedTabletItems = tabletItems.filter(t => {
          if (!t.url) return false;
          const match = t.url.match(/\/post\/(.+)/);
          const linkSlug = match ? match[1] : (!t.url.startsWith('http') && !t.url.startsWith('/') ? t.url : null);
          return linkSlug === slug || linkSlug === post.id;
        });
        await Promise.all(linkedTabletItems.map(t => deleteTabletItemFn(t.id)));
      }
      await deletePostFn(id);
      await fetchAll();
      toast({ title: 'Post & linked items deleted!' });
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear().toString().slice(-2)}`;
    } catch { return ''; }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-primary font-bold">Loading...</div>;

  return (
    <div className="admin-panel min-h-screen bg-secondary">
      {/* Confirm Dialog */}
      <AlertDialog open={confirm.open} onOpenChange={(open) => !open && setConfirm(prev => ({ ...prev, open: false }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirm.onConfirm(); setConfirm(prev => ({ ...prev, open: false })); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="bg-background py-4 px-6 flex justify-between items-center" style={{ boxShadow: 'var(--box-shadow-light)' }}>
        <h1 className="text-2xl font-black text-primary">ADMIN PANEL - Sarkari Sewayojan</h1>
        <div className="flex gap-3 items-center">
          <ThemeToggle />
          <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={handlePublish}>🚀 Publish Website</Button>
          <Button variant="outline" onClick={() => window.open('/', '_blank')}>⬅ Back to Website</Button>
          <Button variant="destructive" onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto p-6">
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="w-full flex flex-wrap mb-6">
            <TabsTrigger value="settings">Site Settings</TabsTrigger>
            <TabsTrigger value="tablets">Table Items</TabsTrigger>
            <TabsTrigger value="categories">Category Links</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
          </TabsList>

          {/* SITE SETTINGS */}
          <TabsContent value="settings">
            <div className="bg-background rounded-2xl p-6" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
              <h2 className="text-2xl font-bold text-primary mb-6 border-b-4 border-dashed border-slate-500 pb-4">Site Settings</h2>
              
              <div className="pb-8 mb-8 border-b-4 border-dashed border-slate-500">
                <UpdateBarManager settings={settings} onSave={handleUpdateSetting} />
              </div>

              <div className="pb-8 mb-8 border-b-4 border-dashed border-slate-500 space-y-6">
                {['logo_url', 'tagline', 'contact_text', 'build_webhook_url'].map(key => (
                  <div key={key} className="border-b-2 border-dashed border-slate-300 pb-6 last:border-b-0 last:pb-0">
                    <SettingEditor label={key.replace(/_/g, ' ').toUpperCase()} value={settings[key]?.value || ''} onSave={(val) => handleUpdateSetting(key, val)} />
                  </div>
                ))}
              </div>

              <div className="pb-8 mb-8 border-b-4 border-dashed border-slate-500">
                <h3 className="text-xl font-bold text-primary mb-2">Floating Social Buttons</h3>
                <p className="text-sm text-muted-foreground mb-4">Toggle 'Show' to enable the button. You must provide a valid URL for the button fully work. These buttons will appear on the bottom-right completely styled in original brand colors.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['whatsapp', 'instagram', 'youtube', 'telegram', 'facebook', 'linkedin'].map(network => {
                    const urlKey = `social_${network}_url`;
                    const enabledKey = `social_${network}_enabled`;
                    const urlValue = settings[urlKey]?.value || '';
                    const isEnabled = settings[enabledKey]?.value === 'true';

                    return (
                      <div key={network} className="border-2 border-dashed border-slate-300 p-4 rounded-lg bg-secondary flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-primary capitalize">{network}</span>
                          <Button 
                            variant={isEnabled ? 'default' : 'outline'} 
                            size="sm" 
                            onClick={() => handleUpdateSetting(enabledKey, isEnabled ? 'false' : 'true')}
                            className={isEnabled ? (network === 'whatsapp' ? 'bg-green-600' : network === 'youtube' ? 'bg-red-600' : 'bg-primary') : ''}
                          >
                            {isEnabled ? 'Shown' : 'Hidden'}
                          </Button>
                        </div>
                        <Input 
                          placeholder={`${network} URL`} 
                          value={urlValue} 
                          onChange={(e) => handleUpdateSetting(urlKey, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-primary mb-4 border-b-2 border-dashed border-slate-300 pb-2">Footer Sections</h3>
                <div className="space-y-6 mt-4">
                  {['footer_quick_links', 'footer_apps', 'footer_more'].map(key => (
                    <div key={key} className="border-b-2 border-dashed border-slate-300 pb-6 last:border-b-0 last:pb-0">
                      <label className="text-base font-bold text-primary block mb-1">{key.replace('footer_', '').replace(/_/g, ' ').toUpperCase()}</label>
                      <p className="text-sm text-muted-foreground mb-2">Har line me: <code className="bg-muted px-1 rounded">Text||URL</code> (URL optional)</p>
                      <UpdateBarEditor value={settings[key]?.value || ''} onSave={(val) => handleUpdateSetting(key, val)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TABLE ITEMS */}
          <TabsContent value="tablets">
            <div className="bg-background rounded-2xl p-6" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
              <h2 className="text-2xl font-bold text-primary mb-4 border-b-4 border-dashed border-slate-500 pb-4">Table Items (Top Cards)</h2>
              <AddTabletForm onAdd={handleAddTabletItem} />
              <div className="space-y-4 mt-6 border-t-4 border-dashed border-slate-500 pt-6">
                {tabletItems.map(item => (
                  <div key={item.id} className="border-b-2 border-dashed border-slate-300 pb-4 last:border-b-0 last:pb-0">
                    <TabletItemRow item={item} onDelete={handleDeleteTabletItem} onUpdate={async (id, data) => { await updateTabletItemFn(id, data); await fetchAll(); toast({ title: 'Table item updated!' }); }} formatDate={formatDate} />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* CATEGORY LINKS */}
          <TabsContent value="categories">
            <CategoryLinksTab
              categories={categories}
              categoryLinks={categoryLinks}
              onAddCategory={async (name: string) => {
                const maxOrder = categories.length;
                await addCategory(name, maxOrder + 1);
                await fetchAll();
                toast({ title: 'Category added!' });
              }}
              onDeleteCategory={(catId: string) => {
                askConfirm('Delete Category', 'Kya aap sure hain? Is category ke saare links bhi delete ho jayenge.', async () => {
                  await deleteCategoryLinksByCategoryId(catId);
                  await deleteCategoryFn(catId);
                  await fetchAll();
                  toast({ title: 'Category deleted!' });
                });
              }}
              onUpdateCategory={async (id: string, name: string) => {
                await updateCategoryFn(id, { name });
                await fetchAll();
                toast({ title: 'Category updated!' });
              }}
              onAddLink={handleAddLink}
              onDeleteLink={handleDeleteLink}
              onToggleLinkNew={handleToggleLinkNew}
              onUpdateLinkLastDate={handleUpdateLinkLastDate}
              onUpdateLink={async (id: string, data: Record<string, any>) => {
                await updateCategoryLink(id, data);
                await fetchAll();
                toast({ title: 'Link updated!' });
              }}
              onMoveLink={async (linkId: string, categoryId: string, moveType: 'up' | 'top') => {
                const catLinks = categoryLinks
                  .filter(l => l.category_id === categoryId)
                  .sort((a, b) => b.link_timestamp - a.link_timestamp);
                const idx = catLinks.findIndex(l => l.id === linkId);
                if (idx < 0) return;
                if (moveType === 'up' && idx > 0) {
                  // Swap with previous timestamp to move it up (make it newer than previous)
                  const prevTs = catLinks[idx - 1].link_timestamp;
                  const currentTs = catLinks[idx].link_timestamp;
                  await updateCategoryLink(catLinks[idx].id, { link_timestamp: prevTs + 1 });
                  await updateCategoryLink(catLinks[idx - 1].id, { link_timestamp: currentTs });
                } else if (moveType === 'top' && idx > 0) {
                  // Move to top: make it slightly newer than the current top item
                  const topTs = catLinks[0].link_timestamp;
                  await updateCategoryLink(linkId, { link_timestamp: topTs + 1000 });
                }
                await fetchAll();
              }}
              formatDate={formatDate}
            />
          </TabsContent>

          {/* POSTS */}
          <TabsContent value="posts">
            <PostsTab posts={posts} onDelete={handleDeletePost} navigate={navigate} categories={categories} formatDate={formatDate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ============ SETTING EDITOR ============
const SettingEditor = ({ label, value, onSave }: { label: string; value: string; onSave: (val: string) => void }) => {
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);
  return (
    <div>
      <label className="text-base font-bold text-primary block mb-1">{label}</label>
      <div className="flex gap-2">
        <Textarea value={val} onChange={e => setVal(e.target.value)} className="flex-1" />
        <Button onClick={() => onSave(val)}>Save</Button>
      </div>
    </div>
  );
};

// ============ UPDATE BAR EDITOR ============
const UpdateBarEditor = ({ value, onSave }: { value: string; onSave: (val: string) => void }) => {
  const [items, setItems] = useState<{ text: string; url: string }[]>([]);
  useEffect(() => {
    if (!value) { setItems([{ text: '', url: '' }]); return; }
    const parsed = value.split('\n').filter(l => l.trim()).map(line => {
      const parts = line.split('||');
      return { text: parts[0]?.trim() || '', url: parts[1]?.trim() || '' };
    });
    setItems(parsed.length ? parsed : [{ text: '', url: '' }]);
  }, [value]);

  const updateItem = (index: number, field: 'text' | 'url', val: string) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: val } : item));
  };
  const addItem = () => setItems(prev => [...prev, { text: '', url: '' }]);
  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));
  const handleSave = () => {
    const raw = items.filter(i => i.text.trim()).map(i => i.url ? `${i.text}||${i.url}` : i.text).join('\n');
    onSave(raw);
  };

  return (
    <div className="flex-1 space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input placeholder="Text" value={item.text} onChange={e => updateItem(i, 'text', e.target.value)} className="flex-1" />
          <Input placeholder="URL (optional)" value={item.url} onChange={e => updateItem(i, 'url', e.target.value)} className="flex-1" />
          <Button variant="destructive" size="sm" onClick={() => removeItem(i)}>✕</Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addItem}>+ Add Item</Button>
        <Button size="sm" onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
};

// ============ UPDATE BAR MANAGER (per-line direction) ============
const UpdateBarManager = ({ settings, onSave }: { settings: Record<string, any>; onSave: (key: string, val: string) => void }) => {
  const [barCount, setBarCount] = useState(1);

  useEffect(() => {
    let count = 1;
    for (let i = 2; i <= 10; i++) {
      if (settings[`update_bar_text_${i}`]?.value) count = i;
    }
    setBarCount(Math.max(count, 1));
  }, [settings]);

  const barKeys = ['update_bar_text'];
  for (let i = 2; i <= barCount; i++) {
    barKeys.push(`update_bar_text_${i}`);
  }

  const getDirectionKey = (idx: number) => idx === 0 ? 'update_bar_direction_1' : `update_bar_direction_${idx + 1}`;

  return (
    <div className="space-y-4">
      <label className="text-base font-bold text-primary block">UPDATE BAR LINES</label>
      <p className="text-sm text-muted-foreground">Har line me ek item likhein. URL add karne ke liye format: <code className="bg-muted px-1 rounded">Text||URL</code></p>
      {barKeys.map((key, idx) => {
        const dirKey = getDirectionKey(idx);
        const currentDir = settings[dirKey]?.value || settings['update_bar_direction']?.value || 'left';
        return (
          <div key={key} className="border-2 border-dashed border-slate-300 rounded-lg p-3 mb-4 last:mb-0">
            <div className="flex justify-between items-center mb-2 border-b border-dashed border-slate-200 pb-2">
              <span className="text-sm font-bold text-primary">Scrolling Line {idx + 1}</span>
              <div className="flex items-center gap-2">
                <select
                  value={currentDir}
                  onChange={e => onSave(dirKey, e.target.value)}
                  className="px-2 py-1 text-xs border border-border rounded-lg bg-background text-primary"
                >
                  <option value="left">← Left</option>
                  <option value="right">→ Right</option>
                  <option value="bounce">↔ Bounce</option>
                </select>
                {idx > 0 && (
                  <Button variant="destructive" size="sm" onClick={() => { onSave(key, ''); setBarCount(prev => prev - 1); }}>Remove Line</Button>
                )}
              </div>
            </div>
            <UpdateBarEditor value={settings[key]?.value || ''} onSave={(val) => onSave(key, val)} />
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={() => setBarCount(prev => prev + 1)}>+ Add Scrolling Line</Button>
    </div>
  );
};

// ============ TABLE ITEM ROW (with edit + date) ============
const TabletItemRow = ({ item, onDelete, onUpdate, formatDate }: { item: any; onDelete: (id: string) => void; onUpdate: (id: string, data: Record<string, any>) => void; formatDate: (d: string) => string }) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [subtitle, setSubtitle] = useState(item.subtitle || '');
  const [url, setUrl] = useState(item.url || '');

  if (editing) {
    return (
      <div className="p-3 bg-secondary rounded-lg space-y-2">
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="flex-1 min-w-[150px]" />
          <Input placeholder="Subtitle" value={subtitle} onChange={e => setSubtitle(e.target.value)} className="flex-1 min-w-[150px]" />
          <Input placeholder="URL" value={url} onChange={e => setUrl(e.target.value)} className="flex-1 min-w-[150px]" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { onUpdate(item.id, { title, subtitle, url }); setEditing(false); }}>Save</Button>
          <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  const dateStr = item.created_at?.toDate ? formatDate(item.created_at.toDate().toISOString()) : formatDate(item.created_at || '');

  return (
    <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
      <div className="flex items-center gap-2">
        <span className="font-bold text-primary text-base">{item.title}</span>
        <span className="text-muted-foreground text-sm">{item.subtitle}</span>
        <span className="text-sm text-muted-foreground">({item.url})</span>
        {dateStr && <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{dateStr}</span>}
      </div>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(item.id)}>Delete</Button>
      </div>
    </div>
  );
};

// ============ CATEGORY LINKS TAB (with filter dropdown) ============
const CategoryLinksTab = ({
  categories, categoryLinks, onAddCategory, onDeleteCategory, onUpdateCategory,
  onAddLink, onDeleteLink, onToggleLinkNew, onUpdateLinkLastDate, onUpdateLink, onMoveLink, formatDate,
}: {
  categories: any[]; categoryLinks: any[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateCategory: (id: string, name: string) => void;
  onAddLink: (catId: string, title: string, url: string, isNew: boolean, lastDate: string) => void;
  onDeleteLink: (id: string) => void;
  onToggleLinkNew: (id: string, current: boolean) => void;
  onUpdateLinkLastDate: (id: string, text: string) => void;
  onUpdateLink: (id: string, data: Record<string, any>) => void;
  onMoveLink: (linkId: string, categoryId: string, moveType: 'up' | 'top') => void;
  formatDate: (d: string) => string;
}) => {
  const [filterCat, setFilterCat] = useState('all');

  const filteredCategories = filterCat === 'all' ? categories : categories.filter(c => c.id === filterCat);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 items-center flex-wrap">
        <AddCategoryForm onAdd={onAddCategory} />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-base font-bold text-primary">Filter Category:</label>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg bg-background text-primary text-sm"
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {filteredCategories.map(cat => (
        <div key={cat.id} className="pb-8 mb-8 border-b-4 border-dashed border-slate-500 last:border-b-0 last:pb-0 last:mb-0">
          <CategoryCard
            cat={cat}
            links={categoryLinks.filter(l => l.category_id === cat.id)}
            onDelete={() => onDeleteCategory(cat.id)}
            onUpdateName={(name) => onUpdateCategory(cat.id, name)}
            onAddLink={onAddLink}
            onDeleteLink={onDeleteLink}
            onToggleLinkNew={onToggleLinkNew}
            onUpdateLinkLastDate={onUpdateLinkLastDate}
            onUpdateLink={onUpdateLink}
            onMoveLink={onMoveLink}
            formatDate={formatDate}
          />
        </div>
      ))}
    </div>
  );
};

// ============ CATEGORY CARD (with edit name) ============
const CategoryCard = ({
  cat, links, onDelete, onUpdateName, onAddLink, onDeleteLink, onToggleLinkNew, onUpdateLinkLastDate, onUpdateLink, onMoveLink, formatDate,
}: {
  cat: any; links: any[];
  onDelete: () => void;
  onUpdateName: (name: string) => void;
  onAddLink: (catId: string, title: string, url: string, isNew: boolean, lastDate: string) => void;
  onDeleteLink: (id: string) => void;
  onToggleLinkNew: (id: string, current: boolean) => void;
  onUpdateLinkLastDate: (id: string, text: string) => void;
  onUpdateLink: (id: string, data: Record<string, any>) => void;
  onMoveLink: (linkId: string, categoryId: string, moveType: 'up' | 'top') => void;
  formatDate: (d: string) => string;
}) => {
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(cat.name);

  const dateStr = cat.created_at?.toDate ? formatDate(cat.created_at.toDate().toISOString()) : formatDate(cat.created_at || '');

  return (
    <div className="bg-background rounded-2xl p-6" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
      <div className="flex justify-between items-center mb-3">
        {editingName ? (
          <div className="flex gap-2 items-center">
            <Input value={newName} onChange={e => setNewName(e.target.value)} className="w-64" />
            <Button size="sm" onClick={() => { onUpdateName(newName); setEditingName(false); }}>Save</Button>
            <Button variant="outline" size="sm" onClick={() => setEditingName(false)}>Cancel</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-primary">{cat.name}</h3>
            {dateStr && <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{dateStr}</span>}
          </div>
        )}
        <div className="flex gap-1">
          {!editingName && <Button variant="outline" size="sm" onClick={() => { setNewName(cat.name); setEditingName(true); }}>Edit</Button>}
          <Button variant="destructive" size="sm" onClick={onDelete}>Delete Category</Button>
        </div>
      </div>
      <AddLinkForm categoryId={cat.id} onAdd={onAddLink} />
      <div className="space-y-4 mt-5 border-t-2 border-dashed border-slate-300 pt-5">
        {links.map((link, idx) => (
          <div key={link.id} className="border-b border-dashed border-slate-300 pb-4 last:border-b-0 last:pb-0">
            <LinkRow link={link} onDelete={onDeleteLink} onToggleNew={onToggleLinkNew} onUpdateLastDate={onUpdateLinkLastDate} onUpdate={onUpdateLink} onMoveLink={onMoveLink} categoryId={cat.id} isFirst={idx === 0} formatDate={formatDate} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ LINK ROW (with edit + date + reorder) ============
const LinkRow = ({ link, onDelete, onToggleNew, onUpdateLastDate, onUpdate, onMoveLink, categoryId, isFirst, formatDate }: {
  link: any;
  onDelete: (id: string) => void;
  onToggleNew: (id: string, current: boolean) => void;
  onUpdateLastDate: (id: string, text: string) => void;
  onUpdate: (id: string, data: Record<string, any>) => void;
  onMoveLink: (linkId: string, categoryId: string, moveType: 'up' | 'top') => void;
  categoryId: string;
  isFirst: boolean;
  formatDate: (d: string) => string;
}) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url || '');

  const dateStr = link.created_at?.toDate ? formatDate(link.created_at.toDate().toISOString()) : formatDate(link.created_at || '');

  if (editing) {
    return (
      <div className="p-2 bg-secondary rounded-lg text-sm space-y-2">
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="flex-1 min-w-[200px]" />
          <Input placeholder="URL" value={url} onChange={e => setUrl(e.target.value)} className="flex-1 min-w-[200px]" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { onUpdate(link.id, { title, url }); setEditing(false); }}>Save</Button>
          <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2.5 bg-secondary rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Reorder arrows */}
          <div className="flex flex-col gap-1">
            <button
              onClick={() => !isFirst && onMoveLink(link.id, categoryId, 'up')}
              disabled={isFirst}
              className={`flex items-center gap-1 px-2 py-1 rounded font-bold text-sm leading-none transition-all ${isFirst ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100 cursor-pointer hover:scale-110'}`}
              title="Move up one step"
            >
              <span className="text-lg">↑</span>
              <span>Up</span>
            </button>
            <button
              onClick={() => !isFirst && onMoveLink(link.id, categoryId, 'top')}
              disabled={isFirst}
              className={`flex items-center gap-1 px-2 py-1 rounded font-bold text-sm leading-none transition-all ${isFirst ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-orange-600 hover:bg-orange-100 cursor-pointer hover:scale-110'}`}
              title="Move to top"
            >
              <span className="text-lg">⤒</span>
              <span>Top</span>
            </button>
          </div>
          <span className="font-medium text-primary text-base">{link.title}</span>
          {link.url && <span className="text-muted-foreground text-sm">{link.url}</span>}
          {link.is_new && <span className="text-sm font-bold text-destructive animate-pulse">New</span>}
          {dateStr && <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{dateStr}</span>}
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="outline" size="sm" onClick={() => onToggleNew(link.id, link.is_new)}>
            {link.is_new ? '✕ New' : '✓ New'}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(link.id)}>Delete</Button>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="text"
          placeholder="Last Date / Extended (e.g. Last Date: 30/03/2026)"
          defaultValue={link.last_date_text || ''}
          onBlur={e => onUpdateLastDate(link.id, e.target.value)}
          className="flex-1 text-sm px-2 py-1.5 border border-border rounded bg-background"
        />
      </div>
    </div>
  );
};

// ============ POSTS TAB (with search + category filter + date) ============
const PostsTab = ({ posts, onDelete, navigate, categories, formatDate }: { posts: any[]; onDelete: (id: string) => void; navigate: (path: string) => void; categories: any[]; formatDate: (d: string) => string }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState('all');

  const [categoryLinks, setCategoryLinks] = useState<any[]>([]);
  useEffect(() => {
    getCategoryLinks().then(setCategoryLinks);
  }, []);

  let filteredPosts = posts;

  if (searchQuery) {
    filteredPosts = filteredPosts.filter(p => p.name_of_post?.toLowerCase().includes(searchQuery.toLowerCase()) || p.post_date?.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  if (filterCat !== 'all') {
    const linkedSlugs = new Set(
      categoryLinks
        .filter(l => l.category_id === filterCat)
        .map(l => {
          if (!l.url) return null;
          const match = l.url.match(/\/post\/(.+)/);
          if (match) return match[1];
          if (!l.url.startsWith('http') && !l.url.startsWith('/')) return l.url;
          return null;
        })
        .filter(Boolean)
    );
    filteredPosts = filteredPosts.filter(p => {
      for (const slug of linkedSlugs) {
        if (p.slug === slug || p.id === slug || (p.slug && p.slug.startsWith(slug))) return true;
      }
      return false;
    });
  }

  return (
    <div className="bg-background rounded-2xl p-6" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-primary">Posts</h2>
        <Button onClick={() => navigate('/admin/post/new')}>+ Create New Post</Button>
      </div>
      <div className="mb-4 flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-[250px]">
          <div className="w-full max-w-md bg-background rounded-full p-1 border border-border flex items-center" style={{ boxShadow: '2px 2px 6px rgba(0,0,0,0.1)' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              className="flex-1 border-none outline-none py-1.5 px-2.5 rounded-full text-sm bg-transparent"
            />
            <button className="w-8 h-8 rounded-full border-none cursor-pointer flex items-center justify-center bg-background" style={{ boxShadow: '1px 1px 4px rgba(0,0,0,0.1)' }}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-primary stroke-[2.5] fill-none">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" />
              </svg>
            </button>
          </div>
        </div>
        <div>
          <label className="text-base font-bold text-primary block mb-1">Filter by Category</label>
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-background text-primary text-sm"
          >
            <option value="all">All Posts</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      {(searchQuery || filterCat !== 'all') && (
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          {searchQuery && <span className="text-sm text-muted-foreground">Search: <strong className="text-primary">"{searchQuery}"</strong></span>}
          {filterCat !== 'all' && <span className="text-sm text-muted-foreground">Category: <strong className="text-primary">{categories.find(c => c.id === filterCat)?.name}</strong></span>}
          <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setFilterCat('all'); }}>Clear Filters</Button>
        </div>
      )}
      <div className="space-y-4 mt-6 border-t-4 border-dashed border-slate-500 pt-6">
        {filteredPosts.map(post => (
          <div key={post.id} className="border-b-2 border-dashed border-slate-300 pb-4 last:border-b-0 last:pb-0">
            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-bold text-primary text-base">{post.name_of_post}</div>
                  <div className="text-sm text-muted-foreground">{post.post_date}</div>
                </div>
                {post.created_at && <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{formatDate(post.created_at)}</span>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/post/${post.id}`)}>Edit</Button>
                <Button variant="outline" size="sm" onClick={() => window.open(`/post/${post.slug || post.id}`, '_blank')}>Preview</Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(post.id)}>Delete</Button>
              </div>
            </div>
          </div>
        ))}
        {filteredPosts.length === 0 && <p className="text-muted-foreground text-center py-8 border-b-2 border-dashed border-slate-300 pb-4">{(searchQuery || filterCat !== 'all') ? 'No posts found.' : 'No posts yet. Create one!'}</p>}
      </div>
    </div>
  );
};

// ============ FORMS ============
const AddLinkForm = ({ categoryId, onAdd }: { categoryId: string; onAdd: (catId: string, title: string, url: string, isNew: boolean, lastDate: string) => void }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [lastDate, setLastDate] = useState('');
  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Link Title" value={title} onChange={e => setTitle(e.target.value)} className="flex-1 min-w-[200px]" />
        <Input placeholder="URL (e.g. /post/id)" value={url} onChange={e => setUrl(e.target.value)} className="flex-1 min-w-[200px]" />
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <label className="flex items-center gap-1 text-base text-primary cursor-pointer">
          <input type="checkbox" checked={isNew} onChange={e => setIsNew(e.target.checked)} />
          Mark as New
        </label>
        <Input placeholder="Last Date / Extended (optional)" value={lastDate} onChange={e => setLastDate(e.target.value)} className="flex-1 min-w-[200px]" />
        <Button onClick={() => { if (title) { onAdd(categoryId, title, url, isNew, lastDate); setTitle(''); setUrl(''); setIsNew(false); setLastDate(''); } }}>Add</Button>
      </div>
    </div>
  );
};

const AddCategoryForm = ({ onAdd }: { onAdd: (name: string) => void }) => {
  const [name, setName] = useState('');
  return (
    <div className="flex gap-2 mb-4">
      <Input placeholder="New Category Name (e.g. Scholarship)" value={name} onChange={e => setName(e.target.value)} className="flex-1" />
      <Button onClick={() => { if (name.trim()) { onAdd(name.trim()); setName(''); } }}>+ Add Category</Button>
    </div>
  );
};

const AddTabletForm = ({ onAdd }: { onAdd: (title: string, subtitle: string, url: string) => void }) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [url, setUrl] = useState('');
  return (
    <div className="flex gap-2 flex-wrap">
      <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="flex-1 min-w-[150px]" />
      <Input placeholder="Subtitle" value={subtitle} onChange={e => setSubtitle(e.target.value)} className="flex-1 min-w-[150px]" />
      <Input placeholder="URL" value={url} onChange={e => setUrl(e.target.value)} className="flex-1 min-w-[150px]" />
      <Button onClick={() => { if (title) { onAdd(title, subtitle, url); setTitle(''); setSubtitle(''); setUrl(''); } }}>Add</Button>
    </div>
  );
};

export default AdminDashboard;
