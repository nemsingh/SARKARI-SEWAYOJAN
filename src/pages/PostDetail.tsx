import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCache, setCache } from '@/lib/cache';
import { getPostBySlug, getPostById } from '@/lib/firebaseService';
import { supabase } from '@/integrations/supabase/client';
import { googleTranslate } from '@/lib/googleTranslate';
import SiteHeader from '@/components/website/SiteHeader';
import SiteMenu from '@/components/website/SiteMenu';
import Sidebar from '@/components/website/Sidebar';
import CategoryBox from '@/components/website/CategoryBox';
import SiteFooter from '@/components/website/SiteFooter';

// Fields that can be translated, mapped to their Hindi manual counterparts
const TRANSLATABLE_FIELDS = [
  { en: 'name_of_post', hi: 'name_of_post_hi' },
  { en: 'post_date', hi: 'post_date_hi' },
  { en: 'short_info', hi: 'short_info_hi' },
  { en: 'tables_html', hi: 'tables_html_hi' },
] as const;

const PostDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const getInitialData = () => {
    if (typeof window !== 'undefined' && (window as any).__INITIAL_DATA__) {
      return (window as any).__INITIAL_DATA__;
    }
    if (typeof global !== 'undefined' && (global as any).__INITIAL_DATA__) {
      return (global as any).__INITIAL_DATA__;
    }
    return null;
  };

  const initialData = getInitialData();

  const [post, setPost] = useState<any>(() => {
    if (initialData) {
      if (initialData[`post_${slug}`]) {
        return initialData[`post_${slug}`];
      }
      const allPosts = initialData.posts || [];
      return allPosts.find((p: any) => p.slug === slug || p.id === slug) || 
             allPosts.find((p: any) => p.slug && p.slug.startsWith(slug)) || null;
    }
    return getCache<any>(`post_${slug}`) || null;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [categories, setCategories] = useState<any[]>(() => initialData?.categories || getCache('categories') || []);
  const [categoryLinks, setCategoryLinks] = useState<any[]>(() => initialData?.category_links || getCache('category_links') || []);
  const [settings, setSettings] = useState<Record<string, string>>(() => initialData?.settings_flat || getCache('settings_flat') || {});
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState<Record<string, string>>({});
  const [translationSource, setTranslationSource] = useState<'ai' | 'google' | null>(null);

  const [notFound, setNotFound] = useState(() => {
    if (initialData) {
      const allPosts = initialData.posts || [];
      const p = allPosts.find((p: any) => p.slug === slug || p.id === slug) ||
                allPosts.find((p: any) => p.slug && p.slug.startsWith(slug));
      return !p;
    }
    return false;
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;

      // Try cache first
      let cachedPost = getCache<any>(`post_${slug}`);
      const cachedCats = getCache<any[]>('categories');
      const cachedLinks = getCache<any[]>('category_links');
      const cachedSettings = getCache<Record<string, string>>('settings_flat');

      const isStaticMode = (typeof window !== 'undefined' && (window as any).__INITIAL_DATA__) || (typeof global !== 'undefined' && (global as any).__INITIAL_DATA__);
      let data: any;

      if (isStaticMode) {
        data = (window as any).__INITIAL_DATA__ || (global as any).__INITIAL_DATA__;
      } else {
        try {
          const res = await fetch('/data.json');
          if (res.ok) {
            data = await res.json();
          }
        } catch (e) {
          console.error('Fetch error:', e);
        }
      }

      if (data) {
        const allPosts = data.posts || [];
        const cats = data.categories || [];
        const links = data.category_links || [];
        const sett = data.settings_flat || {};

        let postData = data[`post_${slug}`] || 
                       allPosts.find((p: any) => p.slug === slug || p.id === slug) ||
                       allPosts.find((p: any) => p.slug && p.slug.startsWith(slug));
        
        // Fallback to Firebase if not found in static data or if it's missing tables_html (stripped version) or in DEV mode
        if (!postData || !postData.tables_html || import.meta.env.DEV) {
          try {
            const fbPost = await getPostBySlug(slug);
            if (fbPost) {
              postData = fbPost;
            } else {
              const fbPostById = await getPostById(slug);
              if (fbPostById) postData = fbPostById;
            }
          } catch (err) {
            console.error("Error fetching from Firebase fallback:", err);
          }
        }

        if (postData) {
          setPost(postData);
          setCache(`post_${slug}`, postData);
          setNotFound(false);
        } else {
          setNotFound(true);
        }
        setCategories(cats);
        setCategoryLinks(links);
        setSettings(sett);
        setCache('categories', cats);
        setCache('category_links', links);
        setCache('settings_flat', sett);
      } else {
        // If data.json fails, try Firebase directly
        try {
          let postData = await getPostBySlug(slug);
          if (!postData) {
            postData = await getPostById(slug);
          }
          if (postData) {
            setPost(postData);
            setNotFound(false);
          } else {
            setNotFound(true);
          }
        } catch (err) {
          setNotFound(true);
        }
      }
    };
    fetchData();
  }, [slug]);

  // Determine which fields need translation (not manually filled by admin)
  const getFieldsNeedingTranslation = useCallback(() => {
    if (!post) return [];
    return TRANSLATABLE_FIELDS.filter(
      ({ en, hi }) => !post[hi] && post[en] // No manual Hindi, but English exists
    ).map(({ en }) => en);
  }, [post]);

  // Try AI translation first, then Google Translate as fallback
  const translateFields = useCallback(async () => {
    if (!post || translating) return;
    const fieldsToTranslate = getFieldsNeedingTranslation();
    if (fieldsToTranslate.length === 0) return; // All fields have manual Hindi

    setTranslating(true);
    const results: Record<string, string> = {};
    let aiSuccess = true;

    // Step 1: Try Lovable AI translation
    try {
      await Promise.all(
        fieldsToTranslate.map(async (key) => {
          const { data, error } = await supabase.functions.invoke('translate', {
            body: { text: post[key], targetLang: 'hi' },
          });
          if (error || !data?.translated) {
            throw new Error(`AI translation failed for ${key}`);
          }
          results[key] = data.translated;
        })
      );
      setTranslationSource('ai');
      console.log('✅ AI translation successful for fields:', fieldsToTranslate);
    } catch (aiError) {
      console.warn('⚠️ AI translation failed, falling back to Google Translate:', aiError);
      aiSuccess = false;
    }

    // Step 2: If AI failed, use Google Translate for ALL remaining fields
    if (!aiSuccess) {
      try {
        const googleResults = await Promise.all(
          fieldsToTranslate.map(async (key) => {
            const translatedText = await googleTranslate(post[key], 'hi');
            return { key, translatedText };
          })
        );
        googleResults.forEach(({ key, translatedText }) => {
          results[key] = translatedText;
        });
        setTranslationSource('google');
        console.log('✅ Google Translate fallback successful');
      } catch (googleError) {
        console.error('❌ Both AI and Google Translate failed:', googleError);
      }
    }

    setTranslated(results);
    setTranslating(false);
  }, [post, translating, getFieldsNeedingTranslation]);

  // Trigger translation when user switches to Hindi
  useEffect(() => {
    if (language === 'hi' && Object.keys(translated).length === 0) {
      translateFields();
    }
  }, [language, translated, translateFields]);

  // Smart field getter: Manual Hindi > Translated > English
  const getField = (enField: string, hiField: string) => {
    if (language === 'hi') {
      if (post?.[hiField]) return post[hiField]; // Admin manual Hindi (highest priority)
      if (translated[enField]) return translated[enField]; // AI or Google translated
      return post?.[enField] || ''; // Fallback to English
    }
    return post?.[enField] || '';
  };

  const labels = language === 'hi'
    ? { name: 'पद का नाम:', date: 'पोस्ट तिथि / अपडेट:', info: 'संक्षिप्त जानकारी:' }
    : { name: 'Name of Post:', date: 'Post Date / Update:', info: 'Short Info:' };

  const displayTablesHtml = language === 'hi'
    ? (post?.tables_html_hi || translated['tables_html'] || post?.tables_html || '')
    : (post?.tables_html || '');

  const mediaUrls: string[] = post?.media_urls || [];

  const handleFilter = (option: string) => {
    setSidebarOpen(false);
    if (option === 'Home') {
      window.open('/', '_blank');
      return;
    }
    window.open(`/?filter=${encodeURIComponent(option)}`, '_blank');
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.open('/?search=' + encodeURIComponent(searchQuery), '_blank');
      setSearchQuery('');
    }
  };

  const filteredCategories = activeFilter
    ? categories.filter(c => c.name.includes(activeFilter))
    : [];

  if (notFound) return <div className="min-h-screen flex items-center justify-center text-primary font-bold text-xl">Post Not Found</div>;
  if (!post && !activeFilter) return <div className="min-h-screen flex items-center justify-center text-primary font-bold text-xl">Loading...</div>;

  return (
    <div className="min-h-screen bg-background font-sans overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} onFilter={handleFilter} />
      <SiteHeader />
      <SiteMenu onFilter={handleFilter} searchQuery={searchQuery} onSearchChange={setSearchQuery} onSearch={handleSearch} />

      {activeFilter ? (
        <>
          <div className="text-center text-accent font-black text-lg my-2.5">
            {settings.tagline || ''}
          </div>
          <div className="grid gap-5 py-8 px-3 mx-auto grid-cols-1">
            {filteredCategories.map(cat => (
              <CategoryBox key={cat.id} name={cat.name} links={categoryLinks.filter(l => l.category_id === cat.id)} />
            ))}
          </div>
          <div className="text-center text-accent font-black text-lg my-2.5">
            {settings.contact_text || ''}
          </div>
        </>
      ) : (
        <div className="mx-auto my-5 px-3">
          <div className="bg-background rounded-2xl p-5 border-t-4 border-primary mb-8 relative" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
            <div className="flex justify-end mb-3">
              <select
                value={language}
                onChange={e => setLanguage(e.target.value as 'en' | 'hi')}
                className="px-4 py-2 border border-border rounded-lg bg-background text-primary text-base font-bold cursor-pointer hover:bg-primary/10 transition-colors"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
              </select>
            </div>

            {translating && language === 'hi' && (
              <div className="text-center text-primary text-sm mb-3 animate-pulse">Translating to Hindi...</div>
            )}

            <table key={language} className="w-full border-collapse mb-5">
              <tbody>
                <tr>
                  <td className="p-3 align-top border-b border-border text-destructive font-bold w-[180px] text-base">{labels.name}</td>
                  <td className="p-3 align-top border-b border-border text-primary font-bold text-base">{getField('name_of_post', 'name_of_post_hi')}</td>
                </tr>
                <tr>
                  <td className="p-3 align-top border-b border-border text-destructive font-bold text-base">{labels.date}</td>
                  <td className="p-3 align-top border-b border-border text-primary font-bold text-base">{getField('post_date', 'post_date_hi')}</td>
                </tr>
                <tr>
                  <td className="p-3 align-top border-b border-border text-destructive font-bold text-base">{labels.info}</td>
                  <td className="p-3 align-top border-b border-border text-primary text-base" dangerouslySetInnerHTML={{ __html: getField('short_info', 'short_info_hi') }} />
                </tr>
              </tbody>
            </table>

            {displayTablesHtml && (
              <div key={`tables-${language}`} className="post-tables-content" dangerouslySetInnerHTML={{ __html: displayTablesHtml }} />
            )}
          </div>

          {/* Cloudinary Media Display */}
          {mediaUrls.length > 0 && (
            <div className="flex flex-col items-center gap-5 mb-8 px-4">
              {mediaUrls.map((url, index) => {
                const isVideo = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
                return (
                  <div key={index} className="w-full max-w-[700px]">
                    {isVideo ? (
                      <video
                        src={url}
                        controls
                        className="w-full rounded-xl"
                        style={{ maxHeight: '450px', boxShadow: 'var(--box-shadow-strong)' }}
                      />
                    ) : (
                      <img
                        src={url}
                        alt={`${post?.name_of_post || 'Post'} - Image ${index + 1}`}
                        className="w-full rounded-xl object-contain"
                        style={{ maxHeight: '450px', boxShadow: 'var(--box-shadow-strong)' }}
                        loading="lazy"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <SiteFooter settings={settings} />
      <style>{`
        .post-tables-content table { width: 100%; border: 1px solid hsl(var(--primary)); border-collapse: collapse; margin-top: 15px; }
        .post-tables-content td, .post-tables-content th { border: 1px solid hsl(var(--primary)); padding: 12px; font-size: 16px; color: hsl(var(--primary)); }
        .post-tables-content a { color: hsl(var(--primary)); text-decoration: underline; }
        .post-tables-content a:hover { opacity: 0.8; }
      `}</style>
    </div>
  );
};

export default PostDetail;
