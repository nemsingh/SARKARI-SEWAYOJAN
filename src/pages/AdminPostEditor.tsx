import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getPostById, createPost, updatePost, getCategories, addCategoryLink, getCategoryLinks, updateCategoryLink, getPostBySlug, getTabletItems, updateTabletItem, deleteCategoryLink } from '@/lib/firebaseService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import ExcelEditor from '@/components/admin/ExcelEditor';
import DirectPasteEditor from '@/components/admin/DirectPasteEditor';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Sun, Moon } from 'lucide-react';

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
  
  // Try direct parsing first
  let d = new Date(dateString);
  if (!isNaN(d.getTime())) return d;
  
  // Try without the pipe character
  const noPipe = dateString.replace('|', '');
  d = new Date(noPipe);
  if (!isNaN(d.getTime())) return d;
  
  // Fallback for Hindi or very custom formats
  try {
    const parts = dateString.split('|').map(p => p.trim());
    if (parts.length !== 2) return undefined;
    
    const dateTokens = parts[0].split(' ');
    if (dateTokens.length < 3) return undefined;
    
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
    
    return new Date(year, monthIndex, day, hours, minutes);
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
  const [lastDateText, setLastDateText] = useState('');
  const [shortInfo, setShortInfo] = useState('');
  const [tablesHtml, setTablesHtml] = useState('');
  const [slug, setSlug] = useState('');
  const [nameOfPostHi, setNameOfPostHi] = useState('');
  const [postDateHi, setPostDateHi] = useState('');
  const [lastDateTextHi, setLastDateTextHi] = useState('');
  const [shortInfoHi, setShortInfoHi] = useState('');
  const [tablesHtmlHi, setTablesHtmlHi] = useState('');
  const [tables, setTables] = useState<string[]>([]);
  const [tablesHi, setTablesHi] = useState<string[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  
  const [pdfUrls, setPdfUrls] = useState<string[]>([]);
  const [newPdfUrl, setNewPdfUrl] = useState('');
  const [showPdfScrollHint, setShowPdfScrollHint] = useState(true);
  
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>([]);
  const [newYoutubeUrl, setNewYoutubeUrl] = useState('');

  const [isThemeBhagwa, setIsThemeBhagwa] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showRawHtml, setShowRawHtml] = useState(false);
  const [showRawHtmlHi, setShowRawHtmlHi] = useState(false);

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
  
  type CategoryLinkInput = {
    id: string;
    title: string;
    categoryId: string;
    postDate: string;
  };
  const [categoryLinksData, setCategoryLinksData] = useState<CategoryLinkInput[]>([
    { id: '', title: '', categoryId: '', postDate: '' }
  ]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user || !user.emailVerified) {
        navigate('/admin-vikaskumar', { replace: true });
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Special handling for live preview to guarantee Short Info links are RED unconditionally
  useEffect(() => {
    const timer = setTimeout(() => {
      const shortInfoCells = document.querySelectorAll('.short-info-cell');
      shortInfoCells.forEach(cell => {
        const shortLinks = cell.querySelectorAll('a');
        shortLinks.forEach(link => {
          if (link.style) link.style.removeProperty('color');
          const children = link.querySelectorAll('*');
          children.forEach((child: any) => { if (child.style) child.style.removeProperty('color'); });
          
          link.classList.add('short-info-link-force');

          // Click states handling via class to ensure we don't block CSS rules
          const handleClickState = () => {
            link.classList.add('force-blue-click');
            setTimeout(() => {
              link.classList.remove('force-blue-click');
            }, 500); // 500ms duration
          };

          link.addEventListener('mousedown', handleClickState);
          link.addEventListener('touchstart', handleClickState, {passive: true});
        });
      });
    }, 300); // 300ms delays to ensure it runs after renders
    return () => clearTimeout(timer);
  }, [shortInfo, shortInfoHi, tablesHtml, tablesHtmlHi]);

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
          setLastDateText(data.last_date_text || '');
          setShortInfo(data.short_info || '');
          setTablesHtml(data.tables_html || '');
          setSlug(data.slug || '');
          setNameOfPostHi(data.name_of_post_hi || '');
          setPostDateHi(data.post_date_hi || '');
          setLastDateTextHi(data.last_date_text_hi || '');
          setShortInfoHi(data.short_info_hi || '');
          setTablesHtmlHi(data.tables_html_hi || '');
          setMediaUrls(data.media_urls || []);
          setPdfUrls(data.pdf_urls || []);
          setShowPdfScrollHint(data.show_pdf_scroll_hint !== undefined ? data.show_pdf_scroll_hint : true);
          setYoutubeUrls(data.youtube_urls || []);
          if (data.tables_html) {
            setTables(Array.from(new DOMParser().parseFromString(data.tables_html, 'text/html').querySelectorAll('table')).map(t => t.outerHTML));
          }
          if (data.tables_html_hi) {
            setTablesHi(Array.from(new DOMParser().parseFromString(data.tables_html_hi, 'text/html').querySelectorAll('table')).map(t => t.outerHTML));
          }
          
          // Fetch existing category link
          const existingLinks = await getCategoryLinks();
          const existingLinksForPost = existingLinks.filter((l: any) => l.url === `/post/${data.slug || id}`);
          if (existingLinksForPost.length > 0) {
            setCategoryLinksData(existingLinksForPost.map((l: any) => ({
              id: l.id || '',
              title: l.title || '',
              categoryId: l.category_id || '',
              postDate: l.post_date || data.post_date || ''
            })));
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

  const syncTablesFromHtml = (html: string) => {
    return Array.from(new DOMParser().parseFromString(html, 'text/html').querySelectorAll('table')).map(t => t.outerHTML);
  };

  const handleAddTable = (tableHtml: string) => {
    const newHtml = tablesHtml ? `${tablesHtml}\n${tableHtml}` : tableHtml;
    setTablesHtml(newHtml);
    setTables(syncTablesFromHtml(newHtml));
  };

  const handleRemoveTable = (index: number) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(tablesHtml, 'text/html');
    const tableNodes = doc.querySelectorAll('table');
    if (tableNodes[index]) {
      const table = tableNodes[index];
      if (table.parentElement?.tagName.toLowerCase() === 'div' && table.parentElement.style.overflowX) {
          table.parentElement.remove();
      } else {
          table.remove();
      }
      const newHtml = doc.body.innerHTML;
      setTablesHtml(newHtml);
      setTables(syncTablesFromHtml(newHtml));
    }
  };

  const handleAddTableHi = (tableHtml: string) => {
    const newHtml = tablesHtmlHi ? `${tablesHtmlHi}\n${tableHtml}` : tableHtml;
    setTablesHtmlHi(newHtml);
    setTablesHi(syncTablesFromHtml(newHtml));
  };

  const handleRemoveTableHi = (index: number) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(tablesHtmlHi, 'text/html');
    const tableNodes = doc.querySelectorAll('table');
    if (tableNodes[index]) {
      const table = tableNodes[index];
      if (table.parentElement?.tagName.toLowerCase() === 'div' && table.parentElement.style.overflowX) {
          table.parentElement.remove();
      } else {
          table.remove();
      }
      const newHtml = doc.body.innerHTML;
      setTablesHtmlHi(newHtml);
      setTablesHi(syncTablesFromHtml(newHtml));
    }
  };

  const handleMoveTableUp = (index: number) => {
    if (index === 0) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(tablesHtml, 'text/html');
    const tableNodes = doc.querySelectorAll('table');
    if (tableNodes[index] && tableNodes[index - 1]) {
      const wrapper1 = tableNodes[index - 1].parentElement;
      const wrapper2 = tableNodes[index].parentElement;
      const isW1 = wrapper1?.tagName.toLowerCase() === 'div' && !!wrapper1?.style.overflowX;
      const isW2 = wrapper2?.tagName.toLowerCase() === 'div' && !!wrapper2?.style.overflowX;
      const node1 = isW1 ? wrapper1 : tableNodes[index - 1];
      const node2 = isW2 ? wrapper2 : tableNodes[index];
      const clone1 = node1.cloneNode(true);
      const clone2 = node2.cloneNode(true);
      node1.replaceWith(clone2);
      node2.replaceWith(clone1);
      const newHtml = doc.body.innerHTML;
      setTablesHtml(newHtml);
      setTables(syncTablesFromHtml(newHtml));
    }
  };

  const handleMoveTableDown = (index: number) => {
    if (index === tables.length - 1) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(tablesHtml, 'text/html');
    const tableNodes = doc.querySelectorAll('table');
    if (tableNodes[index] && tableNodes[index + 1]) {
      const wrapper1 = tableNodes[index].parentElement;
      const wrapper2 = tableNodes[index + 1].parentElement;
      const isW1 = wrapper1?.tagName.toLowerCase() === 'div' && !!wrapper1?.style.overflowX;
      const isW2 = wrapper2?.tagName.toLowerCase() === 'div' && !!wrapper2?.style.overflowX;
      const node1 = isW1 ? wrapper1 : tableNodes[index];
      const node2 = isW2 ? wrapper2 : tableNodes[index + 1];
      const clone1 = node1.cloneNode(true);
      const clone2 = node2.cloneNode(true);
      node1.replaceWith(clone2);
      node2.replaceWith(clone1);
      const newHtml = doc.body.innerHTML;
      setTablesHtml(newHtml);
      setTables(syncTablesFromHtml(newHtml));
    }
  };

  const handleUpdateTableHtml = (index: number, newHtml: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(tablesHtml, 'text/html');
    const tableNodes = doc.querySelectorAll('table');
    if (tableNodes[index]) {
      const temp = document.createElement('div');
      temp.innerHTML = newHtml;
      const newTable = temp.querySelector('table');
      if (newTable) {
        tableNodes[index].replaceWith(newTable);
      }
      const updatedHtml = doc.body.innerHTML;
      setTablesHtml(updatedHtml);
      setTables(syncTablesFromHtml(updatedHtml));
    }
    setEditingTableIndex(null);
  };

  const handleMoveTableUpHi = (index: number) => {
    if (index === 0) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(tablesHtmlHi, 'text/html');
    const tableNodes = doc.querySelectorAll('table');
    if (tableNodes[index] && tableNodes[index - 1]) {
      const wrapper1 = tableNodes[index - 1].parentElement;
      const wrapper2 = tableNodes[index].parentElement;
      const isW1 = wrapper1?.tagName.toLowerCase() === 'div' && !!wrapper1?.style.overflowX;
      const isW2 = wrapper2?.tagName.toLowerCase() === 'div' && !!wrapper2?.style.overflowX;
      const node1 = isW1 ? wrapper1 : tableNodes[index - 1];
      const node2 = isW2 ? wrapper2 : tableNodes[index];
      const clone1 = node1.cloneNode(true);
      const clone2 = node2.cloneNode(true);
      node1.replaceWith(clone2);
      node2.replaceWith(clone1);
      const newHtml = doc.body.innerHTML;
      setTablesHtmlHi(newHtml);
      setTablesHi(syncTablesFromHtml(newHtml));
    }
  };

  const handleMoveTableDownHi = (index: number) => {
    if (index === tablesHi.length - 1) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(tablesHtmlHi, 'text/html');
    const tableNodes = doc.querySelectorAll('table');
    if (tableNodes[index] && tableNodes[index + 1]) {
      const wrapper1 = tableNodes[index].parentElement;
      const wrapper2 = tableNodes[index + 1].parentElement;
      const isW1 = wrapper1?.tagName.toLowerCase() === 'div' && !!wrapper1?.style.overflowX;
      const isW2 = wrapper2?.tagName.toLowerCase() === 'div' && !!wrapper2?.style.overflowX;
      const node1 = isW1 ? wrapper1 : tableNodes[index];
      const node2 = isW2 ? wrapper2 : tableNodes[index + 1];
      const clone1 = node1.cloneNode(true);
      const clone2 = node2.cloneNode(true);
      node1.replaceWith(clone2);
      node2.replaceWith(clone1);
      const newHtml = doc.body.innerHTML;
      setTablesHtmlHi(newHtml);
      setTablesHi(syncTablesFromHtml(newHtml));
    }
  };

  const handleUpdateTableHtmlHi = (index: number, newHtml: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(tablesHtmlHi, 'text/html');
    const tableNodes = doc.querySelectorAll('table');
    if (tableNodes[index]) {
      const temp = document.createElement('div');
      temp.innerHTML = newHtml;
      const newTable = temp.querySelector('table');
      if (newTable) {
        tableNodes[index].replaceWith(newTable);
      }
      const updatedHtml = doc.body.innerHTML;
      setTablesHtmlHi(updatedHtml);
      setTablesHi(syncTablesFromHtml(updatedHtml));
    }
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

  const handleAddPdf = () => {
    if (newPdfUrl.trim()) {
      setPdfUrls(prev => [...prev, newPdfUrl.trim()]);
      setNewPdfUrl('');
    }
  };

  const handleRemovePdf = (index: number) => {
    setPdfUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddYoutube = () => {
    if (newYoutubeUrl.trim()) {
      setYoutubeUrls(prev => [...prev, newYoutubeUrl.trim()]);
      setNewYoutubeUrl('');
    }
  };

  const handleRemoveYoutube = (index: number) => {
    setYoutubeUrls(prev => prev.filter((_, i) => i !== index));
  };

  const clearForm = () => {
    setNameOfPost('');
    setPostDate('');
    setLastDateText('');
    setShortInfo('');
    setTablesHtml('');
    setSlug('');
    setNameOfPostHi('');
    setPostDateHi('');
    setLastDateTextHi('');
    setShortInfoHi('');
    setTablesHtmlHi('');
    setTables([]);
    setTablesHi([]);
    setMediaUrls([]);
    setNewMediaUrl('');
    setPdfUrls([]);
    setNewPdfUrl('');
    setShowPdfScrollHint(true);
    setYoutubeUrls([]);
    setNewYoutubeUrl('');
    setCategoryLinksData([{ id: '', title: '', categoryId: '', postDate: '' }]);
    setEditorKey(prev => prev + 1);
    setEditorKeyHi(prev => prev + 1);
  };

  const handleSave = async () => {
    if (!nameOfPost.trim()) {
      toast({ title: 'Error', description: 'Name of Post is required.', variant: 'destructive' });
      return;
    }
    
    if (isSaving) return;
    setIsSaving(true);

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

    const inputDate = parseDateTime(postDate, 'en');
    const customTs = inputDate ? inputDate.getTime() : Date.now();

    const postData: any = {
      name_of_post: nameOfPost,
      post_date: postDate,
      last_date_text: lastDateText || null,
      post_timestamp: customTs,
      short_info: shortInfo,
      tables_html: tablesHtml,
      slug: finalSlug,
      name_of_post_hi: nameOfPostHi || null,
      post_date_hi: postDateHi || null,
      last_date_text_hi: lastDateTextHi || null,
      short_info_hi: shortInfoHi || null,
      tables_html_hi: tablesHtmlHi || null,
      media_urls: mediaUrls.length > 0 ? mediaUrls : null,
      pdf_urls: pdfUrls.length > 0 ? pdfUrls : null,
      show_pdf_scroll_hint: showPdfScrollHint,
      youtube_urls: youtubeUrls.length > 0 ? youtubeUrls : null,
    };

    try {
      const payloadSize = new Blob([JSON.stringify(postData)]).size;
      if (payloadSize > 850000) {
         console.log(`Payload size: ${(payloadSize/1024/1024).toFixed(2)} MB. Chunking will be applied automatically.`);
      }
    } catch (e) {
      console.warn("Could not calculate payload size", e);
    }

    try {
      const addedOrUpdatedLinks: any[] = [];
      const deletedLinkIds: string[] = [];
      const updatedTabletItems: any[] = [];
      let savedPost: any = null;

      if (isNew) {
        const result = await createPost(postData);
        let linksAdded = false;
        
        savedPost = {
          id: result.id,
          ...postData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        for (const link of categoryLinksData) {
          if (link.title.trim() && link.categoryId) {
            const linkDate = categoryLinksData.length > 1 ? (link.postDate || postDate) : postDate;
            const customDate = parseDateTime(linkDate, 'en');
            const customTimestamp = customDate ? customDate.getTime() : customTs;
            
            const linkRef = await addCategoryLink({
              category_id: link.categoryId,
              title: link.title.trim(),
              url: `/post/${finalSlug || result.id}`,
              link_timestamp: customTimestamp,
              post_date: linkDate,
              is_new: true,
              last_date_text: null,
            });

            addedOrUpdatedLinks.push({
              id: linkRef.id,
              category_id: link.categoryId,
              title: link.title.trim(),
              url: `/post/${finalSlug || result.id}`,
              link_timestamp: customTimestamp,
              post_date: linkDate,
              is_new: true,
              last_date_text: null,
            });

            linksAdded = true;
          }
        }
        
        if (linksAdded) {
          toast({ title: 'Post created & added to categories!', description: 'Please wait up to 3 minutes or click "Publish Website" from the Dashboard to see it live.' });
        } else {
          toast({ title: 'Post created!', description: 'Click "Publish Website" from the Dashboard to make the changes live.' });
        }
        // Clear form for new post creation
        clearForm();
      } else {
        const oldPost = await getPostById(id!);
        const oldSlug = oldPost?.slug || id;

        await updatePost(id!, postData);

        savedPost = {
          id: id!,
          ...postData,
          created_at: oldPost?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const existingLinks = await getCategoryLinks();
        const existingLinksForPost = existingLinks.filter((l: any) => l.url === `/post/${oldSlug}`);
        
        for (const link of categoryLinksData) {
          if (link.title.trim() && link.categoryId) {
            const linkDate = categoryLinksData.length > 1 ? (link.postDate || postDate) : postDate;
            const customDate = parseDateTime(linkDate, 'en');
            const customTimestamp = customDate ? customDate.getTime() : customTs;
            
            if (link.id) {
              await updateCategoryLink(link.id, {
                title: link.title.trim(),
                category_id: link.categoryId,
                url: `/post/${finalSlug}`,
                link_timestamp: customTimestamp,
                post_date: linkDate,
                is_new: true
              });
              addedOrUpdatedLinks.push({
                id: link.id,
                title: link.title.trim(),
                category_id: link.categoryId,
                url: `/post/${finalSlug}`,
                link_timestamp: customTimestamp,
                post_date: linkDate,
                is_new: true,
                last_date_text: link.last_date_text || null
              });
            } else {
              const linkRef = await addCategoryLink({
                category_id: link.categoryId,
                title: link.title.trim(),
                url: `/post/${finalSlug}`,
                link_timestamp: customTimestamp,
                post_date: linkDate,
                is_new: true,
                last_date_text: null,
              });
              addedOrUpdatedLinks.push({
                id: linkRef.id,
                category_id: link.categoryId,
                title: link.title.trim(),
                url: `/post/${finalSlug}`,
                link_timestamp: customTimestamp,
                post_date: linkDate,
                is_new: true,
                last_date_text: null,
              });
            }
          }
        }
        
        // Find links that were removed in the UI
        for (const extLink of existingLinksForPost) {
          const stillExists = categoryLinksData.find(l => l.id === extLink.id);
          if (!stillExists) {
             await deleteCategoryLink(extLink.id);
             deletedLinkIds.push(extLink.id);
          } else if (oldSlug !== finalSlug) {
             const updatedUrl = `/post/${finalSlug}`;
             await updateCategoryLink(extLink.id, { url: updatedUrl, is_new: true });
             addedOrUpdatedLinks.push({
               ...extLink,
               url: updatedUrl,
               is_new: true
             });
          }
        }
        
        if (oldSlug !== finalSlug) {
          const tItems = await getTabletItems();
          for (const item of tItems) {
            if (item.url === `/post/${oldSlug}`) {
              await updateTabletItem(item.id, { url: `/post/${finalSlug}` });
              updatedTabletItems.push({
                ...item,
                url: `/post/${finalSlug}`
              });
            }
          }
        }

        toast({ title: 'Post updated!', description: 'Click "Publish Website" from the Dashboard to see changes live.' });
      }

      // Broadcast changes to other tabs/windows for immediate sync or automatic layout update
      try {
        const syncChannel = new BroadcastChannel('admin_sync');
        syncChannel.postMessage({ 
          type: 'SYNC_ITEM_UPDATE',
          updatedPost: savedPost,
          updatedLinks: addedOrUpdatedLinks,
          deletedLinkIds: deletedLinkIds,
          updatedTabletItems: updatedTabletItems
        });
        syncChannel.close();
      } catch (e) {
        console.warn('Sync broadcast warning:', e);
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast({ title: 'Error saving post', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
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

  const copyRichText = async (html: string) => {
    try {
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([html.replace(/<[^>]*>?/gm, '')], { type: 'text/plain' });
      const data = [new ClipboardItem({
        ['text/html']: blobHtml,
        ['text/plain']: blobText,
      })];
      await navigator.clipboard.write(data);
      toast({ title: 'Copied!', description: 'Content successfully copied.' });
    } catch (error) {
      console.warn("Clipboard API failed, falling back to execCommand", error);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      // Inline styles help retain Word formatting.
      document.body.appendChild(tempDiv);
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(tempDiv);
      selection?.removeAllRanges();
      selection?.addRange(range);
      try {
        document.execCommand('copy');
        toast({ title: 'Copied!', description: 'Content successfully copied.' });
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to copy', variant: 'destructive' });
      }
      selection?.removeAllRanges();
      document.body.removeChild(tempDiv);
    }
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

  const handleBack = () => {
    if (window.opener || window.history.length <= 1) {
      window.close();
    } else {
      navigate('/admin');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-primary font-bold">Loading...</div>;

  return (
    <div className="admin-panel min-h-screen bg-secondary">
      <div className="bg-background py-4 px-6 flex justify-between items-center" style={{ boxShadow: 'var(--box-shadow-light)' }}>
        <h1 className="text-2xl font-black text-primary">{isNew ? 'Create New Post' : 'Edit Post'}</h1>
        <div className="flex gap-3 items-center">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-black/10 transition-colors mr-2"
            title="Switch Theme"
          >
            {isThemeBhagwa ? <Sun className="w-6 h-6 text-black" /> : <Moon className="w-6 h-6 text-primary" />}
          </button>
          <Button variant="outline" onClick={handleBack}>← Back</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Post'}</Button>
          <Button variant="outline" onClick={handleDownloadHtml}>📥 Download HTML</Button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto p-6 space-y-6">
        {/* Optional: Link to Category Box */}
        <div className="bg-background rounded-2xl p-6 border-2 border-primary/30" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-primary">🔗 {isNew ? 'Add to Category Box (Optional)' : 'Category Box Link'}</h2>
            <Button variant="outline" size="sm" onClick={() => {
              setCategoryLinksData(prev => [
                ...prev,
                { id: '', title: prev[0].title || nameOfPost, categoryId: prev[0].categoryId || '', postDate: postDate }
              ]);
            }}>
              + Add Category link
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Agar aap dono fields fill karenge to ye post automatically selected category box me show hogi.</p>
          
          <div className="space-y-4">
            {categoryLinksData.map((link, index) => (
              <div key={index} className="flex gap-3 flex-wrap items-end border-b border-border pb-4 last:border-0 last:pb-0 relative">
                {categoryLinksData.length > 1 && (
                  <Button 
                    variant="destructive" size="sm" 
                    className="absolute -right-2 -top-2 h-6 w-6 rounded-full p-0 flex items-center justify-center leading-none"
                    onClick={() => {
                      setCategoryLinksData(prev => prev.filter((_, i) => i !== index));
                    }}
                  >
                    ×
                  </Button>
                )}
                <div className="flex-1 min-w-[200px]">
                  <label className="text-base font-bold text-primary block mb-1">Link Title</label>
                  <Input value={link.title} onChange={e => {
                    const newLinks = [...categoryLinksData];
                    newLinks[index].title = e.target.value;
                    setCategoryLinksData(newLinks);
                  }} placeholder="e.g. UPSC CAPF 2026 Apply Online" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-base font-bold text-primary block mb-1">Category</label>
                  <select
                    value={link.categoryId}
                    onChange={e => {
                      const newLinks = [...categoryLinksData];
                      newLinks[index].categoryId = e.target.value;
                      setCategoryLinksData(newLinks);
                    }}
                    className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background text-base text-primary"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                
                {categoryLinksData.length > 1 && (
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-base font-bold text-primary block mb-1 text-red-600">Post Date / Update (For this link)</label>
                    <div className="flex gap-2 relative">
                      <Input value={link.postDate} onChange={e => {
                        const newLinks = [...categoryLinksData];
                        newLinks[index].postDate = e.target.value;
                        setCategoryLinksData(newLinks);
                      }} placeholder="e.g. 21 February 2026 | 12:12 AM" className="flex-1 border-red-500 text-red-600 font-bold" />
                      <div className="relative w-12 h-10 flex-shrink-0">
                        <DateTimePicker
                          date={parseDateTime(link.postDate, 'en')}
                          setDate={(d) => {
                            if (d) {
                              const newLinks = [...categoryLinksData];
                              newLinks[index].postDate = formatDateTime(d.toISOString(), 'en');
                              setCategoryLinksData(newLinks);
                            }
                          }}
                          customTrigger={
                            <Button type="button" variant="outline" className="w-full h-full p-0 flex items-center justify-center border-red-500 text-red-600 hover:bg-red-50">
                              📅
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-background rounded-2xl p-6" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
          <h2 className="text-xl font-bold text-primary mb-4">Post Information (English)</h2>
          <div className="space-y-4">
            <div>
              <label className="text-base font-bold text-primary block mb-1">Name of Post</label>
              <Input 
                value={nameOfPost} 
                onChange={e => {
                  setNameOfPost(e.target.value);
                  setSlug(generateShortSlug(e.target.value));
                }} 
                placeholder="e.g. UPSC CAPF 2026 Recruitment" 
              />
            </div>
            <div>
              <label className="text-base font-bold text-primary block mb-1">URL Slug</label>
              <Input value={slug} onChange={e => setSlug(generateSlug(e.target.value))} placeholder="e.g. upsc-capf-2026-recruitment" />
              <p className="text-sm text-muted-foreground mt-1">Auto-generated from title. URL: /post/{slug || 'auto-generated'}</p>
            </div>
            <div>
              <label className="text-base font-bold text-primary block mb-1">Post Date / Update</label>
              <div className="flex gap-2 relative">
                <Input value={postDate} onChange={e => setPostDate(e.target.value)} placeholder="e.g. 21 February 2026 | 12:12 AM" className="flex-1" disabled={categoryLinksData.length > 1} />
                <div className="relative w-12 h-10 flex-shrink-0">
                  <DateTimePicker
                    date={parseDateTime(postDate, 'en')}
                    setDate={(d) => {
                      if (d) setPostDate(formatDateTime(d.toISOString(), 'en'));
                    }}
                    customTrigger={
                      <Button type="button" variant="outline" className="w-full h-full p-0 flex items-center justify-center" disabled={categoryLinksData.length > 1}>
                        📅
                      </Button>
                    }
                  />
                </div>
              </div>
              {categoryLinksData.length > 1 && (
                <p className="text-xs text-red-500 mt-1 font-bold">Multiple category links enabled. Global date is disabled, set dates in category links list.</p>
              )}
            </div>
            <div>
              <label className="text-base font-bold text-primary block mb-1">Last Date / Extra Text (Red text below link in Latest Jobs)</label>
              <Input value={lastDateText} onChange={e => setLastDateText(e.target.value)} placeholder="e.g. Last Date : 11/05/2026 or Extended" />
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-primary">Added Tables & Content - English</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => copyRichText(tablesHtml)} title="Copy entirely formatted tables and text for Word">
                📋 Copy All Tables
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowRawHtml(!showRawHtml)}>
                {showRawHtml ? 'Hide HTML Source' : 'Edit HTML Source'}
              </Button>
            </div>
          </div>
          
          {showRawHtml && (
            <div className="mb-6 p-4 border border-blue-200 bg-blue-50/50 rounded-lg">
              <h3 className="text-sm font-bold text-blue-800 mb-2">Raw HTML Source (Advanced)</h3>
              <p className="text-xs text-blue-600 mb-2">This contains all tables and text. You can manually edit or fix formatting here.</p>
              <Textarea 
                value={tablesHtml} 
                onChange={e => {
                  setTablesHtml(e.target.value);
                  setTables(syncTablesFromHtml(e.target.value));
                }}
                className="font-mono text-xs w-full min-h-[300px] p-2 bg-white"
              />
            </div>
          )}

          {!showRawHtml && tables.length === 0 && <p className="text-muted-foreground">No tables added yet.</p>}
          {!showRawHtml && tables.map((tableHtml, index) => {
            if (editingTableIndex === index) return null;
            return (
            <div key={index} className={`mb-4 border rounded-lg p-4 ${editingTableIndex === index ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-primary">Table {index + 1} {editingTableIndex === index && '(Editing...)'}</span>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Button variant="outline" size="sm" onClick={() => handleMoveTableUp(index)} disabled={index === 0 || editingTableIndex !== null}>↑</Button>
                  <Button variant="outline" size="sm" onClick={() => handleMoveTableDown(index)} disabled={index === tables.length - 1 || editingTableIndex !== null}>↓</Button>
                  <Button variant="outline" size="sm" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" onClick={() => copyRichText(tableHtml)}>📋 Copy</Button>
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
                       <Button type="button" variant="outline" className="w-full h-full p-0 flex items-center justify-center">
                        📅
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-base font-bold text-primary block mb-1">अंतिम तिथि / अतिरिक्त पाठ (Last Date / Extra Text - Hindi)</label>
              <Input value={lastDateTextHi} onChange={e => setLastDateTextHi(e.target.value)} placeholder="e.g. अंतिम तिथि : 11/05/2026" />
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

        <div className="bg-background rounded-2xl p-6 mb-6 border-2 border-accent" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-primary">Added Tables & Content - Hindi</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => copyRichText(tablesHtmlHi)} title="Copy entirely formatted tables and text for Word">
                📋 Copy All Tables
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowRawHtmlHi(!showRawHtmlHi)}>
                {showRawHtmlHi ? 'Hide HTML Source' : 'Edit HTML Source'}
              </Button>
            </div>
          </div>
          
          {showRawHtmlHi && (
            <div className="mb-6 p-4 border border-blue-200 bg-blue-50/50 rounded-lg">
              <h3 className="text-sm font-bold text-blue-800 mb-2">Raw HTML Source (Advanced)</h3>
              <p className="text-xs text-blue-600 mb-2">This contains all tables and text. You can manually edit or fix formatting here.</p>
              <Textarea 
                value={tablesHtmlHi} 
                onChange={e => {
                  setTablesHtmlHi(e.target.value);
                  setTablesHi(syncTablesFromHtml(e.target.value));
                }}
                className="font-mono text-xs w-full min-h-[300px] p-2 bg-white"
              />
            </div>
          )}

          {!showRawHtmlHi && tablesHi.length === 0 && <p className="text-muted-foreground">No Hindi tables added yet.</p>}
          {!showRawHtmlHi && tablesHi.map((tableHtml, index) => {
            if (editingTableIndexHi === index) return null;
            return (
            <div key={index} className={`mb-4 border rounded-lg p-4 ${editingTableIndexHi === index ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-primary">Table {index + 1} (Hindi) {editingTableIndexHi === index && '(Editing...)'}</span>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Button variant="outline" size="sm" onClick={() => handleMoveTableUpHi(index)} disabled={index === 0 || editingTableIndexHi !== null}>↑</Button>
                  <Button variant="outline" size="sm" onClick={() => handleMoveTableDownHi(index)} disabled={index === tablesHi.length - 1 || editingTableIndexHi !== null}>↓</Button>
                  <Button variant="outline" size="sm" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" onClick={() => copyRichText(tableHtml)}>📋 Copy</Button>
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
          <div className="border-t-4 border-primary rounded-lg p-4" onClick={(e) => {
            const target = e.target as HTMLElement;
            const anchor = target.closest('a');
            if (anchor) {
              e.preventDefault();
              e.stopPropagation();
              const isShortInfo = !!anchor.closest('.short-info-cell');
              const isTables = !!anchor.closest('.post-tables-content');
              
              const currentHref = anchor.getAttribute('href') || (anchor as HTMLAnchorElement).href || '';
              const container = e.currentTarget;
              
              setTimeout(() => {
                const shouldVisit = window.confirm(`Current Link: ${currentHref}\n\nDo you want to OPEN this link in a new tab?\n(Click Cancel to edit the URL instead)`);
                if (shouldVisit) {
                  window.open(currentHref, '_blank');
                } else {
                  const newHref = prompt('Update Link URL (leave empty to remove link):', currentHref);
                  if (newHref !== null) {
                    if (newHref.trim() === '') {
                      const childNodes = Array.from(anchor.childNodes);
                      const parent = anchor.parentNode;
                      if (parent) {
                          childNodes.forEach(child => parent.insertBefore(child, anchor));
                          parent.removeChild(anchor);
                      }
                    } else {
                      anchor.setAttribute('href', newHref);
                      if (!anchor.getAttribute('target')) {
                         anchor.setAttribute('target', '_blank');
                      }
                    }
                    
                    if (isShortInfo) {
                       const cell = container.querySelector('.short-info-cell');
                       if (cell) setShortInfo(cell.innerHTML);
                    } else if (isTables) {
                       const cell = container.querySelector('.post-tables-content');
                       if (cell) {
                          setTablesHtml(cell.innerHTML);
                          setTables(syncTablesFromHtml(cell.innerHTML));
                       }
                    }
                  }
                }
              }, 10);
            }
          }}>

            <table className="post-summary-table w-full mb-5 border-collapse">
              <tbody>
                <tr>
                  <td className="p-2.5 font-bold w-[150px] border border-black/10" style={{ color: '#FF0033' }}>Name of Post:</td>
                  <td className="p-2.5 text-primary font-bold border border-black/10" dangerouslySetInnerHTML={{ __html: nameOfPost ? nameOfPost.replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>') : '' }}></td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold border border-black/10" style={{ color: '#FF0033' }}>Post Date / Update:</td>
                  <td className="p-2.5 text-primary font-bold border border-black/10" dangerouslySetInnerHTML={{ __html: postDate ? postDate.replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>') : '' }}></td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold border border-black/10" style={{ color: '#FF0033' }}>Short Info:</td>
                  <td className="p-2.5 text-primary border border-black/10 short-info-cell" dangerouslySetInnerHTML={{ __html: shortInfo ? shortInfo.replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>') : '' }} />
                </tr>
              </tbody>
            </table>
            {tablesHtml && <div className="post-tables-content" dangerouslySetInnerHTML={{ __html: tablesHtml.replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>') }} />}
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

        {/* PDF URLs */}
        <div className="bg-background rounded-2xl p-6" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
          <h2 className="text-xl font-bold text-primary mb-2">📄 PDF Viewers (Public URL)</h2>
          <p className="text-sm text-muted-foreground mb-4">Google Drive Public URL, Cloudinary PDF URL dalen. PDF browser par hi open hogi.</p>
          <div className="flex gap-2 mb-4">
            <Input
              value={newPdfUrl}
              onChange={e => setNewPdfUrl(e.target.value)}
              placeholder="https://.../file.pdf"
              className="flex-1"
              onKeyDown={e => { if (e.key === 'Enter') handleAddPdf(); }}
            />
            <Button onClick={handleAddPdf}>Add PDF</Button>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <input 
              type="checkbox" 
              id="showPdfScrollHint" 
              checked={showPdfScrollHint} 
              onChange={e => setShowPdfScrollHint(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor="showPdfScrollHint" className="text-sm font-medium cursor-pointer">
               Show "Scroll for more pages" text above PDF (Agar PDF me 1 se jyada pages hain)
            </label>
          </div>
          {pdfUrls.length > 0 && (
            <div className="space-y-3">
              {pdfUrls.map((url, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                     <p className="text-sm text-primary font-medium">PDF {index + 1}</p>
                     <p className="text-xs text-muted-foreground break-all">{url}</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleRemovePdf(index)}>Remove</Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* YouTube Video URLs */}
        <div className="bg-background rounded-2xl p-6" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
          <h2 className="text-xl font-bold text-primary mb-2">▶️ YouTube Videos</h2>
          <p className="text-sm text-muted-foreground mb-4">YouTube video ka link yaha dalen (e.g. https://www.youtube.com/watch?v=...).</p>
          <div className="flex gap-2 mb-4">
            <Input
              value={newYoutubeUrl}
              onChange={e => setNewYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1"
              onKeyDown={e => { if (e.key === 'Enter') handleAddYoutube(); }}
            />
            <Button onClick={handleAddYoutube}>Add YouTube Video</Button>
          </div>
          {youtubeUrls.length > 0 && (
            <div className="space-y-3">
              {youtubeUrls.map((url, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                     <p className="text-sm text-primary font-medium">YouTube Video {index + 1}</p>
                     <p className="text-xs text-muted-foreground break-all">{url}</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleRemoveYoutube(index)}>Remove</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPostEditor;
