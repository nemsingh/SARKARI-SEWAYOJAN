import { useState, useEffect, useRef, useDeferredValue, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getPostById, createPost, updatePost, getCategories, addCategoryLink, getCategoryLinks, updateCategoryLink, getPostBySlug, getTabletItems, updateTabletItem } from '@/lib/firebaseService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon } from 'lucide-react';
import ExcelEditor from '@/components/admin/ExcelEditor';
import DirectPasteEditor from '@/components/admin/DirectPasteEditor';
import { DateTimePicker } from '@/components/ui/date-time-picker';

const generateSlug = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const generateShortSlug = (text: string) => {
  const fullSlug = generateSlug(text);
  const words = fullSlug.split('-');
  if (words.length > 6) {
    return words.slice(0, 6).join('-');
  }
  return fullSlug.substring(0, 50).replace(/-+$/, '');
};

const formatDateTime = (dateString: string, lang: 'en' | 'hi' = 'en') => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  
  const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthsHi = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
  
  const day = d.getDate();
  const month = lang === 'hi' ? monthsHi[d.getMonth()] : monthsEn[d.getMonth()];
  const year = d.getFullYear();
  
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  return `${day} ${month} ${year} | ${hours}:${minutes} ${ampm}`;
};

const parseDateTime = (dateString: string, lang: 'en' | 'hi' = 'en'): Date | undefined => {
  if (!dateString) return undefined;
  
  const d = new Date(dateString);
  if (!isNaN(d.getTime())) return d;
  
  try {
    const parts = dateString.split('|').map(p => p.trim());
    if (parts.length !== 2) return undefined;
    
    const dateTokens = parts[0].split(' ');
    if (dateTokens.length !== 3) return undefined;
    
    const day = parseInt(dateTokens[0], 10);
    const monthStr = dateTokens[1];
    const year = parseInt(dateTokens[2], 10);
    
    const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthsHi = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
    
    const monthIndex = lang === 'hi' ? monthsHi.indexOf(monthStr) : monthsEn.indexOf(monthStr);
    if (monthIndex === -1) return undefined;
    
    const timeTokens = parts[1].split(' ');
    if (timeTokens.length !== 2) return undefined;
    
    const timeParts = timeTokens[0].split(':');
    if (timeParts.length !== 2) return undefined;
    
    let hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const ampm = timeTokens[1].toUpperCase();
    
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    const result = new Date(year, monthIndex, day, hours, minutes);
    if (isNaN(result.getTime())) return undefined;
    return result;
  } catch (e) {
    return undefined;
  }
};

const AdminPostEditor = () => {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { toast } = useToast();

  const [nameOfPost, setNameOfPost] = useState('');
  const [postDate, setPostDate] = useState('');
  const [shortInfo, setShortInfo] = useState('');
  const [tablesHtml, setTablesHtml] = useState('');
  const [slug, setSlug] = useState('');
  const [nameOfPostHi, setNameOfPostHi] = useState('');
  const [postDateHi, setPostDateHi] = useState('');
  const [shortInfoHi, setShortInfoHi] = useState('');
  const [tablesHtmlHi, setTablesHtmlHi] = useState('');
  const [tables, setTables] = useState<string[]>([]);
  const [tablesHi, setTablesHi] = useState<string[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [isThemeBhagwa, setIsThemeBhagwa] = useState(false);

  // Pre-calculate preview HTML to avoid hanging the browser with regex parsing on every keystroke
  const deferredNameOfPost = useDeferredValue(nameOfPost);
  const deferredPostDate = useDeferredValue(postDate);
  const deferredShortInfo = useDeferredValue(shortInfo);
  const deferredTablesHtml = useDeferredValue(tablesHtml);

  // Use memoization so we only run heavy regex when deferred values update
  const makeBoldHtml = (text: string) => text ? text.replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>') : '';
  
  const previewNameHtml = useMemo(() => makeBoldHtml(deferredNameOfPost), [deferredNameOfPost]);
  const previewDateHtml = useMemo(() => makeBoldHtml(deferredPostDate), [deferredPostDate]);
  const previewShortInfoHtml = useMemo(() => makeBoldHtml(deferredShortInfo), [deferredShortInfo]);
  const previewTablesHtml = useMemo(() => makeBoldHtml(deferredTablesHtml), [deferredTablesHtml]);


  useEffect(() => {
    const savedTheme = localStorage.getItem('theme-mode');
    if (savedTheme === 'bhagwa') {
      document.documentElement.classList.add('theme-bhagwa');
      setIsThemeBhagwa(true);
    }
  }, []);

  const toggleTheme = () => {
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

  const shortInfoRef = useRef<HTMLTextAreaElement>(null);
  const shortInfoHiRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = (
    ref: React.RefObject<HTMLTextAreaElement>,
    value: string,
    setter: (val: string) => void,
    prefix: string,
    suffix: string
  ) => {
    if (!ref.current) return;
    const start = ref.current.selectionStart;
    const end = ref.current.selectionEnd;
    if (start === end) {
      alert("Please select some text first.");
      return;
    }
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
    setter(newText);
    setTimeout(() => {
      if (ref.current) {
        ref.current.focus();
        ref.current.setSelectionRange(start + prefix.length, end + prefix.length);
      }
    }, 0);
  };

  const applyLink = (
    ref: React.RefObject<HTMLTextAreaElement>,
    value: string,
    setter: (val: string) => void
  ) => {
    if (!ref.current) return;
    const start = ref.current.selectionStart;
    const end = ref.current.selectionEnd;
    if (start === end) {
      alert("Please select some text first to add a link.");
      return;
    }
    const url = window.prompt("Enter the website URL (e.g., https://google.com):");
    if (!url) return;

    const prefix = `<a href="${url}" target="_blank" rel="noopener noreferrer">`;
    const suffix = `</a>`;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
    setter(newText);
    setTimeout(() => {
      if (ref.current) {
        ref.current.focus();
        ref.current.setSelectionRange(start + prefix.length, end + prefix.length);
      }
    }, 0);
  };

  // Excel editor reset keys & channel IDs
  const [editorKey, setEditorKey] = useState(0);
  const [editorKeyHi, setEditorKeyHi] = useState(0);
  const [channelEn] = useState(() => `excel-en-${Date.now()}`);
  const [channelHi] = useState(() => `excel-hi-${Date.now()}`);

  const [editingTableIndex, setEditingTableIndex] = useState<number | null>(null);
  const [editingTableIndexHi, setEditingTableIndexHi] = useState<number | null>(null);

  // Listen for tables from fullscreen Excel editor
  useEffect(() => {
    const bcEn = new BroadcastChannel(channelEn);
    const bcHi = new BroadcastChannel(channelHi);
    bcEn.onmessage = (e) => {
      if (e.data?.type === 'add-table' && e.data.html) {
        handleAddTable(e.data.html);
      }
    };
    bcHi.onmessage = (e) => {
      if (e.data?.type === 'add-table' && e.data.html) {
        handleAddTableHi(e.data.html);
      }
    };
    return () => { bcEn.close(); bcHi.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optional category linking
  const [categories, setCategories] = useState<any[]>([]);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkCategoryId, setLinkCategoryId] = useState('');
  const [linkId, setLinkId] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user || !user.emailVerified) {
        navigate('/admin-vikaskumar', { replace: true });
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (!isNew && id) {
      const fetchPost = async () => {
        const data = await getPostById(id);
        if (data) {
          setNameOfPost(data.name_of_post || '');
          setPostDate(data.post_date || '');
          setShortInfo(data.short_info || '');
          setTablesHtml(data.tables_html || '');
          setSlug(data.slug || '');
          setNameOfPostHi(data.name_of_post_hi || '');
          setPostDateHi(data.post_date_hi || '');
          setShortInfoHi(data.short_info_hi || '');
          setTablesHtmlHi(data.tables_html_hi || '');
          setMediaUrls(data.media_urls || []);
          if (data.tables_html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(data.tables_html, 'text/html');
            setTables(Array.from(doc.querySelectorAll('table')).map(t => t.outerHTML));
          }
          if (data.tables_html_hi) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(data.tables_html_hi, 'text/html');
            setTablesHi(Array.from(doc.querySelectorAll('table')).map(t => t.outerHTML));
          }
          
          // Fetch existing category link
          const existingLinks = await getCategoryLinks();
          const existingLink = existingLinks.find((l: any) => l.url === `/post/${data.slug || id}`);
          if (existingLink) {
            setLinkTitle(existingLink.title || '');
            setLinkCategoryId(existingLink.category_id || '');
            setLinkId(existingLink.id || '');
          }
        }
        setLoading(false);
      };
      fetchPost();
    }
  }, [id, isNew]);

  useEffect(() => {
    if (isNew && nameOfPost && !slug) {
      setSlug(generateShortSlug(nameOfPost));
    }
  }, [nameOfPost, isNew, slug]);

  const handleAddTable = (tableHtml: string) => {
    const newTables = [...tables, tableHtml];
    setTables(newTables);
    setTablesHtml(newTables.join('\n'));
  };

  const handleRemoveTable = (index: number) => {
    const newTables = tables.filter((_, i) => i !== index);
    setTables(newTables);
    setTablesHtml(newTables.join('\n'));
  };

  const handleAddTableHi = (tableHtml: string) => {
    const newTables = [...tablesHi, tableHtml];
    setTablesHi(newTables);
    setTablesHtmlHi(newTables.join('\n'));
  };

  const handleRemoveTableHi = (index: number) => {
    const newTables = tablesHi.filter((_, i) => i !== index);
    setTablesHi(newTables);
    setTablesHtmlHi(newTables.join('\n'));
  };

  const handleMoveTableUp = (index: number) => {
    if (index === 0) return;
    const newTables = [...tables];
    [newTables[index - 1], newTables[index]] = [newTables[index], newTables[index - 1]];
    setTables(newTables);
    setTablesHtml(newTables.join('\n'));
  };

  const handleMoveTableDown = (index: number) => {
    if (index === tables.length - 1) return;
    const newTables = [...tables];
    [newTables[index + 1], newTables[index]] = [newTables[index], newTables[index + 1]];
    setTables(newTables);
    setTablesHtml(newTables.join('\n'));
  };

  const handleUpdateTableHtml = (index: number, newHtml: string) => {
    const newTables = [...tables];
    newTables[index] = newHtml;
    setTables(newTables);
    setTablesHtml(newTables.join('\n'));
    setEditingTableIndex(null);
  };

  const handleMoveTableUpHi = (index: number) => {
    if (index === 0) return;
    const newTables = [...tablesHi];
    [newTables[index - 1], newTables[index]] = [newTables[index], newTables[index - 1]];
    setTablesHi(newTables);
    setTablesHtmlHi(newTables.join('\n'));
  };

  const handleMoveTableDownHi = (index: number) => {
    if (index === tablesHi.length - 1) return;
    const newTables = [...tablesHi];
    [newTables[index + 1], newTables[index]] = [newTables[index], newTables[index + 1]];
    setTablesHi(newTables);
    setTablesHtmlHi(newTables.join('\n'));
  };

  const handleUpdateTableHtmlHi = (index: number, newHtml: string) => {
    const newTables = [...tablesHi];
    newTables[index] = newHtml;
    setTablesHi(newTables);
    setTablesHtmlHi(newTables.join('\n'));
    setEditingTableIndexHi(null);
  };

  const handleAddMedia = () => {
    if (newMediaUrl.trim()) {
      setMediaUrls(prev => [...prev, newMediaUrl.trim()]);
      setNewMediaUrl('');
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const clearForm = () => {
    setNameOfPost('');
    setPostDate('');
    setShortInfo('');
    setTablesHtml('');
    setSlug('');
    setNameOfPostHi('');
    setPostDateHi('');
    setShortInfoHi('');
    setTablesHtmlHi('');
    setTables([]);
    setTablesHi([]);
    setMediaUrls([]);
    setNewMediaUrl('');
    setLinkTitle('');
    setLinkCategoryId('');
    setEditorKey(prev => prev + 1);
    setEditorKeyHi(prev => prev + 1);
  };

  const handleSave = async () => {
    if (!nameOfPost.trim()) {
      toast({ title: 'Error', description: 'Name of Post is required.', variant: 'destructive' });
      return;
    }

    let finalSlug = slug ? generateSlug(slug) : generateShortSlug(nameOfPost);
    if (!finalSlug) {
      finalSlug = Math.random().toString(36).substring(2, 8);
    }

    try {
      // Check for duplicate slug
      const existing = await getPostBySlug(finalSlug);
      if (existing && existing.id !== id) {
        finalSlug = `${finalSlug}-${Math.random().toString(36).substring(2, 6)}`;
      }
    } catch (e) {
      console.error("Error checking slug:", e);
    }

    const postData: any = {
      name_of_post: nameOfPost,
      post_date: postDate,
      short_info: shortInfo,
      tables_html: tablesHtml,
      slug: finalSlug,
      name_of_post_hi: nameOfPostHi || null,
      post_date_hi: postDateHi || null,
      short_info_hi: shortInfoHi || null,
      tables_html_hi: tablesHtmlHi || null,
      media_urls: mediaUrls.length > 0 ? mediaUrls : null,
    };

    try {
      const payloadSize = new Blob([JSON.stringify(postData)]).size;
      // Warn when approaching 1 MB limit (1,048,576 bytes)
      if (payloadSize > 850000) {
         toast({ title: 'Size Warning', description: `This post is extremely large (${(payloadSize/1024/1024).toFixed(2)} MB) and close to the database limit. If saving fails, reduce the number of tables.`, variant: 'destructive' });
      }
    } catch(e) {
      console.warn("Could not calculate payload size", e);
    }

    try {
      if (isNew) {
        const result = await createPost(postData);
        if (linkTitle.trim() && linkCategoryId) {
          const inputDate = parseDateTime(postDate, 'en');
          const customTs = inputDate ? inputDate.getTime() : Date.now();

          await addCategoryLink({
            category_id: linkCategoryId,
            title: linkTitle.trim(),
            url: `/post/${finalSlug || result.id}`,
            link_timestamp: customTs,
            is_new: true,
            last_date_text: null,
          });
          toast({ title: 'Post created & added to category!' });
        } else {
          toast({ title: 'Post created!' });
        }
        // Clear form for new post creation
        clearForm();
      } else {
        const oldPost = await getPostById(id!);
        const oldSlug = oldPost?.slug || id;

        await updatePost(id!, postData);

        const inputDate = parseDateTime(postDate, 'en');
        const customTs = inputDate ? inputDate.getTime() : Date.now();

        if (linkTitle.trim() && linkCategoryId) {
          if (linkId) {
            await updateCategoryLink(linkId, {
              title: linkTitle.trim(),
              category_id: linkCategoryId,
              url: `/post/${finalSlug}`,
              link_timestamp: customTs
            });
          } else {
            await addCategoryLink({
              category_id: linkCategoryId,
              title: linkTitle.trim(),
              url: `/post/${finalSlug}`,
              link_timestamp: customTs,
              is_new: true,
              last_date_text: null,
            });
          }
        }
        
        if (oldSlug !== finalSlug) {
          const existingLinks = await getCategoryLinks();
          for (const link of existingLinks) {
            if (link.url === `/post/${oldSlug}` && link.id !== linkId) {
              await updateCategoryLink(link.id, { url: `/post/${finalSlug}` });
            }
          }
          const tabletItems = await getTabletItems();
          for (const item of tabletItems) {
            if (item.url === `/post/${oldSlug}`) {
              await updateTabletItem(item.id, { url: `/post/${finalSlug}` });
            }
          }
        }

        toast({ title: 'Post updated!' });
      }
      
    } catch (error: any) {
      console.error('Save error:', error);
      const isSizeError = error.message?.toLowerCase().includes('resource_exhausted') || error.message?.toLowerCase().includes('payload too large') || error.message?.toLowerCase().includes('exceeds the maximum');
      toast({ 
        title: isSizeError ? 'Post Too Large!' : 'Error saving post', 
        description: isSizeError ? 'Aapne post me bahut saara data (tables/text) daal diya hai. Firebase/Database ki 1MB ki limit cross ho gayi hai. Kripya kuchh tables kam karein aur wapas save karein.' : (error.message || 'An unexpected error occurred.'), 
        variant: 'destructive',
        duration: isSizeError ? 10000 : 5000
      });
    }
  };

  const handleDownloadHtml = () => {
    const html = generateFullHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nameOfPost.replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateFullHtml = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${nameOfPost}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: #ffffff; overflow-x: hidden; }
    .header { background: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.2); text-align: center; padding: 35px 0; }
    .header h1 { margin: 0; font-size: 48px; font-weight: 900; color: #0b3d91; }
    .main-wrapper { max-width: 1000px; margin: 20px auto; padding: 15px; }
    .job-detail-box { background: #ffffff; border-radius: 15px; padding: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.25); border-top: 5px solid #0b3d91; }
    table { border-collapse: collapse; margin: 0 auto; }
    td { padding: 10px; border-bottom: 1px solid #eee; font-size: 19px; }
    .short-info-cell a { color: inherit; text-decoration: none; }
    .short-info-cell a:hover { text-decoration: underline; text-decoration-color: blue; }
    .short-info-cell a:visited:hover { text-decoration-color: darkblue; }
  </style>
</head>
<body>
<div class="header"><h1>SARKARI SEWAYOJAN</h1></div>
<div class="main-wrapper">
  <div class="job-detail-box">
    <table class="post-summary-table" style="width:100%; border-collapse:collapse; margin-bottom: 20px;">
      <tr><td style="color:#FF0033;font-weight:bold;width:150px;border-bottom:1px solid #e5e7eb;padding:10px;">Name of Post:</td><td style="color:#0b3d91;font-weight:bold;border-bottom:1px solid #e5e7eb;padding:10px;">${nameOfPost ? nameOfPost.replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>') : ''}</td></tr>
      <tr><td style="color:#FF0033;font-weight:bold;border-bottom:1px solid #e5e7eb;padding:10px;">Post Date / Update:</td><td style="color:#0b3d91;font-weight:bold;border-bottom:1px solid #e5e7eb;padding:10px;">${postDate ? postDate.replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>') : ''}</td></tr>
      <tr><td style="color:#FF0033;font-weight:bold;border-bottom:1px solid #e5e7eb;padding:10px;">Short Info:</td><td class="short-info-cell" style="color:#0b3d91;border-bottom:1px solid #e5e7eb;padding:10px;">${shortInfo ? shortInfo.replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>') : ''}</td></tr>
    </table>
    ${tablesHtml ? tablesHtml.replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>') : ''}
  </div>
</div>
</body>
</html>`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-primary font-bold">Loading...</div>;

  return (
    <div className="admin-panel min-h-screen bg-secondary">
      <div className="bg-background py-4 px-6 flex justify-between items-center" style={{ boxShadow: 'var(--box-shadow-light)' }}>
        <h1 className="text-2xl font-black text-primary">{isNew ? 'Create New Post' : 'Edit Post'}</h1>
        <div className="flex gap-3 items-center">
          <div className="flex flex-col items-center mr-2">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 shadow-sm px-1 py-0.5 bg-black/5 rounded">
              Switch Interface
            </span>
            <button 
              onClick={toggleTheme}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none shadow-inner ${isThemeBhagwa ? 'bg-[#FF9933]' : 'bg-[#0B3D91]'}`}
              role="switch"
              aria-checked={isThemeBhagwa}
              aria-label="Toggle Theme"
            >
              <span className="sr-only">Toggle Theme</span>
              <span 
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-300 ease-in-out ${isThemeBhagwa ? 'translate-x-5' : 'translate-x-0'}`} 
              />
            </button>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>← Back</Button>
          <Button onClick={handleSave}>Save Post</Button>
          <Button variant="outline" onClick={handleDownloadHtml}>📥 Download HTML</Button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto p-6 space-y-6">
        {/* Optional: Link to Category Box */}
        <div className="bg-background rounded-2xl p-6 border-2 border-primary/30" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
          <h2 className="text-xl font-bold text-primary mb-2">🔗 {isNew ? 'Add to Category Box (Optional)' : 'Category Box Link'}</h2>
          <p className="text-sm text-muted-foreground mb-4">Agar aap dono fields fill karenge to ye post automatically selected category box me show hogi.</p>
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-base font-bold text-primary block mb-1">Link Title</label>
              <Input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} placeholder="e.g. UPSC CAPF 2026 Apply Online" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-base font-bold text-primary block mb-1">Category</label>
              <select
                value={linkCategoryId}
                onChange={e => setLinkCategoryId(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background text-base text-primary"
              >
                <option value="">-- Select Category --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-background rounded-2xl p-6" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
          <h2 className="text-xl font-bold text-primary mb-4">Post Information (English)</h2>
          <div className="space-y-4">
            <div>
              <label className="text-base font-bold text-primary block mb-1">Name of Post</label>
              <Input value={nameOfPost} onChange={e => setNameOfPost(e.target.value)} placeholder="e.g. UPSC CAPF 2026 Recruitment" />
            </div>
            <div>
              <label className="text-base font-bold text-primary block mb-1">URL Slug</label>
              <Input value={slug} onChange={e => setSlug(generateSlug(e.target.value))} placeholder="e.g. upsc-capf-2026-recruitment" />
              <p className="text-sm text-muted-foreground mt-1">Auto-generated from title. URL: /post/{slug || 'auto-generated'}</p>
            </div>
            <div>
              <label className="text-base font-bold text-primary block mb-1">Post Date / Update</label>
              <div className="flex gap-2 relative">
                <Input value={postDate} onChange={e => setPostDate(e.target.value)} placeholder="e.g. 21 February 2026 | 12:12 AM" className="flex-1" />
                <div className="relative w-12 h-10 flex-shrink-0">
                  <DateTimePicker
                    date={parseDateTime(postDate, 'en')}
                    setDate={(d) => {
                      if (d) setPostDate(formatDateTime(d.toISOString(), 'en'));
                    }}
                    customTrigger={
                      <Button type="button" variant="outline" className="w-full h-full p-0 flex items-center justify-center bg-muted/20 hover:bg-muted/50 border-border/60">
                        <CalendarIcon className="w-5 h-5 text-primary opacity-80" />
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-base font-bold text-primary block mb-1">Short Info (HTML allowed)</label>
              <div className="flex gap-2 mb-2">
                <Button type="button" variant="outline" size="sm" onClick={() => applyFormat(shortInfoRef, shortInfo, setShortInfo, '<b>', '</b>')}><b>B</b></Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyFormat(shortInfoRef, shortInfo, setShortInfo, '<span style="color: red;">', '</span>')} className="text-red-600 font-bold">Red</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyFormat(shortInfoRef, shortInfo, setShortInfo, '<span style="color: blue;">', '</span>')} className="text-blue-600 font-bold">Blue</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyLink(shortInfoRef, shortInfo, setShortInfo)}>🔗 Link</Button>
              </div>
              <Textarea ref={shortInfoRef} value={shortInfo} onChange={e => setShortInfo(e.target.value)} placeholder="Short info about the post..." rows={4} />
            </div>
          </div>
        </div>

        <div className="bg-background rounded-2xl p-6" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
          <h2 className="text-xl font-bold text-primary mb-4">Make Table - English (Excel Editor)</h2>
          <ExcelEditor 
            key={`en-${editorKey}`} 
            onAddTable={handleAddTable} 
            onUpdateTable={editingTableIndex !== null ? (html) => handleUpdateTableHtml(editingTableIndex, html) : undefined}
            onCancelEdit={() => setEditingTableIndex(null)}
            initialHtml={editingTableIndex !== null ? tables[editingTableIndex] : undefined}
            isEditing={editingTableIndex !== null}
            lang="en" 
            channelId={channelEn} 
          />
          <DirectPasteEditor onAdd={handleAddTable} lang="en" />
        </div>

        <div className="bg-background rounded-2xl p-6" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
          <h2 className="text-xl font-bold text-primary mb-4">Added Tables - English ({tables.length})</h2>
          {tables.length === 0 && <p className="text-muted-foreground">No tables added yet.</p>}
          {tables.map((tableHtml, index) => {
            if (editingTableIndex === index) return null;
            return (
            <div key={index} className={`mb-4 border rounded-lg p-4 ${editingTableIndex === index ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-primary">Table {index + 1} {editingTableIndex === index && '(Editing...)'}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleMoveTableUp(index)} disabled={index === 0 || editingTableIndex !== null}>↑ Up</Button>
                  <Button variant="outline" size="sm" onClick={() => handleMoveTableDown(index)} disabled={index === tables.length - 1 || editingTableIndex !== null}>↓ Down</Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditingTableIndex(index);
                    // Scroll to editor
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }} disabled={editingTableIndex !== null}>✏️ Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleRemoveTable(index)} disabled={editingTableIndex !== null}>Remove</Button>
                </div>
              </div>
              <div 
                dangerouslySetInnerHTML={{ __html: tableHtml }} 
                className="overflow-auto bg-white text-black p-2 border border-gray-200" 
              />
            </div>
            );
          })}
        </div>

        <div className="bg-background rounded-2xl p-6 border-2 border-accent" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
          <h2 className="text-xl font-bold text-primary mb-4">📝 Hindi Translation (Optional)</h2>
          <p className="text-sm text-muted-foreground mb-4">Agar aap Hindi me content dena chahte hain to yahan fill karein. Website par user English/Hindi switch kar payega.</p>
          <div className="space-y-4">
            <div>
              <label className="text-base font-bold text-primary block mb-1">पद का नाम (Name of Post - Hindi)</label>
              <Input value={nameOfPostHi} onChange={e => setNameOfPostHi(e.target.value)} placeholder="e.g. यूपीएससी सीएपीएफ 2026 भर्ती" />
            </div>
            <div>
              <label className="text-base font-bold text-primary block mb-1">पोस्ट तिथि (Post Date - Hindi)</label>
              <div className="flex gap-2 relative">
                <Input value={postDateHi} onChange={e => setPostDateHi(e.target.value)} placeholder="e.g. 21 फरवरी 2026 | 12:12 AM" className="flex-1" />
                <div className="relative w-12 h-10 flex-shrink-0">
                  <DateTimePicker
                    date={parseDateTime(postDateHi, 'hi')}
                    setDate={(d) => {
                      if (d) setPostDateHi(formatDateTime(d.toISOString(), 'hi'));
                    }}
                    customTrigger={
                      <Button type="button" variant="outline" className="w-full h-full p-0 flex items-center justify-center bg-muted/20 hover:bg-muted/50 border-border/60">
                        <CalendarIcon className="w-5 h-5 text-primary opacity-80" />
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-base font-bold text-primary block mb-1">संक्षिप्त जानकारी (Short Info - Hindi, HTML allowed)</label>
              <div className="flex gap-2 mb-2">
                <Button type="button" variant="outline" size="sm" onClick={() => applyFormat(shortInfoHiRef, shortInfoHi, setShortInfoHi, '<b>', '</b>')}><b>B</b></Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyFormat(shortInfoHiRef, shortInfoHi, setShortInfoHi, '<span style="color: red;">', '</span>')} className="text-red-600 font-bold">Red</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyFormat(shortInfoHiRef, shortInfoHi, setShortInfoHi, '<span style="color: blue;">', '</span>')} className="text-blue-600 font-bold">Blue</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyLink(shortInfoHiRef, shortInfoHi, setShortInfoHi)}>🔗 Link</Button>
              </div>
              <Textarea ref={shortInfoHiRef} value={shortInfoHi} onChange={e => setShortInfoHi(e.target.value)} placeholder="पोस्ट के बारे में संक्षिप्त जानकारी..." rows={4} />
            </div>
          </div>
        </div>

        <div className="bg-background rounded-2xl p-6 border-2 border-accent" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
          <h2 className="text-xl font-bold text-primary mb-4">Make Table - Hindi (Excel Editor)</h2>
          <ExcelEditor 
            key={`hi-${editorKeyHi}`} 
            lang="hi" 
            channelId={channelHi} 
            onAddTable={handleAddTableHi} 
            onUpdateTable={editingTableIndexHi !== null ? (html) => handleUpdateTableHtmlHi(editingTableIndexHi, html) : undefined}
            onCancelEdit={() => setEditingTableIndexHi(null)}
            initialHtml={editingTableIndexHi !== null ? tablesHi[editingTableIndexHi] : undefined}
            isEditing={editingTableIndexHi !== null}
          />
          <DirectPasteEditor onAdd={handleAddTableHi} lang="hi" />
        </div>

        <div className="bg-background rounded-2xl p-6 border-2 border-accent" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
          <h2 className="text-xl font-bold text-primary mb-4">Added Tables - Hindi ({tablesHi.length})</h2>
          {tablesHi.length === 0 && <p className="text-muted-foreground">No Hindi tables added yet.</p>}
          {tablesHi.map((tableHtml, index) => {
            if (editingTableIndexHi === index) return null;
            return (
            <div key={index} className={`mb-4 border rounded-lg p-4 ${editingTableIndexHi === index ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-primary">Table {index + 1} (Hindi) {editingTableIndexHi === index && '(Editing...)'}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleMoveTableUpHi(index)} disabled={index === 0 || editingTableIndexHi !== null}>↑ Up</Button>
                  <Button variant="outline" size="sm" onClick={() => handleMoveTableDownHi(index)} disabled={index === tablesHi.length - 1 || editingTableIndexHi !== null}>↓ Down</Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditingTableIndexHi(index);
                    // Scroll to editor
                    window.scrollTo({ top: 800, behavior: 'smooth' });
                  }} disabled={editingTableIndexHi !== null}>✏️ Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleRemoveTableHi(index)} disabled={editingTableIndexHi !== null}>Remove</Button>
                </div>
              </div>
              <div 
                dangerouslySetInnerHTML={{ __html: tableHtml }} 
                className="overflow-auto bg-white text-black p-2 border border-gray-200" 
              />
            </div>
            );
          })}
        </div>

        {/* Preview */}
        <div className="bg-background rounded-2xl p-6" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
          <h2 className="text-xl font-bold text-primary mb-4">Preview</h2>
          <div className="border-t-4 border-primary rounded-lg p-4">
            <table className="post-summary-table w-full mb-5 border-collapse">
              <tbody>
                <tr>
                  <td className="p-2.5 font-bold w-[150px] border border-black/10" style={{ color: '#FF0033' }}>Name of Post:</td>
                  <td className="p-2.5 text-primary font-bold border border-black/10" dangerouslySetInnerHTML={{ __html: previewNameHtml }}></td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold border border-black/10" style={{ color: '#FF0033' }}>Post Date / Update:</td>
                  <td className="p-2.5 text-primary font-bold border border-black/10" dangerouslySetInnerHTML={{ __html: previewDateHtml }}></td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold border border-black/10" style={{ color: '#FF0033' }}>Short Info:</td>
                  <td className="p-2.5 text-primary border border-black/10 short-info-cell" dangerouslySetInnerHTML={{ __html: previewShortInfoHtml }} />
                </tr>
              </tbody>
            </table>
            {previewTablesHtml && <div className="post-tables-content" dangerouslySetInnerHTML={{ __html: previewTablesHtml }} />}
          </div>
        </div>

        {/* Cloudinary Media URLs */}
        <div className="bg-background rounded-2xl p-6" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
          <h2 className="text-xl font-bold text-primary mb-2">🖼️ Media (Images / Videos)</h2>
          <p className="text-sm text-muted-foreground mb-4">Cloudinary Public Delivery URL paste karein. Ye images/videos website par is post me dikhayi dengi.</p>
          <div className="flex gap-2 mb-4">
            <Input
              value={newMediaUrl}
              onChange={e => setNewMediaUrl(e.target.value)}
              placeholder="https://res.cloudinary.com/... (image or video URL)"
              className="flex-1"
              onKeyDown={e => { if (e.key === 'Enter') handleAddMedia(); }}
            />
            <Button onClick={handleAddMedia}>Add Media</Button>
          </div>
          {mediaUrls.length > 0 && (
            <div className="space-y-3">
              {mediaUrls.map((url, index) => {
                const isVideo = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
                return (
                  <div key={index} className="flex items-start gap-3 p-3 bg-secondary rounded-lg">
                    <div className="flex-1">
                      {isVideo ? (
                        <video src={url} controls className="max-w-[300px] max-h-[200px] rounded" />
                      ) : (
                        <img src={url} alt={`Media ${index + 1}`} className="max-w-[300px] max-h-[200px] rounded object-contain" />
                      )}
                      <p className="text-xs text-muted-foreground mt-1 break-all">{url}</p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleRemoveMedia(index)}>Remove</Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPostEditor;
