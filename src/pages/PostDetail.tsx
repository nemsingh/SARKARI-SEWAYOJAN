import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCache, setCache } from '@/lib/cache';
import { fetchHomeData, fetchPostData } from '@/lib/fetchData';
import SiteHeader from '@/components/website/SiteHeader';
import SiteMenu from '@/components/website/SiteMenu';
import Sidebar from '@/components/website/Sidebar';
import CategoryBox from '@/components/website/CategoryBox';
import SiteFooter from '@/components/website/SiteFooter';
import SEO from '@/components/SEO';
import NotFound from '@/pages/NotFound';
import YouTubeOverlay from '@/components/YouTubeOverlay';

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
  const [language, setLanguage] = useState<'en' | 'hi'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('lang') === 'hi' ? 'hi' : 'en';
    }
    return 'en';
  });
  const [isFetchingPreview, setIsFetchingPreview] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('preview=true')) {
      return true;
    }
    return false;
  });
  const [previewError, setPreviewError] = useState(false);

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
    const endlessRetry: ReturnType<typeof setInterval> | null = null;

    const fetchData = async () => {
      if (!slug) return;

      const isPreviewMode = typeof window !== 'undefined' && window.location.search.includes('preview=true');

      // Try cache first (Bypass if in preview mode so we can fetch the latest live preview)
      if (!isPreviewMode) {
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
      }

      if (window.location.search.includes('preview=true')) {
        setIsFetchingPreview(true);
        
        try {
          const localPreviewSlug = localStorage.getItem('preview_post_slug');
          let localPreview: any = null;

          // 1. Try local storage first (instant, synchronous, robust fallback)
          if (localPreviewSlug === slug) {
            const raw = localStorage.getItem('preview_post_data');
            if (raw) {
              try {
                localPreview = JSON.parse(raw);
              } catch (e) {
                console.error("Failed to parse localPreview_data JSON:", e);
              }
            }
          }

          // 2. Fallback to IndexedDB
          if (!localPreview) {
            const { getPreviewData } = await import('@/lib/previewDb');
            localPreview = await getPreviewData();
          }
          
          if (localPreview && localPreviewSlug === slug) {
            setPost(localPreview);
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
            } catch(e) {
              console.error("Categories fetch failed:", e);
            }
            return;
          } else {
             setIsFetchingPreview(false);
             setPreviewError(true);
             return;
          }
        } catch(e) {
          console.warn("Failed to load local preview:", e);
          setIsFetchingPreview(false);
          setPreviewError(true);
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
          const postData = await fetchPostData(slug!);
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
    if (post && typeof window !== 'undefined') {
      const scrollPos = sessionStorage.getItem('scrollPos');
      if (scrollPos) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(scrollPos, 10));
          sessionStorage.removeItem('scrollPos');
        }, 100); // slight delay to allow rendering
      }
    }
  }, [post]);



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

      // Special handling for Short Info links to GUARANTEE red text and blue click
      const shortInfoCells = document.querySelectorAll('.short-info-cell');
      shortInfoCells.forEach(cell => {
        const shortLinks = cell.querySelectorAll('a');
        shortLinks.forEach(link => {
          // Remove ALL inline colors from the link and its children
          if (link.style) link.style.removeProperty('color');
          const children = link.querySelectorAll('*');
          children.forEach((child: any) => {
            if (child.style) {
              child.style.removeProperty('color');
            }
          });
          
          link.classList.add('short-info-link-force');

          // Handle click effects using predictable class toggling
          const handleClickState = () => {
            link.classList.add('force-blue-click');
            setTimeout(() => {
              link.classList.remove('force-blue-click');
            }, 500); // 500ms duration for click feedback
          };

          link.addEventListener('mousedown', handleClickState);
          link.addEventListener('touchstart', handleClickState, {passive: true});
        });
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [post, language]);

  // Smart field getter: Manual Hindi > English
  const getField = (enField: string, hiField: string) => {
    let val = '';
    let isManualHi = false;
    if (language === 'hi') {
      if (post?.[hiField]) {
        val = post[hiField]; // Admin manual Hindi (highest priority)
        isManualHi = true;
      }
      else val = post?.[enField] || ''; // Fallback to English, let Google translate do its logic
    } else {
      val = post?.[enField] || '';
    }
    const html = val ? val.replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>') : '';
    return isManualHi ? `<span class="notranslate">${html}</span>` : html;
  };

  const labels = language === 'hi'
    ? { name: <span className="notranslate">पद का नाम:</span>, date: <span className="notranslate">पोस्ट तिथि / अपडेट:</span>, info: <span className="notranslate">संक्षिप्त जानकारी:</span> }
    : { name: <span>Name of Post:</span>, date: <span>Post Date / Update:</span>, info: <span>Short Info:</span> };

  const hasManualTableHi = language === 'hi' && !!post?.tables_html_hi;
  const rawTablesHtml = hasManualTableHi
    ? post.tables_html_hi
    : (post?.tables_html || '');
  const displayTablesHtml = rawTablesHtml ? rawTablesHtml.replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>') : '';

  const mediaUrls: string[] = post?.media_urls || [];
  const pdfUrls: string[] = post?.pdf_urls || [];
  const showPdfScrollHint: boolean = post?.show_pdf_scroll_hint || false;
  const youtubeUrls: string[] = post?.youtube_urls || [];

  const handleFilter = (option: string) => {
    setSidebarOpen(false);
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

  if (previewError) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold text-xl">Failed to load preview. Please try again.</div>;
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
          title={`${postTitle} - Sarkari Sewayojan | Sarkari Result`}
          description={postDescription}
          keywords={`${postTitle}, ${postTitle} online form, ${postTitle} recruitment, sarkari result, sarkari exam, rojgar result, sewayojan`}
          schema={schema}
          url={`https://sarkarisewayojan.com/post/${post.slug || post.id}`}
          image={mediaUrls.length > 0 ? mediaUrls[0] : undefined}
        />
      )}
      <div className="notranslate">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} onFilter={handleFilter} />
        <SiteHeader logoUrl={settings.logo_url} />
        <SiteMenu onFilter={handleFilter} searchQuery={searchQuery} onSearchChange={setSearchQuery} onSearch={handleSearch} />
      </div>

      {activeFilter ? (
        <div className="notranslate">
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
        </div>
      ) : (
        <div className="mx-auto my-5 px-3">
          <div className="bg-background rounded-2xl p-5 border-t-4 border-primary mb-8 relative" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
            <div className="flex justify-end mb-3 notranslate">
              <select
                value={language}
                onChange={e => {
                  const newLang = e.target.value as 'en' | 'hi';
                  
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    if (newLang === 'hi') {
                      url.searchParams.set('lang', 'hi');
                      document.cookie = 'googtrans=/en/hi; path=/';
                      document.cookie = `googtrans=/en/hi; path=/; domain=${window.location.hostname}`;
                    } else {
                      url.searchParams.delete('lang');
                      document.cookie = 'googtrans=/en/en; path=/';
                      document.cookie = `googtrans=/en/en; path=/; domain=${window.location.hostname}`;
                      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
                    }
                    window.location.href = url.toString();
                  }
                }}
                className="px-4 py-2 border border-border rounded-lg bg-background text-primary text-base font-bold cursor-pointer hover:bg-primary/10 transition-colors"
                style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: 'url("data:image/svg+xml;utf8,<svg fill=%27black%27 height=%2724%27 viewBox=%270 0 24 24%27 width=%2724%27 xmlns=%27http://www.w3.org/2000/svg%27><path d=%27M7 10l5 5 5-5z%27/><path d=%27M0 0h24v24H0z%27 fill=%27none%27/></svg>")', backgroundRepeat: 'no-repeat', backgroundPositionX: '100%', backgroundPositionY: '50%', paddingRight: '1.5rem' }}
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
              </select>
            </div>

            <table className="translate post-summary-table w-full mb-5 border-collapse">
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
              <div className={`post-tables-content ${hasManualTableHi ? 'notranslate' : 'translate'}`} dangerouslySetInnerHTML={{ __html: displayTablesHtml }} />
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

          {/* PDF Display */}
          {pdfUrls.length > 0 && (
            <div className="flex flex-col items-center gap-5 mb-8 w-full">
              {showPdfScrollHint && (
                 <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse mt-4">
                   Scroll for more pages ↓
                 </div>
              )}
              {pdfUrls.map((url, index) => {
                let embedUrl = url;
                if (embedUrl.includes('drive.google.com/file/d/')) {
                  const match = embedUrl.match(/\/d\/(.*?)\//);
                  if (match && match[1]) {
                    embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
                  } else {
                    embedUrl = embedUrl.replace(/\/view.*$/, '/preview');
                  }
                } else {
                  // Clean up URL and add required params for native viewers
                  const base = embedUrl.split('#')[0];
                  embedUrl = `${base}#view=FitH&toolbar=0&navpanes=0&scrollbar=1`;
                }
                
                const isDrive = embedUrl.includes('drive.google.com');

                return (
                  <div key={index} className="w-full relative overflow-hidden bg-gray-200 rounded-xl" style={{ height: '85vh', minHeight: '600px', maxHeight: '1200px', boxShadow: 'var(--box-shadow-strong)' }}>
                    <iframe
                      src={embedUrl}
                      className="absolute inset-0 w-full h-full border-none"
                      style={{ backgroundColor: '#e5e7eb' }}
                      title={`PDF Document ${index + 1}`}
                      allowFullScreen
                    ></iframe>
                    {isDrive && (
                      <div 
                        className="absolute top-0 right-[15px] w-[50px] h-[50px] bg-black/70 backdrop-blur-md z-10 pointer-events-auto flex items-center justify-center rounded-bl-lg"
                        title="View Document"
                        style={{ boxShadow: '-2px 2px 4px rgba(0,0,0,0.1)' }}
                      ></div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* YouTube Video Display */}
          {youtubeUrls.length > 0 && (
            <div className="flex flex-col items-center gap-5 mb-8 px-4">
              {youtubeUrls.map((url, index) => {
                let videoId = '';
                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                const match = url.match(regExp);
                if (match && match[2].length === 11) {
                  videoId = match[2];
                }

                if (videoId) {
                  return (
                    <div key={index} className="w-full max-w-[700px] aspect-video">
                      <YouTubeOverlay videoId={videoId} originalUrl={url} />
                    </div>
                  );
                }

                return (
                  <div key={index} className="w-full max-w-[700px] aspect-video">
                    <iframe
                      src={url}
                      title={`YouTube Video ${index + 1}`}
                      className="w-full h-full rounded-xl border-none"
                      style={{ boxShadow: 'var(--box-shadow-strong)' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="notranslate">
        <SiteFooter settings={settings} />
      </div>
    </div>
  );
};

export default PostDetail;
