import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCache, setCache } from '@/lib/cache';
import { fetchHomeData, fetchPostData } from '@/lib/fetchData';
import { getPostBySlug } from '@/lib/firebaseService';
import { googleTranslate } from '@/lib/googleTranslate';
import SiteHeader from '@/components/website/SiteHeader';
import SiteMenu from '@/components/website/SiteMenu';
import Sidebar from '@/components/website/Sidebar';
import CategoryBox from '@/components/website/CategoryBox';
import SiteFooter from '@/components/website/SiteFooter';
import SEO from '@/components/SEO';
import NotFound from '@/pages/NotFound';

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
  const [translatedContent, setTranslatedContent] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [isFetchingPreview, setIsFetchingPreview] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('preview=true')) {
      return true;
    }
    return false;
  });

  const [notFound, setNotFound] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('preview=true')) {
      return false; // Don't show 404 immediately if we are trying to preview
    }
    if (initialData) {
      const allPosts = initialData.posts || [];
      const p = allPosts.find((p: any) => p.slug === slug || p.id === slug) ||
                allPosts.find((p: any) => p.slug && p.slug.startsWith(slug));
      return !p;
    }
    return false;
  });

  useEffect(() => {
    let endlessRetry: ReturnType<typeof setInterval>;

    const fetchData = async () => {
      if (!slug) return;

      // Try cache first
      const cachedPost = getCache<any>(`post_${slug}`);
      const cachedCats = getCache<any[]>('categories');
      const cachedLinks = getCache<any[]>('category_links');
      const cachedSettings = getCache<Record<string, string>>('settings_flat');

      if (cachedPost && cachedPost.tables_html !== undefined && cachedCats && cachedLinks && cachedSettings) {
        setPost(cachedPost);
        setCategories(cachedCats);
        setCategoryLinks(cachedLinks);
        setSettings(cachedSettings);
        setNotFound(false);
        return;
      }

      const fetchPreviewWithRetry = async (slug: string, retries = 5, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
          try {
            const p = await getPostBySlug(slug);
            if (p) return p;
          } catch (e) {
            console.warn("Preview fetch attempt failed:", e);
          }
          if (i < retries - 1) {
            await new Promise(res => setTimeout(res, delay));
          }
        }
        return null;
      };

      if (window.location.search.includes('preview=true')) {
        setIsFetchingPreview(true);
        
        try {
          const localPreview = localStorage.getItem('preview_post_data');
          const localPreviewSlug = localStorage.getItem('preview_post_slug');
          
          if (localPreview && localPreviewSlug === slug) {
            const parsed = JSON.parse(localPreview);
            setPost(parsed);
            setNotFound(false);
            setIsFetchingPreview(false);
            
            // Still try to get categories gently from static files to populate the menus
            try {
              const data = await fetchHomeData();
              if (data) {
                setCategories(data.categories || []);
                setCategoryLinks(data.category_links || []);
                setSettings(data.settings_flat || {});
              }
            } catch(e) {}
            return;
          }
        } catch(e) {
          console.warn("Failed to load local preview:", e);
        }

        const livePost = await fetchPreviewWithRetry(slug!);
        if (livePost) {
          setPost(livePost);
          setNotFound(false);
          setIsFetchingPreview(false);
          
          // Also try to fetch categories and settings for the preview
          try {
            const data = await fetchHomeData();
            if (data) {
              setCategories(data.categories || []);
              setCategoryLinks(data.category_links || []);
              setSettings(data.settings_flat || {});
            }
          } catch(e) {}
          
          return;
        } else {
             endlessRetry = setInterval(async () => {
               const p = await getPostBySlug(slug!);
               if (p) {
                 setPost(p);
                 setNotFound(false);
                 setIsFetchingPreview(false);
                 clearInterval(endlessRetry);
               }
             }, 3000);
             return;
        }
      }

      const isStaticMode = (typeof window !== 'undefined' && (window as any).__INITIAL_DATA__) || (typeof global !== 'undefined' && (global as any).__INITIAL_DATA__);
      let data: any;

      if (isStaticMode) {
        data = (window as any).__INITIAL_DATA__ || (global as any).__INITIAL_DATA__;
      } else {
        try {
          data = await fetchHomeData();
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
        
        if (!postData || postData.tables_html === undefined) {
          try {
            postData = await fetchPostData(slug!);
          } catch (err) {
            console.error("Error fetching static post JSON:", err);
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
        try {
          let postData = await fetchPostData(slug!);
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

    return () => {
      if (endlessRetry) clearInterval(endlessRetry);
    };
  }, [slug]);

  useEffect(() => {
    if (language === 'hi' && post) {
      const translateFields = async () => {
        setIsTranslating(true);
        const newTranslated: Record<string, string> = {};
        let hasChanges = false;
        
        for (const { en, hi } of TRANSLATABLE_FIELDS) {
          if (!post[hi] && post[en] && !translatedContent[en]) {
            try {
              const translated = await googleTranslate(post[en], 'hi');
              newTranslated[en] = translated;
              hasChanges = true;
            } catch (e) {
              console.error(`Translation failed for ${en}:`, e);
            }
          }
        }
        
        if (hasChanges) {
          setTranslatedContent(prev => ({ ...prev, ...newTranslated }));
        }
        setIsTranslating(false);
      };
      
      translateFields();
    }
  }, [language, post, translatedContent]);

  useEffect(() => {
    // Set all links in post content to open in new tab
    const timer = setTimeout(() => {
      const contentContainers = document.querySelectorAll('.post-tables-content, .post-summary-table');
      contentContainers.forEach(container => {
        const links = container.querySelectorAll('a');
        links.forEach(link => {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
        });
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [post, language, translatedContent]);

  // Smart field getter: Manual Hindi > English
  const getField = (enField: string, hiField: string) => {
    let val = '';
    if (language === 'hi') {
      if (post?.[hiField]) val = post[hiField]; // Admin manual Hindi (highest priority)
      else if (translatedContent[enField]) val = translatedContent[enField]; // Translated Hindi
      else val = post?.[enField] || ''; // Fallback to English
    } else {
      val = post?.[enField] || '';
    }
    return val ? val.replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>') : '';
  };

  const labels = language === 'hi'
    ? { name: 'पद का नाम:', date: 'पोस्ट तिथि / अपडेट:', info: 'संक्षिप्त जानकारी:' }
    : { name: 'Name of Post:', date: 'Post Date / Update:', info: 'Short Info:' };

  const rawTablesHtml = language === 'hi'
    ? (post?.tables_html_hi || translatedContent['tables_html'] || post?.tables_html || '')
    : (post?.tables_html || '');
  const displayTablesHtml = rawTablesHtml ? rawTablesHtml.replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>') : '';

  const mediaUrls: string[] = post?.media_urls || [];

  const handleFilter = (option: string) => {
    setSidebarOpen(false);
    if (option === 'Home') {
      window.open('/', '_blank');
      return;
    }
    if (option === 'Contact Us') {
      window.open('/contact-us', '_blank');
      return;
    }
    window.open(`/category/${encodeURIComponent(option)}`, '_blank');
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

  if (isFetchingPreview) return <div className="min-h-screen flex items-center justify-center text-primary font-bold text-xl">Loading Preview...</div>;
  if (notFound) return <NotFound />;
  if (!post && !activeFilter) return <div className="min-h-screen flex items-center justify-center text-primary font-bold text-xl">Loading...</div>;

  const postTitle = post?.name_of_post || 'Job Post';
  const cleanShortInfo = post?.short_info ? post.short_info.replace(/\*\*(.*?)\*\*/gs, '$1').replace(/<[^>]*>?/gm, '') : '';
  const postDescription = cleanShortInfo ? cleanShortInfo.substring(0, 160) : `Check out the latest details for ${postTitle} on Sarkari Sewayojan.`;
  
  const schema = post ? {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": post.name_of_post,
    "description": cleanShortInfo || post.name_of_post,
    "datePosted": post.post_date || new Date().toISOString(),
    "hiringOrganization": {
      "@type": "Organization",
      "name": "Government of India",
      "sameAs": "https://sarkarisewayojan.com"
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "IN"
      }
    }
  } : undefined;

  return (
    <div className="min-h-screen bg-background font-sans overflow-x-hidden">
      {post && (
        <SEO 
          title={`${postTitle} - Sarkari Sewayojan`}
          description={postDescription}
          keywords={`${postTitle}, ${postTitle} online form, ${postTitle} recruitment, sarkari result`}
          schema={schema}
          url={`https://sarkarisewayojan.com/post/${post.slug || post.id}`}
          image={mediaUrls.length > 0 ? mediaUrls[0] : undefined}
        />
      )}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} onFilter={handleFilter} />
      <SiteHeader logoUrl={settings.logo_url} />
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

            <table key={language} className="post-summary-table w-full mb-5 border-collapse">
              <tbody>
                <tr>
                  <td className="p-3 align-top font-bold w-[180px] text-[19px] border border-black/10" style={{ color: '#FF0033' }}>{labels.name}</td>
                  <td className="p-3 align-top text-primary font-bold text-[19px] border border-black/10" dangerouslySetInnerHTML={{ __html: getField('name_of_post', 'name_of_post_hi') || '' }}></td>
                </tr>
                <tr>
                  <td className="p-3 align-top font-bold text-[19px] border border-black/10" style={{ color: '#FF0033' }}>{labels.date}</td>
                  <td className="p-3 align-top text-primary font-bold text-[19px] border border-black/10" dangerouslySetInnerHTML={{ __html: getField('post_date', 'post_date_hi') || '' }}></td>
                </tr>
                <tr>
                  <td className="p-3 align-top font-bold text-[19px] border border-black/10" style={{ color: '#FF0033' }}>{labels.info}</td>
                  <td className="p-3 align-top text-primary text-[19px] border border-black/10 short-info-cell" dangerouslySetInnerHTML={{ __html: getField('short_info', 'short_info_hi') || '' }} />
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
    </div>
  );
};

export default PostDetail;
