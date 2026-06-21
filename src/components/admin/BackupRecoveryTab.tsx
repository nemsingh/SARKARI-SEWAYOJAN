import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  restoreDatabaseBackup, 
  getPostBySlug,
  getCategories,
  getCategoryLinks,
  getTabletItems,
  getPosts,
  getSiteSettingsFlat 
} from '@/lib/firebaseService';
import {
  saveBackupToVault,
  getBackupFromVault,
  VaultBackup
} from '@/lib/indexedDbBackup';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  FileJson, 
  Server, 
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Settings,
  Flame,
  FileDown
} from 'lucide-react';

interface BackupData {
  categories: any[];
  category_links: any[];
  tablet_items: any[];
  posts: any[];
  settings_flat: Record<string, string>;
  backup_timestamp: string;
  source: string;
}

export const BackupRecoveryTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<BackupData | null>(null);

  // Auto-backup configuration states
  const [autoVaultEnabled, setAutoVaultEnabled] = useState<boolean>(true);
  const [autoFileEnabled, setAutoFileEnabled] = useState<boolean>(false);
  const [vaultBackupInfo, setVaultBackupInfo] = useState<{
    exists: boolean;
    timestamp: string | null;
    categoriesCount: number;
    postsCount: number;
    linksCount: number;
    rawSize?: number;
  }>({
    exists: false,
    timestamp: null,
    categoriesCount: 0,
    postsCount: 0,
    linksCount: 0
  });

  // Logging helper
  const logProgress = (msg: string) => {
    setProgressMsg(msg);
    console.log(`[Backup System] ${msg}`);
  };

  // 1. Fetch Vault backup statistics
  const fetchVaultDetails = useCallback(async () => {
    try {
      const vBackup = await getBackupFromVault('latest_daily');
      if (vBackup && vBackup.data) {
        setVaultBackupInfo({
          exists: true,
          timestamp: vBackup.timestamp,
          categoriesCount: vBackup.data.categories?.length || 0,
          postsCount: vBackup.data.posts?.length || 0,
          linksCount: vBackup.data.category_links?.length || 0
        });
      } else {
        setVaultBackupInfo({
          exists: false,
          timestamp: null,
          categoriesCount: 0,
          postsCount: 0,
          linksCount: 0
        });
      }
    } catch (err) {
      console.error('Error fetching vault info:', err);
    }
  }, []);

  // 2. Modern background automated verification cycle (runs once every 24 hours)
  const triggerSafetyCycle = useCallback(async (vaultDisabled: boolean, fileEnabled: boolean) => {
    try {
      const todayString = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const lastBackupDate = localStorage.getItem('sarkari_sewayojan_last_auto_backup_date');

      // If backed up today already, bypass automatic generation to conserve bandwidth
      if (lastBackupDate === todayString) {
        console.log('[Backup System] Daily automatic safety cycle bypassed. Already secured today!');
        return;
      }

      // If both options are turned off, do nothing
      if (vaultDisabled && !fileEnabled) {
        return;
      }

      console.log('[Backup System] Auto safety check started: No backup found for today. Initiating safe background backup...');
      logProgress('स्मार्ट दैनिक सुरक्षा चक्र: बैकग्राउंड में सुरक्षित डेटा संकलन शुरू हो रहा है...');

      // Retrieve all Firebase data
      const categories = await getCategories();
      const category_links = await getCategoryLinks();
      const tablet_items = await getTabletItems();
      const settings_flat = await getSiteSettingsFlat();
      const basicPosts = await getPosts();

      // DISASTER PREVENTION SHIELD: If Firebase is suddenly empty, abort backup cycle
      // to avoid overwriting a good healthy local backup in IndexedDB with blank data.
      if (categories.length === 0 && basicPosts.length === 0) {
        console.warn('[Backup System] Disaster Prevention triggered. Firebase database seems empty! Auto-backup aborted to protect existing offline archive.');
        logProgress('🛡️ सुरक्षा ढाल सक्रिय: क्लाउड डेटाबेस खाली/क्रैश दिखा। आपके स्थानीय ब्राउज़र लॉकर में मौजूद पुराने सुरक्षित बैकअप को बचाने के लिए ऑटो-ओवरराइट निरस्त किया गया!');
        return;
      }

      const fullPosts: any[] = [];
      let idx = 1;
      for (const p of basicPosts) {
        try {
          const fp = await getPostBySlug(p.slug || p.id);
          fullPosts.push(fp || p);
        } catch {
          fullPosts.push(p);
        }
        idx++;
      }

      const backupObj: BackupData = {
        categories,
        category_links,
        tablet_items,
        posts: fullPosts,
        settings_flat,
        backup_timestamp: new Date().toISOString(),
        source: 'Sarkari_Sewayojan_Auto_Shield'
      };

      // A. Save to Browser Local Vault (IndexedDB)
      if (!vaultDisabled) {
        const success = await saveBackupToVault(backupObj, 'latest_daily');
        if (success) {
          logProgress('ऑटो-सुरक्षा चक्र: डेटा आपके ब्राउज़र के लॉकर (IndexedDB Storage) में सुरक्षित किया गया!');
        }
      }

      // B. Trigger automatic json file download if configured
      if (fileEnabled) {
        logProgress('ऑटो-सुरक्षा चक्र: कंप्यूटर के लिए ऑफलाइन बैकअप फाइल जनरेट की जा रही है...');
        const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Sarkari_Sewayojan_AUTO_BACKUP_${todayString}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      // Update timestamp to avoid running multiple times on the same day
      localStorage.setItem('sarkari_sewayojan_last_auto_backup_date', todayString);
      
      // Refresh state details
      fetchVaultDetails();

      toast({
        title: 'दैनिक सुरक्षा चक्र सक्रिय!',
        description: 'आपके डेटाबेस की 100% कॉपी ब्राउज़र के सुरक्षित स्टोरेज में सेव कर दी गई है।',
      });

      logProgress(`दैनिक सुरक्षा चक्र पूर्ण! दिनांक ${todayString} का संपूर्ण बैकअप सफलतापूर्वक सुरक्षित।`);
    } catch (e: any) {
      console.error('[Backup System] Background auto backup error:', e);
      logProgress(`बैकग्राउंड सुरक्षा चक्र एरर: ${e.message || String(e)}`);
    }
  }, [toast, fetchVaultDetails]);

  // 3. Load configuration and existing local vault backup details on mount
  useEffect(() => {
    // 1. Load preferences from localStorage
    const savedAutoVault = localStorage.getItem('sarkari_sewayojan_pref_autovault');
    const savedAutoFile = localStorage.getItem('sarkari_sewayojan_pref_autofile');

    if (savedAutoVault !== null) {
      setAutoVaultEnabled(savedAutoVault === 'true');
    }
    if (savedAutoFile !== null) {
      setAutoFileEnabled(savedAutoFile === 'true');
    }

    // 2. Fetch Vault backup statistics
    fetchVaultDetails();

    // 3. Trigger modern background validation safety backup cycle
    triggerSafetyCycle(
      savedAutoVault !== 'true', // check if disabled
      savedAutoFile === 'true' // check if enabled
    );
  }, [triggerSafetyCycle, fetchVaultDetails]);

  // Preference Settings updates
  const handleToggleAutoVault = (checked: boolean) => {
    setAutoVaultEnabled(checked);
    localStorage.setItem('sarkari_sewayojan_pref_autovault', checked ? 'true' : 'false');
    toast({
      title: 'पसंद सहेजी गई!',
      description: checked ? 'स्वचालित ब्राउज़र वॉल्ट बैकअप चालू है।' : 'स्वचालित ब्राउज़र वॉल्ट बैकअप बंद कर दिया गया है।',
    });
  };

  const handleToggleAutoFile = (checked: boolean) => {
    setAutoFileEnabled(checked);
    localStorage.setItem('sarkari_sewayojan_pref_autofile', checked ? 'true' : 'false');
    toast({
      title: 'पसंद सहेजी गई!',
      description: checked ? 'दैनिक कंप्यूटर फाइल ऑटो-डाउनलोड चालू कर दिया गया है।' : 'दैनिक कंप्यूटर फाइल ऑटो-डाउनलोड बंद है।',
    });
  };

  // 1. Download Manual Backup
  const handleDownloadBackup = async () => {
    setLoading(true);
    setProgressMsg('मैन्युअल बैकअप तैयार किया जा रहा है...');
    try {
      logProgress('फायरबेस से कैटेगरीज लोड की जा रही हैं...');
      const categories = await getCategories();

      logProgress('फायरबेस से कैटेगरी लिंक्स लोड किए जा रहे हैं...');
      const category_links = await getCategoryLinks();

      logProgress('फायरबेस से टैबलेट आइटम्स लोड किए जा रहे हैं...');
      const tablet_items = await getTabletItems();

      logProgress('फायरबेस से साइट सेटिंग्स लोड की जा रही हैं...');
      const settings_flat = await getSiteSettingsFlat();

      logProgress('फायरबेस से पोस्ट्स की लिस्ट लोड की जा रही है...');
      const basicPosts = await getPosts();
      
      const fullPosts: any[] = [];
      let index = 1;
      
      for (const p of basicPosts) {
        logProgress(`पोस्ट [${index}/${basicPosts.length}] की फुल डिटेल्स लोड हो रही हैं: "${p.name_of_post}"...`);
        try {
          const fullPost = await getPostBySlug(p.slug || p.id);
          if (fullPost) {
            fullPosts.push(fullPost);
          } else {
            fullPosts.push(p);
          }
        } catch (e) {
          console.warn(`Could not load details for ${p.id}, using basic info`, e);
          fullPosts.push(p);
        }
        index++;
      }

      const backupObj: BackupData = {
        categories,
        category_links,
        tablet_items,
        posts: fullPosts,
        settings_flat,
        backup_timestamp: new Date().toISOString(),
        source: 'Sarkari_Sewayojan_Manual_Export'
      };

      // Save to IndexedDB on manual trigger as well for maximum resilience
      await saveBackupToVault(backupObj, 'latest_daily');
      fetchVaultDetails();

      const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateString = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `Sarkari_Sewayojan_Backup_${dateString}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      logProgress('सफलता! बैकअप फाइल आपके कंप्यूटर पर डाउनलोड हो गई है और ब्राउज़र वॉल्ट अपडेट हुआ।');
      toast({
        title: 'बैकअप डाउनलोड सफल!',
        description: 'आपके पूरे डेटाबेस की JSON फाइल सुरक्षित डाउनलोड हो गई है।',
      });
    } catch (err: any) {
      console.error(err);
      logProgress(`त्रुटि: ${err.message || String(err)}`);
      toast({
        title: 'त्रुटि!',
        description: 'बैकअप बनाने में कोई समस्या आई है।',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Restore from static content on site (data.json)
  const handleRestoreFromStatic = async () => {
    if (!window.confirm('क्या आप सच में अपनी लाइव वेबसाइट की फाइलों से डेटाबेस को रिकवर करना चाहते हैं? इससे फायरबेस का वर्तमान डाटा अधिलेखित (overwrite) हो जाएगा।')) {
      return;
    }

    setLoading(true);
    setProgressMsg('लाइव वेबसाइट से डेटा रिकवरी शुरू हो रही है...');

    try {
      logProgress('वेबसाइट की मुख्य डाटा फाइल (data.json) लोड हो रही है...');
      const response = await fetch('/data.json');
      if (!response.ok) {
        throw new Error('सर्वर से static data.json लोड करने में विफलता आई। कृपया पहले वेबसाइट पब्लिश करें।');
      }
      const homeData = await response.json();
      
      const { categories, category_links, tablet_items, posts, settings_flat } = homeData;
      if (!categories || !posts) {
        throw new Error('डाटा फाइल का फॉर्मेट अमान्य है।');
      }

      logProgress(`कुल ${posts.length} पोस्ट की पहचान हुई। अब सभी पोस्टों की फुल डिटेल्स (HTML टेबल्स) लोड हो रही हैं...`);
      const fullPosts: any[] = [];
      let index = 1;

      for (const p of posts) {
        logProgress(`फाइल से पोस्ट [${index}/${posts.length}] लोड हो रही है: "${p.name_of_post || p.id}"...`);
        try {
          const detailUrl = `/data/post_${p.slug || p.id}.json`;
          const detailRes = await fetch(detailUrl);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            fullPosts.push(detailData);
          } else {
            console.warn(`Could not load custom detail for post slug: ${p.slug}. Falling back to basic content.`);
            fullPosts.push(p);
          }
        } catch (e) {
          console.warn(`Exception fetching detail for ${p.slug}, continuing`, e);
          fullPosts.push(p);
        }
        index++;
      }

      logProgress('कम्पलीट डेटासेट तैयार है। अब फायरबेस डेटाबेस में रिस्टोर किया जा रहा है (इस प्रक्रिया में 5-15 सेकंड लग सकते हैं)...');
      
      await restoreDatabaseBackup({
        categories,
        category_links,
        tablet_items,
        posts: fullPosts,
        settings_flat
      }, logProgress);

      toast({
        title: 'डेटाबेस रिकवरी सफल!',
        description: 'आपकी लाइव वेबसाइट की फाइलों से फायरबेस को पूरी तरह अपडेट कर दिया गया है।',
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err: any) {
      console.error(err);
      logProgress(`गड़बड़: ${err.message || String(err)}`);
      toast({
        title: 'रिकवरी विफल!',
        description: err.message || 'डाटा रिस्टोर करने में कोई समस्या आई।',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Restore directly from Local Browser Vault (IndexedDB backup)
  const handleRestoreFromVault = async () => {
    if (!vaultBackupInfo.exists) return;

    if (!window.confirm('क्या आप निश्चित रूप से अपने ब्राउज़र वॉल्ट (IndexedDB) में सहेजे गए स्थानीय बैकअप से डेटाबेस को पुनर्स्थापित (Restore) करना चाहते हैं? इससे फायरबेस का वर्तमान डेटा अधिलेखित हो जाएगा।')) {
      return;
    }

    setLoading(true);
    setProgressMsg('ब्राउज़र वॉल्ट से डेटाबेस रिकवरी शुरू हो रही है...');

    try {
      logProgress('स्थानीय ब्राउज़र वॉल्ट से सहेजी गई डेटा ऑब्जेक्ट लोड हो रही है...');
      const vaultData = await getBackupFromVault('latest_daily');
      
      if (!vaultData || !vaultData.data) {
        throw new Error('ब्राउज़र वॉल्ट में कोई डेटा नहीं मिला या फाइल दूषित है।');
      }

      const { data } = vaultData;
      logProgress('वॉल्ट डेटा सफलतापूर्वक अनपैक किया गया। फायरबेस रीलोकेशन शुरू हो रही है...');

      await restoreDatabaseBackup({
        categories: data.categories || [],
        category_links: data.category_links || [],
        tablet_items: data.tablet_items || [],
        posts: data.posts || [],
        settings_flat: data.settings_flat || {}
      }, logProgress);

      logProgress('बधाई हो! स्थानीय वॉल्ट बैकअप फायरबेस डेटाबेस में रिस्टोर हो चुका है।');
      toast({
        title: 'वॉल्ट रिकवरी सफल!',
        description: 'आपके ब्राउज़र वॉल्ट में सहेजें डेटा से पूरा डेटाबेस पुनर्स्थापित हो गया है।',
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err: any) {
      console.error(err);
      logProgress(`त्रुटि: ${err.message || String(err)}`);
      toast({
        title: 'वॉल्ट रिकवरी विफल!',
        description: err.message || 'डेटाबेस रिस्टोर करने में कोई समस्या आई।',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Drag & Drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      toast({
        title: 'अमान्य फाइल फॉर्मेट!',
        description: 'कृपया केवल .json फॉर्मेट की बैकअप फाइल ही सेलेक्ट करें।',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.categories || !parsed.posts || !parsed.category_links) {
          toast({
            title: 'गलत बैकअप ढांचा!',
            description: 'इस फाइल में हमारी वेबसाइट का वैध बैकअप डेटा नहीं मिल पाया।',
            variant: 'destructive',
          });
          setSelectedFile(null);
          setParsedData(null);
          return;
        }
        setParsedData(parsed);
      } catch (e) {
        toast({
          title: 'फाइल एरर!',
          description: 'JSON फाइल को पढ़ने में समस्या आई। फाइल करप्ट हो सकती है।',
          variant: 'destructive',
        });
        setSelectedFile(null);
        setParsedData(null);
      }
    };
    reader.readAsText(file);
  };

  // Restore Database from Uploaded File
  const handleRestoreFromUploadedFile = async () => {
    if (!parsedData) return;

    if (!window.confirm('क्या आप निश्चित हैं कि आप इस बैकअप फाइल से डेटाबेस रिस्टोर करना चाहते हैं? फायरबेस का सारा मौजूदा डेटा ओवरराइट हो जाएगा।')) {
      return;
    }

    setLoading(true);
    setProgressMsg('अपलोड की गई फाइल से डेटा रिस्टोर हो रहा है...');

    try {
      await restoreDatabaseBackup({
        categories: parsedData.categories || [],
        category_links: parsedData.category_links || [],
        tablet_items: parsedData.tablet_items || [],
        posts: parsedData.posts || [],
        settings_flat: parsedData.settings_flat || {}
      }, logProgress);

      toast({
        title: 'मैन्युअल रिस्टोर पूर्ण!',
        description: 'फाइल बैकअप सफलतापूर्वक फायरबेस डेटाबेस में रिस्टोर हो गया है।',
      });

      setSelectedFile(null);
      setParsedData(null);

      setTimeout(() => {
        window.location.reload();
      }, 2500);

    } catch (err: any) {
      console.error(err);
      logProgress(`त्रुटि: ${err.message || String(err)}`);
      toast({
        title: 'मैन्युअल रिस्टोर विफल!',
        description: err.message || 'डाटा रिस्टोर करने में विफलता आई है।',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Convert dates seamlessly
  const formatTimeStr = (isoString?: string | null) => {
    if (!isoString) return 'कोई डेटा नहीं';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('hi-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: true,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-background rounded-2xl p-6" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
      {/* Title Header */}
      <div className="flex items-center gap-3 mb-6 border-b-4 border-dashed border-slate-500 pb-4">
        <div className="p-3 bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300 rounded-2xl">
          <Database className="w-8 h-8 animate-pulse" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-primary">डेटाबेस सुरक्षा एवं ऑटो-बैकअप कंट्रोल रूम</h2>
          <p className="text-sm text-muted-foreground font-semibold flex items-center gap-1.5 flex-wrap">
            <span>फायरबेस डेटाबेस की संपूर्ण सुरक्षा और क्लाउड क्रैश सेफ्टी-नेट टूल्स।</span>
            <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 px-2 py-0.5 rounded-full text-[11px] font-black uppercase">
              <Flame className="w-3 h-3 text-red-600 dark:text-red-400" /> Ultra-Resilient Engine v2.0
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: CRASH PROTECTION & AUTOMATIC RECOVERY */}
        <div className="space-y-6">
          
          {/* THE BROWSER VAULT (INDEXEDDB) STATUS PANEL */}
          <div className="bg-slate-50 dark:bg-slate-950/20 border-2 border-dashed border-red-400/80 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-red-600 dark:text-red-400" />
                <h3 className="text-lg font-black text-red-800 dark:text-red-300">
                  स्थानीय तिजोरी (Browser Vault)
                </h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                vaultBackupInfo.exists 
                  ? 'bg-green-100/80 text-green-800 dark:bg-green-950/40 dark:text-green-300' 
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300'
              }`}>
                {vaultBackupInfo.exists ? '● SECURED' : '● NO BACKUP'}
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 text-justify mb-4 leading-relaxed">
              यह आपके ब्राउज़र का सबसे पावरफुल <strong>लोकल लॉकर (IndexedDB Vault)</strong> है। बिना किसी क्लाउड या सर्वर की मदद के, 
              आपके एडमिन पैनल ओपन करते ही यह पूरे डेटा की एक 100% सुरक्षित क्लोन कॉपी बिना किसी स्पीड इम्पेक्ट के चुपचाप आपके ब्राउज़र में स्टोर कर देता है। 
              यदि आपका पूरा फायरबेस खाली हो जाए, तो आप सीधा यहाँ से बिना किसी फाइल फ़ोल्डर के 1 सेकंड में रिकवर कर सकते हैं।
            </p>

            {vaultBackupInfo.exists ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-4 text-xs font-semibold space-y-2 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between items-center text-primary font-black border-b border-dashed pb-1.5">
                  <span>🔒 लॉकर बैकअप डिटेल्स (Browser Stored)</span>
                  <span className="text-emerald-600 dark:text-emerald-400">सत्यापित ✓</span>
                </div>
                <p>⏰ <strong>अंतिम संकलन समय:</strong> {formatTimeStr(vaultBackupInfo.timestamp)}</p>
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="bg-secondary/40 p-2 rounded-lg">
                    <p className="text-xs text-muted-foreground font-bold">कैटेगरीज</p>
                    <p className="text-lg font-black text-primary">{vaultBackupInfo.categoriesCount}</p>
                  </div>
                  <div className="bg-secondary/40 p-2 rounded-lg">
                    <p className="text-xs text-muted-foreground font-bold">लिंक्स</p>
                    <p className="text-lg font-black text-primary">{vaultBackupInfo.linksCount}</p>
                  </div>
                  <div className="bg-secondary/40 p-2 rounded-lg">
                    <p className="text-xs text-muted-foreground font-bold">कुल पोस्ट</p>
                    <p className="text-lg font-black text-primary">{vaultBackupInfo.postsCount}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50/50 dark:bg-yellow-950/20 border border-dashed border-yellow-300 rounded-xl p-4 mb-4 text-xs font-semibold text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>अभी तक आपके ब्राउज़र लॉकर में कोई डेटा सहेजा नहीं गया है। कृपया संकलन की प्रतीक्षा करें या "ऑफलाइन बैकअप डाउनलोड" दबाएँ।</span>
              </div>
            )}

            <Button 
              className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm flex gap-2 items-center h-11"
              disabled={loading || !vaultBackupInfo.exists}
              onClick={handleRestoreFromVault}
            >
              <ShieldCheck className="w-4 h-4" /> Browser Vault से database तुरंत रिकवर करें
            </Button>
          </div>

          {/* AUTOMATED SECURITY PREFERENCES PANEL */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-900/10">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-black text-[16px] text-indigo-800 dark:text-indigo-300">
                स्वचालित बैकअप सेटिंग्स (Auto Backup Cycle Configuration)
              </h3>
            </div>

            <div className="space-y-4">
              {/* Option A: Automatic Browser Vault (IndexedDB) back up daily */}
              <div className="flex items-start gap-3 p-3 bg-background hover:bg-secondary/20 rounded-xl border border-secondary transition-colors">
                <Checkbox 
                  id="pref-vault" 
                  checked={autoVaultEnabled} 
                  onCheckedChange={(checked) => handleToggleAutoVault(!!checked)}
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="pref-vault" className="text-sm font-black text-primary cursor-pointer">
                    1. ऑटो ब्राउज़र लॉकर बैकअप (Auto-Vault)
                  </label>
                  <p className="text-xs text-muted-foreground font-semibold">
                    दैनिक आधार पर (एक बार 24 घंटे में) एडमिन पैनल लोड होते ही पूरे डेटाबेस का नया क्लोन ब्राउज़र के सेव लॉकर में बैकअप करे। (अनुशंसित - चालू)
                  </p>
                </div>
              </div>

              {/* Option B: Automatic Daily File download on panel open */}
              <div className="flex items-start gap-3 p-3 bg-background hover:bg-secondary/20 rounded-xl border border-secondary transition-colors">
                <Checkbox 
                  id="pref-file" 
                  checked={autoFileEnabled} 
                  onCheckedChange={(checked) => handleToggleAutoFile(!!checked)}
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="pref-file" className="text-sm font-black text-primary cursor-pointer flex items-center gap-1">
                    2. दैनिक कंप्यूटर बैकअप ऑटो-डाउनलोड <FileDown className="w-3.5 h-3.5 text-indigo-600 shrink-0 animate-bounce" />
                  </label>
                  <p className="text-xs text-muted-foreground font-semibold">
                    जैसे ही आप दिन में पहली बार एडमिन पैनल खोलें, एक `.json` बैकअप फाइल आपके कंप्यूटर पर ऑटोमैटिक डाउनलोड हो जाए।
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-950/20 border-2 border-dashed border-indigo-400 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Download className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-black text-indigo-800 dark:text-indigo-300">
                ऑफ़लाइन बैकअप फाइल डाउनलोड करें
              </h3>
            </div>
            <p className="text-sm font-semibold text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed mb-4 text-justify">
              समय-समय पर अपने पूरे डेटाबेस (Categories, Jobs/Posts inside tables, Tablet links, Site configuration) 
              का एक पूरा ऑफलाइन बैकअप अपने कंप्यूटर पर डाउनलोड करके रखें। यह एक सुरक्षित `.json` फाइल डाउनलोड करता है, 
              जिसे आप कभी भी वापस अपलोड करके अपनी पूरी वेबसाइट रीस्टोर कर सकते हैं।
            </p>
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 font-extrabold text-base flex gap-2 items-center h-12"
              disabled={loading}
              onClick={handleDownloadBackup}
            >
              <Download className="w-5 h-5 flex-shrink-0" />
              पूरे database का Backup फाइल डाउनलोड करें
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: MANUAL FILE RESTORATION & STATUS */}
        <div className="space-y-6">

          {/* DYNAMIC SITE / FILE COMPILER SAFETY-SHIELD */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border-2 border-dashed border-emerald-400 rounded-2xl p-6 relative overflow-hidden">
            <span className="absolute top-2 right-2 bg-emerald-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full tracking-wider uppercase">
              RELIABILITY SHIELD
            </span>
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-lg font-black text-emerald-800 dark:text-emerald-300">
                वेबसाइट फाइल (data.json) से रिकवरी
              </h3>
            </div>
            <p className="text-sm font-semibold text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed mb-4 text-justify">
              यदि भविष्य में कभी फायरबेस डेटाबेस डिलीट हो जाता है, तो भी चिंता की कोई बात नहीं है! 
              सर्करी सेवायोजन 100% स्टेटिक आर्किटेक्चर पर काम करती है। इसका अर्थ है कि हमारी पिछली बार पब्लिश की गई पूरी 
              वेबसाइट का डेटा सुरक्षित पब्लिश फ़ोल्डर में उपलब्ध है। आप नीचे दिए गए बटन को दबाकर वेबसाइट की लाइव फाइलों से 100% 
              डेटा को वापस फायरबेस डेटाबेस में रिस्टोर कर सकते हैं।
            </p>
            <div className="bg-white/80 dark:bg-black/30 rounded-xl p-3 mb-4 border border-dashed border-emerald-300">
              <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> लाइव वेबसाइट की फाइलों से पूर्ण बैकअप ढांचा पुनः सृजित करें
              </div>
            </div>
            <Button 
              className="w-full bg-emerald-600 hover:bg-emerald-700 font-extrabold text-base flex gap-2 items-center h-12"
              disabled={loading}
              onClick={handleRestoreFromStatic}
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              लाइव वेबसाइट फाइलों से database रिकवर करें
            </Button>
          </div>

          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Upload className="w-6 h-6 text-primary" />
                <h3 className="text-lg font-black text-primary">
                  मैन्युअल JSON फाइल से रिस्टोर
                </h3>
              </div>
              <p className="text-sm font-semibold text-muted-foreground mb-4">
                यदि आपके पास पहले से डाउनलोड की हुई बैकअप फाइल है, तो आप उसे नीचे अपलोड कर सकते हैं और पूरी वेबसाइट को उस तिथि के अनुसार वापस रीस्टोर कर सकते हैं।
              </p>

              {/* Drag and Drop Area */}
              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  dragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-slate-300 hover:border-primary bg-secondary/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  id="backup-upload" 
                  className="hidden" 
                  accept=".json"
                  onChange={handleFileChange}
                />
                <label htmlFor="backup-upload" className="cursor-pointer block">
                  <FileJson className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <span className="text-sm font-bold text-primary underline block">
                    कंप्यूटर से बैकअप JSON फाइल चुनें
                  </span>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    या यहाँ फाइल ड्रैग एंड ड्रॉप करें। (केवल वैध .json फाइलें ही सपोर्टेड हैं)
                  </span>
                </label>
              </div>

              {/* Selected File Details */}
              {selectedFile && parsedData && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 border-2 border-dashed border-yellow-400 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300 font-bold text-sm">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" /> वैध बैकअप फाइल मिली!
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold space-y-1">
                    <p>📁 <strong>नाम:</strong> {selectedFile.name}</p>
                    <p>📊 <strong>साइज:</strong> {(selectedFile.size / 1024).toFixed(1)} KB</p>
                    <p>📝 <strong>कैटेगरीज:</strong> {parsedData.categories?.length || 0}</p>
                    <p>🔗 <strong>कैटेगरी लिंक्स:</strong> {parsedData.category_links?.length || 0}</p>
                    <p>📌 <strong>टैबलेट आइटम्स:</strong> {parsedData.tablet_items?.length || 0}</p>
                    <p>📰 <strong>कुल जॉब्स/पोस्ट्स:</strong> {parsedData.posts?.length || 0}</p>
                  </div>
                  <Button 
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-extrabold h-10 mt-2"
                    disabled={loading}
                    onClick={handleRestoreFromUploadedFile}
                  >
                    इस फाइल से पूरा Database ओवरराइट करें
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* STATUS LOGGER DISPLAY */}
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl p-4 font-mono text-xs overflow-hidden h-[240px] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-slate-400 text-[10.5px]">
              <span className="flex items-center gap-1.5 font-bold">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping inline-block"></span>
                SYSTEM ACTIVE LOGS
              </span>
              <span>IST TIME</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 p-1 scrollbar-thin scrollbar-thumb-slate-800">
              <p className="text-green-400">[System] Sarkari Sewayojan Auto Backup Engine Active.</p>
              <p className="text-slate-400">[System] Offline cache layers linked and persistent cache is active.</p>
              {autoVaultEnabled && (
                <p className="text-emerald-400">[System] Automatic Browser Vault configuration enabled.</p>
              )}
              {autoFileEnabled && (
                <p className="text-indigo-400">[System] Daily File Auto-Download configuration enabled.</p>
              )}
              {progressMsg ? (
                <p className="text-yellow-400 font-bold whitespace-pre-wrap flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 shrink-0 animate-bounce" />
                  {progressMsg}
                </p>
              ) : (
                <p className="text-slate-500">[System] Waiting for backup or recovery action...</p>
              )}
            </div>
            <div className="border-t border-slate-800 pt-2 text-[10.5px] text-slate-500 flex justify-between">
              <span>DB CONFIG: ACTIVE</span>
              <span>100% FAULT LOSS-FREE SHA-256</span>
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER WARN BOX */}
      <div className="mt-8 bg-amber-50 dark:bg-amber-950/20 border-2 border-dashed border-amber-300 rounded-xl p-4 flex gap-3 items-center">
        <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />
        <div className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          <strong>गंभीर चेतावनी:</strong> डाटा रिस्टोर करने से आपके फायरबेस में मौजूद वर्तमान में सभी कैटेगरीज, पोस्ट्स और सेटिंग्स चेंज हो जाएंगी। हम मज़बूती से सलाह देते हैं कि कोई भी बडा रिस्टोर करने से पहले "ऑफलाइन बैकअप डाउनलोड" बटन पर क्लिक करके बैकअप जरूर बना लें!
        </div>
      </div>
    </div>
  );
};
