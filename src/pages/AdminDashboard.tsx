import { useState, useEffect, useMemo } from 'react';
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
  clearLocalAdminCache,
  getSiteSettingsFlat,
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
import { BackupRecoveryTab } from '@/components/admin/BackupRecoveryTab';
import { saveBackupToVault } from '@/lib/indexedDbBackup';

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
  const [publishing, setPublishing] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, title: '', description: '', onConfirm: () => {} });
  const navigate = useNavigate();
  const { toast } = useToast();

  const ThemeToggle = () => {
    const [isThemeBhagwa, setIsThemeBhagwa] = useState(true);
    useEffect(() => {
      const savedTheme = localStorage.getItem('theme-mode');
      if (savedTheme === 'default') {
        document.documentElement.classList.remove('theme-bhagwa');
        setIsThemeBhagwa(false);
      } else {
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
      <button onClick={toggle} className="p-2 rounded-full hover:bg-black/10 transition-all active:scale-90 duration-100 mr-2" title="Switch Theme">
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

  // Real-time cross-tab synchronization when tasks or posts are created/edited in another tab
  useEffect(() => {
    let syncChannel: BroadcastChannel | null = null;
    try {
      syncChannel = new BroadcastChannel('admin_sync');
      syncChannel.onmessage = (event) => {
        if (!event.data) return;

        if (event.data.type === 'SYNC_ITEM_UPDATE') {
          const { updatedPost, updatedLinks, deletedLinkIds, updatedTabletItems } = event.data;

          if (updatedPost) {
            setPosts(prev => {
              const index = prev.findIndex(p => p.id === updatedPost.id);
              if (index > -1) {
                const next = [...prev];
                next[index] = {
                  ...next[index],
                  ...updatedPost,
                  tables_html: updatedPost.tables_html,
                  tables_html_hi: updatedPost.tables_html_hi
                };
                return next;
              } else {
                return [updatedPost, ...prev];
              }
            });
          }

          if (updatedLinks && updatedLinks.length > 0) {
            setCategoryLinks(prev => {
              const next = [...prev];
              for (const link of updatedLinks) {
                const index = next.findIndex(l => l.id === link.id);
                if (index > -1) {
                  next[index] = { ...next[index], ...link };
                } else {
                  next.push(link);
                }
              }
              return next;
            });
          }

          if (deletedLinkIds && deletedLinkIds.length > 0) {
            setCategoryLinks(prev => prev.filter(l => !deletedLinkIds.includes(l.id)));
          }

          if (updatedTabletItems && updatedTabletItems.length > 0) {
            setTabletItems(prev => {
              const next = [...prev];
              for (const item of updatedTabletItems) {
                const index = next.findIndex(i => i.id === item.id);
                if (index > -1) {
                  next[index] = { ...next[index], ...item };
                } else {
                  next.push(item);
                }
              }
              return next;
            });
          }
        } else if (event.data.type === 'DELETE_ITEM_UPDATE') {
          const { postId, postSlug } = event.data;
          setPosts(prev => prev.filter(p => p.id !== postId));
          if (postId || postSlug) {
            setCategoryLinks(prev => prev.filter(l => {
              if (!l.url) return true;
              const match = l.url.match(/\/post\/(.+)/);
              const linkSlug = match ? match[1] : (!l.url.startsWith('http') && !l.url.startsWith('/') ? l.url : null);
              return linkSlug !== postSlug && linkSlug !== postId;
            }));
            setTabletItems(prev => prev.filter(t => {
              if (!t.url) return true;
              const match = t.url.match(/\/post\/(.+)/);
              const linkSlug = match ? match[1] : (!t.url.startsWith('http') && !t.url.startsWith('/') ? t.url : null);
              return linkSlug !== postSlug && linkSlug !== postId;
            }));
          }
        } else if (event.data.type === 'REFRESH_ADMIN_DATA') {
          fetchAll();
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }

    return () => {
      if (syncChannel) {
        syncChannel.close();
      }
    };
  }, []);

  const fetchAll = async () => {
    const [c, cl, t, p, s] = await Promise.all([
      getCategories(),
      getCategoryLinks(),
      getTabletItems(),
      getPosts(),
      getSiteSettings(),
    ]);
    
    // Auto-expire "New" badges for "Latest Jobs" category links
    const nextCl = [...cl];
    
    // Find the Latest Jobs category (various spellings)
    const latestJobsCat = c.find((cat: any) => 
      (cat.name.toLowerCase().includes('latest') || cat.name.toLowerCase().includes('letest')) && 
      cat.name.toLowerCase().includes('job')
    );

    const CATEGORY_NEW_BADGE_EXPIRY_DAYS = 7;
    const msInExpiryDays = CATEGORY_NEW_BADGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    for (let i = 0; i < nextCl.length; i++) {
      const link = nextCl[i];
      if (!link.is_new) continue;

      const isLatestJobs = latestJobsCat && link.category_id === latestJobsCat.id;

      if (isLatestJobs) {
        if (link.url) {
          const match = link.url.match(/\/post\/(.+)/);
          const slug = match ? match[1] : null;
          if (slug) {
            const post = p.find((postItem: any) => postItem.slug === slug || postItem.id === slug);
            if (post) {
              const lastDateStr = post.last_date_text || post.last_date_text_hi || 
                                  extractDatesFromHtml(post.tables_html).lastDate || 
                                  extractDatesFromHtml(post.tables_html_hi).lastDate;
              if (lastDateStr) {
                const cleanedStr = extractDateText(lastDateStr) || lastDateStr;
                const parsedDate = parseCleanDate(cleanedStr);
                if (parsedDate && parsedDate.getTime() < Date.now()) {
                  try {
                    await updateCategoryLink(link.id, { is_new: false });
                    nextCl[i] = { ...link, is_new: false };
                  } catch (e) {
                    console.error(`Failed to auto-expire link ${link.id}:`, e);
                  }
                }
              }
            }
          }
        }
      } else {
        // For other categories (Result, Admit Card, Answer Key, etc.)
        if (link.link_timestamp) {
          const msSinceCreated = Date.now() - link.link_timestamp;
          if (msSinceCreated > msInExpiryDays) {
            try {
              await updateCategoryLink(link.id, { is_new: false });
              nextCl[i] = { ...link, is_new: false };
            } catch (e) {
              console.error(`Failed to auto-expire general category link ${link.id}:`, e);
            }
          }
        }
      }
    }

    setCategoryLinks(nextCl);

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

    setPublishing(true);
    toast({ 
      title: '⚠️ पब्लिश शुरू - ऑटो बैकअप तैयार हो रहा है!', 
      description: 'कृपया प्रतीक्षा करें, आपकी वेबसाइट पब्लिश हो रही है और बैकग्राउंड में पूरे डेटाबेस की कॉपी संकलित हो रही है...',
    });

    try {
      console.log('[Publish] Updating site_last_updated in Firestore...');
      // 1. Instantly update last updated in Firebase (takes fractions of a second)
      await updateSiteLastUpdated();
      
      console.log('[Publish] Triggering build webhook...');
      // 2. Fetch compile webhook instantly (takes around a second)
      const res = await fetch(webhookUrl, { method: 'POST' });
      
      if (res.ok) {
        toast({ 
          title: '🚀 पब्लिश कमांड सफल!', 
          description: 'वेबसाइट अपडेट शुरू हो गई है। बैकग्राउंड में डेटा संकलन चालू है, JSON बैकअप फाइल कुछ ही सेकंड में डाउनलोड होगी।',
        });
      } else {
        toast({ 
          title: '⚠️ पब्लिश हुक रिस्पांस एरर', 
          description: 'पब्लिश हुक से त्रुटि मिली, परंतु बैकग्राउंड में आपका आटोमैटिक डेटा बैकअप सहेजना जारी है...', 
          variant: 'destructive' 
        });
      }

      // Turn off publishing loader so user is instantly free
      setPublishing(false);

      // 3. Trigger heavy A-to-Z Database Backup compilation in the background asynchronously
      setTimeout(async () => {
        try {
          console.log('[BG Backup] Starting complete background backup process...');
          const [categoriesData, category_linksData, tablet_itemsData, settings_flatData, basicPosts] = await Promise.all([
            getCategories(),
            getCategoryLinks(),
            getTabletItems(),
            getSiteSettingsFlat(),
            getPosts()
          ]);

          // Disaster protection check
          if (categoriesData.length === 0 && basicPosts.length === 0) {
            console.warn('[BG Backup] Cloud DB returned empty, backup aborted to avoid corrupting local store.');
            return;
          }

          console.log(`[BG Backup] Fetching rich details for ${basicPosts.length} posts...`);
          const fullPosts: any[] = [];
          for (const p of basicPosts) {
            try {
              const fullPost = await getPostBySlug(p.slug || p.id);
              fullPosts.push(fullPost || p);
            } catch (e) {
              console.warn(`Could not load details for ${p.id}, using basic info`, e);
              fullPosts.push(p);
            }
          }

          const backupObj = {
            categories: categoriesData,
            category_links: category_linksData,
            tablet_items: tablet_itemsData,
            posts: fullPosts,
            settings_flat: settings_flatData,
            backup_timestamp: new Date().toISOString(),
            source: 'Sarkari_Sewayojan_Backup_on_Publish'
          };

          // A. Save to Browser Local Vault (IndexedDB)
          await saveBackupToVault(backupObj, 'latest_daily');
          
          // B. Trigger automatic JSON file download
          const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const dateString = new Date().toISOString().split('T')[0];
          const timeString = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
          link.href = url;
          link.download = `Sarkari_Sewayojan_Backup_Publish_${dateString}_${timeString}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          console.log('[BG Backup] Background auto backup successfully downloaded & stored.');
          
          toast({ 
            title: '💾 लाइव बैकअप डाउनलोड पूर्ण!', 
            description: 'आपके कंप्यूटर पर नए डेटा की JSON बैकअप फाइल सफलतापूर्वक सेव हो गई है।',
          });
        } catch (bgErr: any) {
          console.error('[BG Backup] Dynamic background data backup failed:', bgErr);
          toast({
            title: '⚠️ बैकअप संग्रह बाधित',
            description: 'वेबसाइट पब्लिश हो गई है, लेकिन पूर्ण बैकअप फाइल डाउनलोड नहीं हो सकी: ' + (bgErr.message || String(bgErr)),
            variant: 'destructive'
          });
        }
      }, 50);

    } catch (err: any) {
      console.error(err);
      toast({ 
        title: '⚠️ पब्लिश विफलता!', 
        description: 'वेबसाइट को पब्लिश करने में त्रुटि: ' + (err.message || String(err)), 
        variant: 'destructive' 
      });
      setPublishing(false);
    }
  };

  const handleForceRefresh = async () => {
    setLoading(true);
    clearLocalAdminCache();
    try {
      await fetchAll();
      toast({ title: 'Cache Refreshed', description: 'Fresh data fetched from Firestore database successfully.' });
    } catch (err: any) {
      console.error("Cache Refresh Error:", err);
      toast({ title: 'Error', description: 'Failed to refresh data from database: ' + (err.message || 'Unknown error'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    await updateSiteSetting(key, value, settings[key]?.id);
    await fetchAll();
    toast({ title: 'Setting updated!' });
  };

  const handleAddLink = async (categoryId: string, title: string, url: string, isNew: boolean, lastDateText: string) => {
    let finalIsNew = isNew;
    if (isNew) {
      const cat = categories.find(c => c.id === categoryId);
      const isLatestJobsCat = cat && (
        cat.name.toLowerCase().includes('latest') || 
        cat.name.toLowerCase().includes('letest')
      ) && cat.name.toLowerCase().includes('job');

      if (isLatestJobsCat && url) {
        const match = url.match(/\/post\/(.+)/);
        const slug = match ? match[1] : null;
        if (slug) {
          const post = posts.find(p => p.slug === slug || p.id === slug);
          if (post) {
            const lastDateStr = post.last_date_text || post.last_date_text_hi || 
                                extractDatesFromHtml(post.tables_html).lastDate || 
                                extractDatesFromHtml(post.tables_html_hi).lastDate;
            if (lastDateStr) {
              const cleanedStr = extractDateText(lastDateStr) || lastDateStr;
              const parsedDate = parseCleanDate(cleanedStr);
              if (parsedDate && parsedDate.getTime() < Date.now()) {
                const confirmForce = window.confirm(`Warning: Is post ki Last Date (${lastDateStr}) nikal chuki hai.\n\nKya aap ab bhi is par 'New' ka tag lagana chahte hain?`);
                if (!confirmForce) {
                  finalIsNew = false;
                }
              }
            }
          }
        }
      }
    }

    await addCategoryLink({
      category_id: categoryId,
      title,
      url,
      link_timestamp: Date.now(),
      is_new: finalIsNew,
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
    if (!currentVal) {
      const link = categoryLinks.find(l => l.id === id);
      if (link) {
        const cat = categories.find(c => c.id === link.category_id);
        const isLatestJobsCat = cat && (
          cat.name.toLowerCase().includes('latest') || 
          cat.name.toLowerCase().includes('letest')
        ) && cat.name.toLowerCase().includes('job');

        if (isLatestJobsCat && link.url) {
          const match = link.url.match(/\/post\/(.+)/);
          const slug = match ? match[1] : null;
          if (slug) {
            const post = posts.find(p => p.slug === slug || p.id === slug);
            if (post) {
              const lastDateStr = post.last_date_text || post.last_date_text_hi || 
                                  extractDatesFromHtml(post.tables_html).lastDate || 
                                  extractDatesFromHtml(post.tables_html_hi).lastDate;
              if (lastDateStr) {
                const cleanedStr = extractDateText(lastDateStr) || lastDateStr;
                const parsedDate = parseCleanDate(cleanedStr);
                if (parsedDate && parsedDate.getTime() < Date.now()) {
                  const confirmForce = window.confirm(`Warning: Is post ki Last Date (${lastDateStr}) nikal chuki hai.\n\nKya aap ab bhi is par 'New' ka tag lagana chahte hain?`);
                  if (!confirmForce) {
                    return;
                  }
                }
              }
            }
          }
        }
      }
    }

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
      try {
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

        // Optimal local-state update (0 Reads!)
        setPosts(prev => prev.filter(p => p.id !== id));
        if (post) {
          const slug = post.slug || post.id;
          setCategoryLinks(prev => prev.filter(l => {
            if (!l.url) return true;
            const match = l.url.match(/\/post\/(.+)/);
            const linkSlug = match ? match[1] : (!l.url.startsWith('http') && !l.url.startsWith('/') ? l.url : null);
            return linkSlug !== slug && linkSlug !== post.id;
          }));
          setTabletItems(prev => prev.filter(t => {
            if (!t.url) return true;
            const match = t.url.match(/\/post\/(.+)/);
            const linkSlug = match ? match[1] : (!t.url.startsWith('http') && !t.url.startsWith('/') ? t.url : null);
            return linkSlug !== slug && linkSlug !== post.id;
          }));
        }

        // Broadcast deletion event to other tabs
        try {
          const syncChannel = new BroadcastChannel('admin_sync');
          syncChannel.postMessage({ 
            type: 'DELETE_ITEM_UPDATE', 
            postId: id,
            postSlug: post?.slug || id
          });
          syncChannel.close();
        } catch (e) {
          console.warn('Sync broadcast warning:', e);
        }

        toast({ title: 'Post & linked items deleted!' });
      } catch (err: any) {
        console.error("Delete POST error:", err);
        toast({ title: 'Error deleting post', description: err.message || 'An unexpected error occurred', variant: 'destructive' });
      }
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
          <Button variant="outline" onClick={handleForceRefresh} title="Clear local cache and load fresh data from Firestore database">🔄 Refresh Database Cache</Button>
          <Button 
            variant="default" 
            className="bg-green-600 hover:bg-green-700 font-extrabold flex items-center gap-1.5" 
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                पब्लिश और बैकअप हो रहा है...
              </>
            ) : (
              '🚀 Publish Website'
            )}
          </Button>
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
            <TabsTrigger value="backup" className="bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300 font-bold border-l-2 border-red-500">🛡️ Backup & Recovery</TabsTrigger>
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
              posts={posts}
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
              onMoveCategory={async (catId: string, direction: 'up' | 'down') => {
                const idx = categories.findIndex(c => c.id === catId);
                if (idx < 0) return;
                const cat = categories[idx];
                let swapCat = null;
                if (direction === 'up' && idx > 0) {
                  swapCat = categories[idx - 1];
                } else if (direction === 'down' && idx < categories.length - 1) {
                  swapCat = categories[idx + 1];
                }
                if (swapCat) {
                  const currentOrder = cat.display_order || idx;
                  const swapOrder = swapCat.display_order || (direction === 'up' ? idx - 1 : idx + 1);
                  await updateCategoryFn(cat.id, { display_order: swapOrder });
                  await updateCategoryFn(swapCat.id, { display_order: currentOrder });
                  await fetchAll();
                  toast({ title: 'Category moved!' });
                }
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
            <PostsTab posts={posts} categoryLinks={categoryLinks} onDelete={handleDeletePost} navigate={navigate} categories={categories} formatDate={formatDate} />
          </TabsContent>

          {/* BACKUP & RECOVERY */}
          <TabsContent value="backup">
            <BackupRecoveryTab />
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
  categories, categoryLinks, posts, onAddCategory, onDeleteCategory, onUpdateCategory, onMoveCategory,
  onAddLink, onDeleteLink, onToggleLinkNew, onUpdateLinkLastDate, onUpdateLink, onMoveLink, formatDate,
}: {
  categories: any[]; categoryLinks: any[]; posts: any[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateCategory: (id: string, name: string) => void;
  onMoveCategory: (catId: string, direction: 'up' | 'down') => void;
  onAddLink: (catId: string, title: string, url: string, isNew: boolean, lastDate: string) => void;
  onDeleteLink: (id: string) => void;
  onToggleLinkNew: (id: string, current: boolean) => void;
  onUpdateLinkLastDate: (id: string, text: string) => void;
  onUpdateLink: (id: string, data: Record<string, any>) => void;
  onMoveLink: (linkId: string, categoryId: string, moveType: 'up' | 'top') => void;
  formatDate: (d: string) => string;
}) => {
  const [filterCat, setFilterCat] = useState('all');
  const [showOnlyWithLastDate, setShowOnlyWithLastDate] = useState(false);

  // Pre-compute Map of slug/ID to Post for O(1) matching speed in CategoryCard and LinkRows
  const postsMap = useMemo(() => {
    const map = new Map<string, any>();
    posts.forEach(p => {
      if (p.slug) map.set(p.slug, p);
      if (p.id) map.set(p.id, p);
    });
    return map;
  }, [posts]);

  // Compute filtered categories based on dropdown and Last Date Box filter
  const filteredCategories = useMemo(() => {
    let cats = filterCat === 'all' ? categories : categories.filter(c => c.id === filterCat);
    if (showOnlyWithLastDate) {
      cats = cats.filter(cat => {
        const linksForCat = categoryLinks.filter(l => l.category_id === cat.id);
        return linksForCat.some(l => l.last_date_text && l.last_date_text.trim() !== '');
      });
    }
    return cats;
  }, [categories, filterCat, showOnlyWithLastDate, categoryLinks]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 items-center flex-wrap">
        <AddCategoryForm onAdd={onAddCategory} />
      </div>
      <div className="flex gap-4 items-center flex-wrap bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-dashed border-slate-300">
        <div className="flex items-center gap-2">
          <label className="text-base font-bold text-primary">Filter Category:</label>
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-background text-primary text-sm font-semibold"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-900">
          <input
            type="checkbox"
            id="showOnlyWithLastDate"
            checked={showOnlyWithLastDate}
            onChange={e => setShowOnlyWithLastDate(e.target.checked)}
            className="w-4 h-4 cursor-pointer accent-blue-600 rounded"
          />
          <label htmlFor="showOnlyWithLastDate" className="text-sm font-bold text-blue-700 dark:text-blue-400 cursor-pointer select-none flex items-center gap-1.5">
            📅 Only Show Links with Last Date / Extended Box Entered
          </label>
        </div>
      </div>
      {filteredCategories.map((cat, index) => (
        <div key={cat.id} className="pb-8 mb-8 border-b-4 border-dashed border-slate-500 last:border-b-0 last:pb-0 last:mb-0">
          <CategoryCard
            cat={cat}
            index={filterCat === 'all' ? index : undefined}
            totalCats={categories.length}
            links={(() => {
              const linksForCat = categoryLinks.filter(l => l.category_id === cat.id);
              return showOnlyWithLastDate ? linksForCat.filter(l => l.last_date_text && l.last_date_text.trim() !== '') : linksForCat;
            })()}
            postsMap={postsMap}
            onDelete={() => onDeleteCategory(cat.id)}
            onUpdateName={(name) => onUpdateCategory(cat.id, name)}
            onMoveCategory={onMoveCategory}
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
      {filteredCategories.length === 0 && (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-300">
          <span className="text-muted-foreground font-semibold">
            {showOnlyWithLastDate 
              ? "No links match this filter with 'Last Date Box' filled." 
              : "No categories or links found."}
          </span>
        </div>
      )}
    </div>
  );
};

// ============ CATEGORY CARD (with edit name) ============
const CategoryCard = ({
  cat, index, totalCats, links, postsMap, onDelete, onUpdateName, onMoveCategory, onAddLink, onDeleteLink, onToggleLinkNew, onUpdateLinkLastDate, onUpdateLink, onMoveLink, formatDate,
}: {
  cat: any; index?: number; totalCats?: number; links: any[]; postsMap: Map<string, any>;
  onDelete: () => void;
  onUpdateName: (name: string) => void;
  onMoveCategory: (catId: string, direction: 'up' | 'down') => void;
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
          {index !== undefined && totalCats !== undefined && (
            <div className="flex bg-slate-100 rounded mr-2 overflow-hidden shadow-sm">
              <button onClick={() => onMoveCategory(cat.id, 'up')} disabled={index === 0} className={`px-2 py-1 font-bold transition-all duration-100 ${index === 0 ? 'opacity-30' : 'hover:bg-blue-100 text-blue-600 active:scale-95 active:bg-blue-200'}`}>↑</button>
              <button onClick={() => onMoveCategory(cat.id, 'down')} disabled={index === totalCats - 1} className={`px-2 py-1 font-bold transition-all duration-100 ${index === totalCats - 1 ? 'opacity-30' : 'hover:bg-blue-100 text-blue-600 active:scale-95 active:bg-blue-200'}`}>↓</button>
            </div>
          )}
          {!editingName && <Button variant="outline" size="sm" onClick={() => { setNewName(cat.name); setEditingName(true); }}>Edit</Button>}
          <Button variant="destructive" size="sm" onClick={onDelete}>Delete Category</Button>
        </div>
      </div>
      <AddLinkForm categoryId={cat.id} onAdd={onAddLink} />
      <div className="space-y-4 mt-5 border-t-2 border-dashed border-slate-300 pt-5">
        {links.map((link, idx) => (
          <div key={link.id} className="border-b border-dashed border-slate-300 pb-4 last:border-b-0 last:pb-0">
            <LinkRow link={link} postsMap={postsMap} onDelete={onDeleteLink} onToggleNew={onToggleLinkNew} onUpdateLastDate={onUpdateLinkLastDate} onUpdate={onUpdateLink} onMoveLink={onMoveLink} categoryId={cat.id} isFirst={idx === 0} formatDate={formatDate} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ LINK ROW (with edit + date + reorder) ============
const LinkRow = ({ link, postsMap, onDelete, onToggleNew, onUpdateLastDate, onUpdate, onMoveLink, categoryId, isFirst, formatDate }: {
  link: any;
  postsMap: Map<string, any>;
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

  const dateStr = link.post_date || (link.link_timestamp ? formatDate(new Date(link.link_timestamp).toISOString()) : 
                  (link.created_at?.toDate ? formatDate(link.created_at.toDate().toISOString()) : formatDate(link.created_at || '')));

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
              className={`flex items-center gap-1 px-2 py-1 rounded font-bold text-sm leading-none transition-all duration-100 ${isFirst ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100 cursor-pointer hover:scale-110 active:scale-95'}`}
              title="Move up one step"
            >
              <span className="text-lg">↑</span>
              <span>Up</span>
            </button>
            <button
              onClick={() => !isFirst && onMoveLink(link.id, categoryId, 'top')}
              disabled={isFirst}
              className={`flex items-center gap-1 px-2 py-1 rounded font-bold text-sm leading-none transition-all duration-100 ${isFirst ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-orange-600 hover:bg-orange-100 cursor-pointer hover:scale-110 active:scale-95'}`}
              title="Move to top"
            >
              <span className="text-lg">⤒</span>
              <span>Top</span>
            </button>
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-primary text-base">{link.title}</span>
            <div className="flex items-center gap-2 flex-wrap">
              {link.url && <span className="text-muted-foreground text-sm">{link.url}</span>}
              {(() => {
                if (link.url) {
                  const match = link.url.match(/\/post\/(.+)/);
                  const slug = match ? match[1] : null;
                  if (slug && postsMap) {
                    const cleanSlug = slug.endsWith('/') ? slug.slice(0, -1) : slug;
                    const post = postsMap.get(slug) || postsMap.get(cleanSlug);
                    if (post) {
                      return <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">Post: {post.name_of_post}</span>;
                    } else {
                      return <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold">⚠️ Post not found ({slug})</span>;
                    }
                  }
                }
                return null;
              })()}
              {link.is_new && <span className="text-sm font-bold text-destructive animate-pulse">New</span>}
              {dateStr && <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{dateStr}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-1 items-start">
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

// ============ DATE EXTRACTION & DISPLAY FOR ADMIN ============
interface ExtractedDates {
  startDate: string | null;
  lastDate: string | null;
}

const cleanText = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/[\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/g, ' ') // replace non-breaking & special spaces
    .replace(/\s+/g, ' ')
    .trim();
};

const extractDateText = (text: string): string | null => {
  if (!text) return null;
  const cleaned = cleanText(text);
  // Strip common separating colons, dashes, bullets, spaces, colons (including Hindi colon equivalents like ः or । or -) at start/end
  // eslint-disable-next-line no-misleading-character-class
  const finalVal = cleaned.replace(/^[:\-–—\s\u200b•|ः।]+/, '').replace(/[:\-–—\s|ः।]+$/, '').trim();
  if (!finalVal) return null;

  // Check if there is any date-like pattern or Hindi month/words
  const hasDate = /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/i.test(finalVal) || 
                  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|जनवरी|फ़रवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|अक्तूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर)/i.test(finalVal);
  
  if (hasDate) {
    if (finalVal.length < 55) return finalVal;
  }
  
  // Try regex to pull out specifically the date from longer text
  const matchNumeric = finalVal.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/i);
  if (matchNumeric) return matchNumeric[0];

  const matchAlpha = finalVal.match(/\b\d{1,2}(?:st|nd|rd|th)?[\s./-]*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|जनवरी|फ़रवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|अक्तूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर)[a-z]*[\s./-]*\d{2,4}\b/i);
  if (matchAlpha) return matchAlpha[0];

  const matchAlphaRev = finalVal.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|जनवरी|फ़रवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|अक्तूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर)[a-z]*[\s./-]*\d{1,2}(?:st|nd|rd|th)?[\s./-]*\d{2,4}\b/i);
  if (matchAlphaRev) return matchAlphaRev[0];

  // Fallback: short descriptive strings with a numeric component
  if (finalVal.length < 25 && /\d/.test(finalVal)) {
    return finalVal;
  }

  return null;
};

const isElementRed = (el: Element): boolean => {
  const inlineStyle = el.getAttribute('style') || '';
  const colorAttr = el.getAttribute('color') || '';
  const classAttr = el.getAttribute('class') || '';

  const lowerStyle = inlineStyle.toLowerCase();
  const lowerColor = colorAttr.toLowerCase();
  const lowerClass = classAttr.toLowerCase();

  // Primary check for the word 'red' or text-red classes/rgb
  if (
    lowerStyle.includes('color: red') || 
    lowerStyle.includes('color:red') ||
    lowerColor === 'red' ||
    lowerClass.includes('text-red') ||
    lowerClass.includes('red-text') ||
    lowerStyle.includes('color:rgb(255, 0, 0)') ||
    lowerStyle.includes('color:rgb(255,0,0)') ||
    lowerStyle.includes('color: rgb(255, 0, 0)') ||
    lowerStyle.includes('color: rgb(255,0,0)')
  ) {
    return true;
  }

  // Handle generalized hex backgrounds or colors (dominant red component)
  const styleColorMatch = lowerStyle.match(/color\s*:\s*(#[0-9a-f]{3,8}|rgb\([^)]+\)|rgba\([^)]+\))/);
  const colorVal = styleColorMatch ? styleColorMatch[1] : (lowerColor.startsWith('#') || lowerColor.startsWith('rgb') ? lowerColor : null);

  if (colorVal) {
    if (colorVal.startsWith('#')) {
      const hex = colorVal.substring(1);
      if (hex.length === 3 || hex.length === 4) {
        const r = parseInt(hex[0], 16);
        const g = parseInt(hex[1], 16);
        const b = parseInt(hex[2], 16);
        if (r >= 10 && r > g + 2 && r > b + 2) {
          return true;
        }
      } else if (hex.length === 6 || hex.length === 8) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        if (r >= 120 && r > g + 35 && r > b + 35) {
          return true;
        }
      }
    } else if (colorVal.startsWith('rgb')) {
      const rgbNumbers = colorVal.match(/\d+/g);
      if (rgbNumbers && rgbNumbers.length >= 3) {
        const r = parseInt(rgbNumbers[0], 10);
        const g = parseInt(rgbNumbers[1], 10);
        const b = parseInt(rgbNumbers[2], 10);
        if (r >= 120 && r > g + 35 && r > b + 35) {
          return true;
        }
      }
    }
  }

  return false;
};

const hasRedAncestorOrSelf = (element: Element): boolean => {
  let curr: Element | null = element;
  while (curr) {
    if (isElementRed(curr)) {
      return true;
    }
    const tag = curr.tagName.toLowerCase();
    if (tag === 'body' || tag === 'html') {
      break;
    }
    curr = curr.parentElement;
  }
  return false;
};

const isElementBold = (el: Element): boolean => {
  const tag = el.tagName.toLowerCase();
  if (tag === 'b' || tag === 'strong' || tag === 'th') {
    return true;
  }
  const inlineStyle = el.getAttribute('style') || '';
  const classAttr = el.getAttribute('class') || '';
  const lowerStyle = inlineStyle.toLowerCase();
  const lowerClass = classAttr.toLowerCase();

  return (
    lowerStyle.includes('font-weight: bold') ||
    lowerStyle.includes('font-weight:bold') ||
    lowerStyle.includes('font-weight:700') ||
    lowerStyle.includes('font-weight: 700') ||
    lowerStyle.includes('font-weight:800') ||
    lowerStyle.includes('font-weight: 800') ||
    lowerStyle.includes('font-weight:900') ||
    lowerStyle.includes('font-weight: 900') ||
    lowerClass.includes('font-bold') ||
    lowerClass.includes('font-semibold')
  );
};

const hasBoldAncestorOrSelf = (element: Element): boolean => {
  let curr: Element | null = element;
  while (curr) {
    if (isElementBold(curr)) {
      return true;
    }
    const tag = curr.tagName.toLowerCase();
    if (tag === 'body' || tag === 'html') {
      break;
    }
    curr = curr.parentElement;
  }
  return false;
};

const extractDatesFromHtml = (htmlContent: string | null | undefined): ExtractedDates => {
  if (!htmlContent) return { startDate: null, lastDate: null };
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    let startDate: string | null = null;
    let lastDate: string | null = null;

    const startKeywords = [
      /apply\s*online\s*(?:start|begin|date)/i,
      /application\s*(?:begin|start|commencement|open|from|opening)/i,
      /registration\s*(?:begin|start|date|open|from)/i,
      /starting\s*date/i,
      /form\s*(?:begin|start|from|open)/i,
      /notification\s*(?:date|release|issued)/i,
      /apply\s*(?:date|start|begin|from)/i,
      /begin\s*date/i,
      /opening\s*date/i,
      /commencement\s*date/i,
      /start\s*date/i,
      /शुरुआती\s*तारीख/i,
      /प्रारंभिक\s*तिथि/i,
      /प्रारम्भिक\s*तिथि/i,
      /आवेदन\s*(?:शुरू|प्रारंभ|आरंभ|तिथि|शुरु|प्रारम्भ)/i,
      /रजिस्ट्रेशन\s*(?:शुरू|प्रारंभ|आरंभ|तिथि|शुरु|प्रारम्भ)/i,
      /प्रारम्भ\s*की\s*तिथि/i,
      /शुरू\s*होने\s*की\s*तिथि/i,
      /प्रारंभ\s*होने\s*की\s*तिथि/i,
    ];

    const lastKeywords = [
      /last\s*date\s*for\s*(?:apply|online|registration|submission|form|applying|submit)/i,
      /last\s*date\s*to\s*(?:apply|register|submit|fill|complete)/i,
      /online\s*application\s*(?:end|close|last|expiry)/i,
      /registration\s*(?:last|end|close)\s*date/i,
      /apply\s*last\s*date/i,
      /application\s*last\s*date/i,
      /last\s*date/i,
      /closing\s*date/i,
      /end\s*date/i,
      /expiry\s*date/i,
      /आवेदन\s*की\s*(?:अंतिम|अन्तिम|आखिरी|आखरी)\s*तिथि/i,
      /रजिस्ट्रेशन\s*की\s*(?:अंतिम|अन्तिम|आखिरी|आखरी)\s*तिथि/i,
      /(?:अंतिम|अन्तिम|आखिरी|आखरी)\s*तिथि/i,
      /(?:अंतिम|अन्तिम|आखिरी|आखरी)\s*तारीख/i,
      /समाप्ति\s*तिथि/i,
    ];

    // Priority 1: Multi-column or adjacent column row search
    const rows = Array.from(doc.querySelectorAll('tr'));
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td, th'));
      if (cells.length >= 2) {
        for (let i = 0; i < cells.length; i++) {
          const cellText = cleanText(cells[i].textContent || '');
          if (!cellText) continue;

          // Check for startDate keyword
          if (!startDate && startKeywords.some(kw => kw.test(cellText))) {
            const matchedKw = startKeywords.find(kw => kw.test(cellText));
            if (matchedKw) {
              const matchResults = cellText.match(matchedKw);
              if (matchResults) {
                const index = cellText.toLowerCase().indexOf(matchResults[0].toLowerCase());
                const potentialDateText = cellText.substring(index + matchResults[0].length);
                const extracted = extractDateText(potentialDateText);
                if (extracted) {
                  startDate = extracted;
                }
              }
            }

            // If not found in the same cell, check subsequent cells in this row
            if (!startDate) {
              for (let j = i + 1; j < cells.length; j++) {
                const nextText = cleanText(cells[j].textContent || '');
                if (!nextText) continue;
                if (/^[:\-–—\s]+$/.test(nextText)) continue;
                const extracted = extractDateText(nextText);
                if (extracted) {
                  startDate = extracted;
                  break;
                }
              }
            }
          }

          // Check for lastDate keyword
          if (!lastDate && lastKeywords.some(kw => kw.test(cellText))) {
            const matchedKw = lastKeywords.find(kw => kw.test(cellText));
            if (matchedKw) {
              const matchResults = cellText.match(matchedKw);
              if (matchResults) {
                const index = cellText.toLowerCase().indexOf(matchResults[0].toLowerCase());
                const potentialDateText = cellText.substring(index + matchResults[0].length);
                const extracted = extractDateText(potentialDateText);
                if (extracted) {
                  lastDate = extracted;
                }
              }
            }

            // If not found in the same cell, check subsequent cells in this row
            if (!lastDate) {
              for (let j = i + 1; j < cells.length; j++) {
                const nextText = cleanText(cells[j].textContent || '');
                if (!nextText) continue;
                if (/^[:\-–—\s]+$/.test(nextText)) continue;
                const extracted = extractDateText(nextText);
                if (extracted) {
                  lastDate = extracted;
                  break;
                }
              }
            }
          }
        }
      }
    }

    // Priority 2: Text matching in individual blocks
    const elements = Array.from(doc.querySelectorAll('td, th, p, li, span, div, b, strong'));
    for (const el of elements) {
      const text = cleanText(el.textContent || '');
      if (!text || text.length > 200) continue;

      if (!startDate) {
        for (const kw of startKeywords) {
          if (kw.test(text)) {
            const matchKw = text.match(kw);
            if (matchKw) {
              const index = text.toLowerCase().indexOf(matchKw[0].toLowerCase());
              if (index !== -1) {
                const afterText = text.substring(index + matchKw[0].length);
                const extracted = extractDateText(afterText);
                if (extracted) {
                  startDate = extracted;
                  break;
                }
              }
            }
          }
        }
      }

      if (!lastDate) {
        for (const kw of lastKeywords) {
          if (kw.test(text)) {
            const matchKw = text.match(kw);
            if (matchKw) {
              const index = text.toLowerCase().indexOf(matchKw[0].toLowerCase());
              if (index !== -1) {
                const afterText = text.substring(index + matchKw[0].length);
                const extracted = extractDateText(afterText);
                if (extracted) {
                  lastDate = extracted;
                  break;
                }
              }
            }
          }
        }
      }
    }

    // Fallback Scan Layer 1: If lastDate is STILL not found, scan specifically for elements that are BOTH RED and BOLD
    if (!lastDate) {
      try {
        const allDocElements = Array.from(doc.querySelectorAll('td, th, p, li, span, div, b, strong, font'));
        for (const el of allDocElements) {
          const text = cleanText(el.textContent || '');
          if (text && text.length > 5 && text.length < 80) {
            const dateMatch = extractDateText(text);
            if (dateMatch) {
              const lowerText = text.toLowerCase();
              const hasStartKeyword = /start|begin|commence|शुरू|प्रारंभ|आरंभ|शुरु|प्रारम्भ/i.test(lowerText);
              if (!hasStartKeyword) {
                if (hasRedAncestorOrSelf(el) && hasBoldAncestorOrSelf(el)) {
                  lastDate = dateMatch;
                  break; // Found our red & bold lastDate fallback!
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Error in fallback red & bold lastDate extraction:", e);
      }
    }

    // Fallback Scan Layer 2: If lastDate is STILL not found, scan specifically for elements colored RED (even if not bold)
    if (!lastDate) {
      try {
        const allDocElements = Array.from(doc.querySelectorAll('td, th, p, li, span, div, b, strong, font'));
        for (const el of allDocElements) {
          const text = cleanText(el.textContent || '');
          if (text && text.length > 5 && text.length < 80) {
            const dateMatch = extractDateText(text);
            if (dateMatch) {
              const lowerText = text.toLowerCase();
              const hasStartKeyword = /start|begin|commence|शुरू|प्रारंभ|आरंभ|शुरु|प्रारम्भ/i.test(lowerText);
              if (!hasStartKeyword) {
                if (hasRedAncestorOrSelf(el)) {
                  lastDate = dateMatch;
                  break; // Found our red lastDate fallback!
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Error in fallback red lastDate extraction:", e);
      }
    }

    // Fallback Scan Layer 1 (Start Date): If startDate is STILL not found, scan for elements that are BOTH RED and BOLD
    if (!startDate) {
      try {
        const allDocElements = Array.from(doc.querySelectorAll('td, th, p, li, span, div, b, strong, font'));
        for (const el of allDocElements) {
          const text = cleanText(el.textContent || '');
          if (text && text.length > 5 && text.length < 80) {
            const dateMatch = extractDateText(text);
            if (dateMatch) {
              const lowerText = text.toLowerCase();
              const hasStartKeyword = /start|begin|commence|शुरू|प्रारंभ|आरंभ|शुरु|प्रारम्भ/i.test(lowerText);
              if (hasStartKeyword) {
                if (hasRedAncestorOrSelf(el) && hasBoldAncestorOrSelf(el)) {
                  startDate = dateMatch;
                  break; // Found our red & bold startDate fallback!
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Error in fallback red & bold startDate extraction:", e);
      }
    }

    // Fallback Scan Layer 2 (Start Date): If startDate is STILL not found, scan for elements colored RED representing start date
    if (!startDate) {
      try {
        const allDocElements = Array.from(doc.querySelectorAll('td, th, p, li, span, div, b, strong, font'));
        for (const el of allDocElements) {
          const text = cleanText(el.textContent || '');
          if (text && text.length > 5 && text.length < 80) {
            const dateMatch = extractDateText(text);
            if (dateMatch) {
              const lowerText = text.toLowerCase();
              const hasStartKeyword = /start|begin|commence|शुरू|प्रारंभ|आरंभ|शुरु|प्रारम्भ/i.test(lowerText);
              if (hasStartKeyword) {
                if (hasRedAncestorOrSelf(el)) {
                  startDate = dateMatch;
                  break; // Found our red startDate fallback!
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Error in fallback red startDate extraction:", e);
      }
    }

    return { startDate, lastDate };
  } catch (err) {
    console.error("Error extracting dates from HTML:", err);
    return { startDate: null, lastDate: null };
  }
};

const parseCleanDate = (cleanStr: string | null | undefined): Date | null => {
  if (!cleanStr) return null;
  
  let s = cleanStr.toLowerCase().trim();
  s = s.replace(/\|/g, ' ');
  
  const hindiToEnglishMonths: Record<string, string> = {
    'जनवरी': 'january',
    'फ़रवरी': 'february',
    'फरवरी': 'february',
    'मार्च': 'march',
    'अप्रैल': 'april',
    'मई': 'may',
    'जून': 'june',
    'जुलाई': 'july',
    'अगस्त': 'august',
    'सितंबर': 'september',
    'सितम्बर': 'september',
    'अक्टूबर': 'october',
    'अक्तूबर': 'october',
    'नवंबर': 'november',
    'नवम्बर': 'november',
    'दिसंबर': 'december',
    'दिसम्बर': 'december'
  };

  for (const [hindi, english] of Object.entries(hindiToEnglishMonths)) {
    if (s.includes(hindi)) {
      s = s.replace(new RegExp(hindi, 'g'), english);
    }
  }

  // Handle formats like: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = s.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})\b/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed month
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) {
      year += 2000;
    }
    const parsedDate = new Date(year, month, day);
    if (!isNaN(parsedDate.getTime())) {
      parsedDate.setHours(23, 59, 59, 999);
      return parsedDate;
    }
  }

  // Support suffix matching, e.g. "31st May" -> "31 May"
  s = s.replace(/\b(\d{1,2})(?:st|nd|rd|th)\b/g, '$1');

  // Strip non-standard characters from start/end before parsing to help standard new Date()
  // eslint-disable-next-line no-misleading-character-class
  let cleanAlpha = s.replace(/^[:\-–—\s\u200b•|ः।●]+/, '').replace(/[:\-–—\s|ः।●]+$/, '').trim();
  
  // Extract pure date substring if there is trailing noise like "(until 11:00 PM)"
  const matchAlpha = cleanAlpha.match(/\b\d{1,2}[\s./-]*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s./-]*\d{2,4}\b/i);
  if (matchAlpha) {
    cleanAlpha = matchAlpha[0];
  } else {
    const matchAlphaRev = cleanAlpha.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s./-]*\d{1,2}[\s./-]*\d{2,4}\b/i);
    if (matchAlphaRev) {
      cleanAlpha = matchAlphaRev[0];
    }
  }

  const tryStandard = new Date(cleanAlpha);
  if (!isNaN(tryStandard.getTime())) {
    tryStandard.setHours(23, 59, 59, 999);
    return tryStandard;
  }

  return null;
};

const PostDatesDisplay = ({ post, searchQuery = '', startDateFilter = '', lastDateFilter = '' }: { post: any; searchQuery?: string; startDateFilter?: string; lastDateFilter?: string }) => {
  const [loading, setLoading] = useState(false);
  const [dates, setDates] = useState<ExtractedDates>({ startDate: null, lastDate: null });

  useEffect(() => {
    const hasHtml = (post.tables_html && post.tables_html.length > 5) || (post.tables_html_hi && post.tables_html_hi.length > 5);
    if (hasHtml) {
      const enDates = extractDatesFromHtml(post.tables_html);
      const hiDates = extractDatesFromHtml(post.tables_html_hi);
      setDates({
        startDate: enDates.startDate || hiDates.startDate,
        lastDate: enDates.lastDate || hiDates.lastDate,
      });
      return;
    }

    setLoading(true);
    getPostBySlug(post.slug || post.id)
      .then((fullPost) => {
        if (fullPost) {
          const enDates = extractDatesFromHtml(fullPost.tables_html);
          const hiDates = extractDatesFromHtml(fullPost.tables_html_hi);
          setDates({
            startDate: enDates.startDate || hiDates.startDate,
            lastDate: enDates.lastDate || hiDates.lastDate,
          });
        }
      })
      .catch(err => {
        console.error("Error fetching full post for dates display:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [post]);

  const { startDate, lastDate } = dates;
  const enteredLastDate = post.last_date_text || post.last_date_text_hi;

  if (loading) {
    return (
      <div className="flex gap-2 mt-1.5 text-xs text-muted-foreground animate-pulse items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
        <span>Extracting exact dates...</span>
      </div>
    );
  }

  if (!startDate && !lastDate && !enteredLastDate) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-1.5 font-sans">
      {startDate && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 rounded text-[11px] font-bold">
          <span className="w-1 h-1 rounded-full bg-green-500" />
          <span>Apply Start: {highlightAllMatches(startDate, searchQuery, startDateFilter, lastDateFilter)}</span>
        </div>
      )}
      {lastDate && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 rounded text-[11px] font-bold">
          <span className="w-1 h-1 rounded-full bg-red-500" />
          <span>Last Date (Extracted): {highlightAllMatches(lastDate, searchQuery, startDateFilter, lastDateFilter)}</span>
        </div>
      )}
      {enteredLastDate && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded text-[11px] font-bold">
          <span className="w-1 h-1 rounded-full bg-blue-500" />
          <span>Last Date Box: {highlightAllMatches(enteredLastDate, searchQuery, startDateFilter, lastDateFilter)}</span>
        </div>
      )}
    </div>
  );
};

// ============ POSTS TAB (with search + category filter + date) ============
const getDateMatchingRegexp = (dateStr: string): RegExp | null => {
  if (!dateStr) return null;
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = day.toString();
    const dd = day < 10 ? '0' + day : day.toString();
    const m = month.toString();
    const mm = month < 10 ? '0' + month : month.toString();
    const yyyy = year.toString();
    const yy = year.toString().substring(2);

    const monthsEngLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthsEngShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthsHindi = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
    const alternateMonthsHindi: Record<number, string[]> = {
      1: ["फरवरी"],
      8: ["सितम्बर"],
      9: ["अक्तूबर"],
      10: ["नवम्बर"],
      11: ["दिसम्बर"]
    };

    const engLong = monthsEngLong[month - 1];
    const engShort = monthsEngShort[month - 1];
    const hindi = monthsHindi[month - 1];

    const regexPieces: string[] = [];

    // 1. Numeric matches (e.g. 7/6/2026, 07-06-2026, 7.6.26)
    regexPieces.push(`\\b0?${d}[./-]0?${m}[./-]${yyyy}\\b`);
    regexPieces.push(`\\b0?${d}[./-]0?${m}[./-]${yy}\\b`);

    // 2. Word matches
    const suffixPattern = "(?:st|nd|rd|th)?";
    const mNames = [engLong, engShort, hindi];
    const altHindi = alternateMonthsHindi[month - 1];
    if (altHindi) {
      mNames.push(...altHindi);
    }

    mNames.forEach(mName => {
      // Day space/dash Month space/dash Year
      regexPieces.push(`\\b0?${d}${suffixPattern}\\s*[./-]?\\s*${mName}\\s*[./-]?\\s*${yyyy}\\b`);
      regexPieces.push(`\\b0?${d}${suffixPattern}\\s*[./-]?\\s*${mName}\\s*[./-]?\\s*${yy}\\b`);
      
      // Month space Day comma Year (e.g. June 7, 2026 or June 07 2026)
      regexPieces.push(`\\b${mName}\\s+0?${d}${suffixPattern}\\s*,?\\s*${yyyy}\\b`);
      regexPieces.push(`\\b${mName}\\s+0?${d}${suffixPattern}\\s*,?\\s*${yy}\\b`);
      
      // Standalone Month Day or Day Month
      regexPieces.push(`\\b0?${d}${suffixPattern}\\s+${mName}\\b`);
      regexPieces.push(`\\b${mName}\\s+0?${d}${suffixPattern}\\b`);
    });

    // Replace standard word boundary \b with unicode compatibility checks for Hindi characters
    const normalizedPieces = regexPieces.map(piece => {
      if (/[\u0900-\u097F]/.test(piece)) {
        return piece.replace(/\\b/g, '(?:^|[^a-zA-Z0-9\\u0900-\\u097F])');
      }
      return piece;
    });

    return new RegExp(`(${normalizedPieces.join('|')})`, 'gi');
  } catch (e) {
    console.error("Error building date regex", e);
    return null;
  }
};

const highlightAllMatches = (text: string, search: string, startFilterDate: string, lastFilterDate: string) => {
  if (!text) return '';
  
  const matchers: { regex: RegExp; className: string }[] = [];
  
  if (search && search.trim()) {
    const escapedSearch = search.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    matchers.push({
      regex: new RegExp(`(${escapedSearch})`, 'gi'),
      className: "bg-yellow-250 dark:bg-yellow-600/40 text-yellow-950 dark:text-yellow-105 px-0.5 rounded shadow-sm font-bold animate-pulse"
    });
  }
  
  if (startFilterDate) {
    const rStart = getDateMatchingRegexp(startFilterDate);
    if (rStart) {
      matchers.push({
        regex: rStart,
        className: "bg-green-150 dark:bg-green-700/40 text-green-950 dark:text-green-105 border border-green-300 font-extrabold shadow"
      });
    }
  }
  
  if (lastFilterDate) {
    const rLast = getDateMatchingRegexp(lastFilterDate);
    if (rLast) {
      matchers.push({
        regex: rLast,
        className: "bg-red-155 dark:bg-red-700/40 text-red-950 dark:text-red-105 border border-red-300 font-extrabold shadow"
      });
    }
  }
  
  if (matchers.length === 0) return text;
  
  interface MatchInterval {
    start: number;
    end: number;
    className: string;
    text: string;
  }
  
  const matches: MatchInterval[] = [];
  
  matchers.forEach(m => {
    let match;
    m.regex.lastIndex = 0;
    const globalRegex = new RegExp(m.regex.source, m.regex.flags.includes('g') ? m.regex.flags : m.regex.flags + 'g');
    while ((match = globalRegex.exec(text)) !== null) {
      if (match[0].length === 0) break;
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        className: m.className,
        text: match[0]
      });
    }
  });
  
  if (matches.length === 0) return text;
  
  matches.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return (b.end - b.start) - (a.end - a.start);
  });
  
  const nonOverlapping: MatchInterval[] = [];
  let currentEnd = 0;
  
  matches.forEach(m => {
    if (m.start >= currentEnd) {
      nonOverlapping.push(m);
      currentEnd = m.end;
    }
  });
  
  if (nonOverlapping.length === 0) return text;
  
  const elements: any[] = [];
  let lastIndex = 0;
  
  nonOverlapping.forEach((m, idx) => {
    if (m.start > lastIndex) {
      elements.push(text.substring(lastIndex, m.start));
    }
    elements.push(
      <mark key={`hl-${idx}`} className={`${m.className} px-1 rounded`}>
        {text.substring(m.start, m.end)}
      </mark>
    );
    lastIndex = m.end;
  });
  
  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }
  
  return <>{elements}</>;
};

const highlightMatchedText = (text: string, search: string) => {
  return highlightAllMatches(text, search, '', '');
};

const isDateMatched = (filterDate: string, targetDateStr: string | null | undefined): boolean => {
  if (!filterDate) return true;
  if (!targetDateStr) return false;
  const regex = getDateMatchingRegexp(filterDate);
  if (regex && regex.test(targetDateStr)) {
    return true;
  }
  const parsedTarget = parseCleanDate(targetDateStr);
  if (parsedTarget) {
    try {
      const [y, m, d] = filterDate.split('-').map(Number);
      return parsedTarget.getFullYear() === y && (parsedTarget.getMonth() + 1) === m && parsedTarget.getDate() === d;
    } catch (e) {
      return false;
    }
  }
  return false;
};

const PostsTab = ({ posts, categoryLinks, onDelete, navigate, categories, formatDate }: { posts: any[]; categoryLinks: any[]; onDelete: (id: string) => void; navigate: (path: string) => void; categories: any[]; formatDate: (d: string) => string }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [lastDateFilter, setLastDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(30);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(-1);

  // Reset page when filtering or searching to prevent landing on empty pages
  useEffect(() => {
    setCurrentPage(1);
    if (searchQuery || startDateFilter || lastDateFilter) {
      setActiveMatchIndex(0);
    } else {
      setActiveMatchIndex(-1);
    }
  }, [searchQuery, filterCat, startDateFilter, lastDateFilter]);

  // Pre-compute O(1) categorization map to reduce complexity from O(P * L) to O(P + L)
  const postSlugToLinksMap = useMemo(() => {
    const map = new Map<string, any[]>();
    categoryLinks.forEach(l => {
      if (!l.url) return;
      const match = l.url.match(/\/post\/(.+)/);
      const linkSlug = match ? match[1] : null;
      if (linkSlug) {
        if (!map.has(linkSlug)) {
          map.set(linkSlug, []);
        }
        map.get(linkSlug)!.push(l);
      }
    });
    return map;
  }, [categoryLinks]);

  // Pre-compute O(1) categories Map for category names
  const categoriesMap = useMemo(() => {
    const map = new Map<string, any>();
    categories.forEach(c => map.set(c.id, c));
    return map;
  }, [categories]);

  let filteredPosts = posts;

  if (searchQuery) {
    filteredPosts = filteredPosts.filter(p => {
      const nameMatch = p.name_of_post?.toLowerCase().includes(searchQuery.toLowerCase());
      const dateMatch = p.post_date?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const slug = p.slug || p.id;
      const links = postSlugToLinksMap.get(slug) || [];
      const linkMatch = links.some((link: any) => {
        const cat = categoriesMap.get(link.category_id);
        const catName = cat ? cat.name : '';
        return (link.title && link.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
               (catName && catName.toLowerCase().includes(searchQuery.toLowerCase()));
      });
      
      return nameMatch || dateMatch || linkMatch;
    });
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

  if (startDateFilter || lastDateFilter) {
    filteredPosts = filteredPosts.filter(p => {
      const enDates = extractDatesFromHtml(p.tables_html);
      const hiDates = extractDatesFromHtml(p.tables_html_hi);
      const pStart = enDates.startDate || hiDates.startDate;
      const pLast = enDates.lastDate || hiDates.lastDate;
      const pEntered = p.last_date_text || p.last_date_text_hi;

      const isStartMatched = startDateFilter ? isDateMatched(startDateFilter, pStart) : true;
      const isLastMatched = lastDateFilter ? (isDateMatched(lastDateFilter, pLast) || isDateMatched(lastDateFilter, pEntered)) : true;

      return isStartMatched && isLastMatched;
    });
  }

  const handleNextMatch = () => {
    if (filteredPosts.length === 0) return;
    setActiveMatchIndex(prev => {
      const nextIdx = (prev + 1) % filteredPosts.length;
      return nextIdx;
    });
  };

  const handlePrevMatch = () => {
    if (filteredPosts.length === 0) return;
    setActiveMatchIndex(prev => {
      const prevIdx = (prev - 1 + filteredPosts.length) % filteredPosts.length;
      return prevIdx;
    });
  };

  // Scroll active matching post card into view smoothly (and change page if needed)
  useEffect(() => {
    if (activeMatchIndex >= 0 && activeMatchIndex < filteredPosts.length) {
      const activePost = filteredPosts[activeMatchIndex];
      if (activePost) {
        if (itemsPerPage !== 'all') {
          const targetPage = Math.floor(activeMatchIndex / (itemsPerPage as number)) + 1;
          if (currentPage !== targetPage) {
            setCurrentPage(targetPage);
            return; // Let the page transition render the DOM, then subsequent triggers will handle scrolling
          }
        }

        const timer = setTimeout(() => {
          const el = document.getElementById(`post-card-${activePost.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 80);
        return () => clearTimeout(timer);
      }
    }
  }, [activeMatchIndex, currentPage, itemsPerPage, filteredPosts]);

  // Paginate posts list to prevent heavy browser DOM rendering lag
  const limitValue = itemsPerPage === 'all' ? filteredPosts.length : itemsPerPage;
  const totalPages = Math.ceil(filteredPosts.length / (limitValue || 1));
  const paginatedPosts = useMemo(() => {
    if (itemsPerPage === 'all') return filteredPosts;
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredPosts.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredPosts, currentPage, itemsPerPage]);

  return (
    <div className="bg-background rounded-2xl p-6" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-30 bg-background -mx-6 px-6 -mt-6 pt-6 pb-4 border-b-2 border-dashed border-slate-300 rounded-t-2xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-primary">Posts</h2>
          <Button onClick={() => window.open('/admin/post/new', '_blank')}>+ Create New Post</Button>
        </div>
        <div className="mb-4 flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[250px]">
            <div className="w-full max-w-md bg-background rounded-full p-1 border border-border flex items-center" style={{ boxShadow: '2px 2px 6px rgba(0,0,0,0.1)' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) {
                      handlePrevMatch();
                    } else {
                      handleNextMatch();
                    }
                  }
                }}
                placeholder="Search posts (Enter for next, Shift+Enter for prev)..."
                className="flex-1 border-none outline-none py-1.5 px-2.5 rounded-full text-sm bg-transparent"
              />
              <button className="w-8 h-8 rounded-full border-none cursor-pointer flex items-center justify-center bg-background active:scale-90 transition-all duration-100 hover:bg-slate-100 dark:hover:bg-slate-800" style={{ boxShadow: '1px 1px 4px rgba(0,0,0,0.1)' }}>
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
              className="px-3 py-2 border border-border rounded-lg bg-background text-primary text-sm font-medium"
            >
              <option value="all">All Posts</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-base font-bold text-emerald-700 dark:text-emerald-400 block mb-1">📅 Apply Start Date</label>
            <input
              type="date"
              value={startDateFilter}
              onChange={e => setStartDateFilter(e.target.value)}
              className="px-3 py-1.5 border border-emerald-300 rounded-lg bg-background text-emerald-950 dark:text-emerald-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
            />
          </div>
          <div>
            <label className="text-base font-bold text-rose-700 dark:text-rose-400 block mb-1">📅 Last Date / Box</label>
            <input
              type="date"
              value={lastDateFilter}
              onChange={e => setLastDateFilter(e.target.value)}
              className="px-3 py-1.5 border border-rose-300 rounded-lg bg-background text-rose-950 dark:text-rose-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 font-medium"
            />
          </div>
          <div>
            <label className="text-base font-bold text-primary block mb-1">Display Mode</label>
            <select
              value={itemsPerPage}
              onChange={e => {
                const val = e.target.value;
                setItemsPerPage(val === 'all' ? 'all' : Number(val));
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-border rounded-lg bg-background text-primary text-sm"
            >
              <option value={30}>30 Posts (Fast)</option>
              <option value={100}>100 Posts</option>
              <option value={300}>300 Posts</option>
              <option value="all">Show All (Ctrl+F Friendly)</option>
            </select>
          </div>
        </div>
        {(searchQuery || filterCat !== 'all' || startDateFilter || lastDateFilter) && (
          <div className="mb-0 flex items-center justify-between gap-2 flex-wrap bg-slate-100/50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-dashed border-slate-300">
            <div className="flex items-center gap-3 flex-wrap">
              {searchQuery && <span className="text-sm text-muted-foreground">Search: <strong className="text-primary">"{searchQuery}"</strong></span>}
              {filterCat !== 'all' && <span className="text-sm text-muted-foreground">Category: <strong className="text-primary">{categoriesMap.get(filterCat)?.name}</strong></span>}
              {startDateFilter && <span className="text-sm text-muted-foreground">Start Date: <strong className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-200">{startDateFilter}</strong></span>}
              {lastDateFilter && <span className="text-sm text-muted-foreground">Last Date: <strong className="text-rose-700 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded border border-rose-200">{lastDateFilter}</strong></span>}
              <span className="text-xs bg-yellow-105 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200 font-bold px-2.5 py-1 rounded-md inline-flex items-center gap-1 border border-yellow-200">
                📊 Matched Posts: {filteredPosts.length}
              </span>
              {(searchQuery || startDateFilter || lastDateFilter) && filteredPosts.length > 0 && (
                <div className="inline-flex items-center gap-1 bg-yellow-100/80 dark:bg-yellow-950/40 p-1 rounded-lg border border-yellow-300 shadow-sm ml-1 select-none">
                  <span className="text-xs text-yellow-900 dark:text-yellow-200 font-bold px-2 font-mono">
                    Focus: {activeMatchIndex + 1} of {filteredPosts.length}
                  </span>
                  <button
                    type="button"
                    onClick={handlePrevMatch}
                    title="Previous match (Up)"
                    className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs bg-white dark:bg-slate-800 border border-slate-200 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-90 transition-all duration-100"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMatch}
                    title="Next match (Down)"
                    className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs bg-white dark:bg-slate-800 border border-slate-200 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-90 transition-all duration-100"
                  >
                    ↓
                  </button>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setFilterCat('all'); setStartDateFilter(''); setLastDateFilter(''); }}>Clear Filters</Button>
          </div>
        )}
      </div>
      <div className="space-y-4 mt-6">
        {paginatedPosts.map((post, idx) => {
          const absoluteIndex = itemsPerPage === 'all' ? idx : (currentPage - 1) * itemsPerPage + idx;
          const isCurrentlyActiveMatch = activeMatchIndex === absoluteIndex;
          return (
            <div
              key={post.id}
              id={`post-card-${post.id}`}
              className={`border-b-2 border-dashed border-slate-300 pb-4 last:border-b-0 last:pb-0 transition-all duration-300 ${
                isCurrentlyActiveMatch
                  ? 'ring-4 ring-yellow-400 dark:ring-yellow-500/80 rounded-xl p-2 bg-yellow-50/50 dark:bg-yellow-950/20 scale-[1.015] shadow-md border-indigo-400'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-bold text-primary text-base">
                      {highlightMatchedText(post.name_of_post || '', searchQuery)}
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">{post.post_date}</div>
                    <PostDatesDisplay post={post} searchQuery={searchQuery} startDateFilter={startDateFilter} lastDateFilter={lastDateFilter} />
                    {(() => {
                      const slug = post.slug || post.id;
                      const links = postSlugToLinksMap.get(slug) || [];
                      if (links.length > 0) {
                        return (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {links.map((link: any, i: number) => {
                              const cat = categoriesMap.get(link.category_id);
                              const catName = cat ? cat.name : 'Unknown';
                              return (
                                <span key={i} className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-bold">
                                  Linked in: {highlightMatchedText(catName, searchQuery)} ({highlightMatchedText(link.title || '', searchQuery)})
                                </span>
                              );
                            })}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(`/admin/post/${post.id}`, '_blank')}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={async () => {
                     const overlay = document.createElement('div');
                     overlay.innerText = 'Preparing Preview...';
                     Object.assign(overlay.style, { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, fontSize: '24px', fontWeight: 'bold' });
                     document.body.appendChild(overlay);
                     try {
                       const fullPost = await getPostBySlug(post.slug || post.id);
                       if (fullPost) {
                         const { savePreviewData } = await import('@/lib/previewDb');
                         try { await savePreviewData(JSON.parse(JSON.stringify(fullPost))); } catch(e) { console.error('Preview error', e); }
                         localStorage.setItem('preview_post_slug', post.slug || post.id);
                          try { localStorage.setItem('preview_post_data', JSON.stringify(fullPost)); } catch (e) { console.warn('Failed to set localStorage fallback preview:', e); }
                       }
                     } finally {
                       document.body.removeChild(overlay);
                       window.open(`/post/${encodeURIComponent(post.slug || post.id)}?preview=true`, '_blank');
                     }
                  }}>Preview</Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(post.id)}>Delete</Button>
                </div>
              </div>
            </div>
          );
        })}
        {filteredPosts.length === 0 && <p className="text-muted-foreground text-center py-8 border-b-2 border-dashed border-slate-300 pb-4">{(searchQuery || filterCat !== 'all') ? 'No posts found.' : 'No posts yet. Create one!'}</p>}
      </div>

      {/* Pagination Controls */}
      {itemsPerPage === 'all' ? (
        <div className="mt-6 border-t border-dashed border-slate-300 pt-4 flex justify-between items-center text-sm text-muted-foreground">
          <span>Showing all {filteredPosts.length} posts. Browser search (Ctrl+F) will now find any of these posts instantly.</span>
        </div>
      ) : (
        totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-dashed border-slate-300 pt-4 flex-wrap gap-4">
            <span className="text-sm text-muted-foreground">
              Showing {Math.min(filteredPosts.length, (currentPage - 1) * (itemsPerPage as number) + 1)}-{Math.min(filteredPosts.length, currentPage * (itemsPerPage as number))} of {filteredPosts.length} posts
            </span>
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="px-3 py-1.5 text-sm bg-secondary text-primary font-bold rounded">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
};

// ============ FORMS ============
const AddLinkForm = ({ categoryId, onAdd }: { categoryId: string; onAdd: (catId: string, title: string, url: string, isNew: boolean, lastDate: string) => void | Promise<void> }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [lastDate, setLastDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Link Title" value={title} onChange={e => setTitle(e.target.value)} className="flex-1 min-w-[200px]" disabled={isSaving} />
        <Input placeholder="URL (e.g. /post/id)" value={url} onChange={e => setUrl(e.target.value)} className="flex-1 min-w-[200px]" disabled={isSaving} />
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <label className="flex items-center gap-1 text-base text-primary cursor-pointer">
          <input type="checkbox" checked={isNew} onChange={e => setIsNew(e.target.checked)} disabled={isSaving} />
          Mark as New
        </label>
        <Input placeholder="Last Date / Extended (optional)" value={lastDate} onChange={e => setLastDate(e.target.value)} className="flex-1 min-w-[200px]" disabled={isSaving} />
        <Button disabled={isSaving} onClick={async () => { if (title && !isSaving) { setIsSaving(true); try { await onAdd(categoryId, title, url, isNew, lastDate); setTitle(''); setUrl(''); setIsNew(false); setLastDate(''); } finally { setIsSaving(false); } } }}>{isSaving ? 'Adding...' : 'Add'}</Button>
      </div>
    </div>
  );
};

const AddCategoryForm = ({ onAdd }: { onAdd: (name: string) => void | Promise<void> }) => {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  return (
    <div className="flex gap-2 mb-4">
      <Input placeholder="New Category Name (e.g. Scholarship)" value={name} onChange={e => setName(e.target.value)} className="flex-1" disabled={isSaving} />
      <Button disabled={isSaving} onClick={async () => { if (name.trim() && !isSaving) { setIsSaving(true); try { await onAdd(name.trim()); setName(''); } finally { setIsSaving(false); } } }}>{isSaving ? 'Adding...' : '+ Add Category'}</Button>
    </div>
  );
};

const AddTabletForm = ({ onAdd }: { onAdd: (title: string, subtitle: string, url: string) => Promise<void> }) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [url, setUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  return (
    <div className="flex gap-2 flex-wrap">
      <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="flex-1 min-w-[150px]" disabled={isSaving} />
      <Input placeholder="Subtitle" value={subtitle} onChange={e => setSubtitle(e.target.value)} className="flex-1 min-w-[150px]" disabled={isSaving} />
      <Input placeholder="URL" value={url} onChange={e => setUrl(e.target.value)} className="flex-1 min-w-[150px]" disabled={isSaving} />
      <Button disabled={isSaving} onClick={async () => { if (title && !isSaving) { setIsSaving(true); try { await onAdd(title, subtitle, url); setTitle(''); setSubtitle(''); setUrl(''); } finally { setIsSaving(false); } } }}>{isSaving ? 'Adding...' : 'Add'}</Button>
    </div>
  );
};

export default AdminDashboard;
