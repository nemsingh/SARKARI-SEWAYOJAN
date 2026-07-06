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
import { PostSocialButtons } from '@/components/website/PostSocialButtons';
import { Briefcase, CalendarClock, ArrowRight, Calendar } from 'lucide-react';

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
  const [allPosts, setAllPosts] = useState<any[]>(() => {
    if (initialData) {
      return initialData.posts || [];
    }
    return getCache<any[]>('posts') || [];
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
        const cachedPosts = getCache<any[]>('posts');

        if (
          cachedPost && 
          cachedPost.tables_html !== undefined && 
          cachedCats && 
          cachedLinks && 
          cachedSettings && 
          cachedPosts
        ) {
          setPost(cachedPost);
          setCategories(cachedCats);
          setCategoryLinks(cachedLinks);
          setSettings(cachedSettings);
          setAllPosts(cachedPosts);
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
                if (data.posts) {
                  setAllPosts(data.posts || []);
                  setCache('posts', data.posts || []);
                }
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
      const initialDataObj = isStaticMode ? ((window as any).__INITIAL_DATA__ || (global as any).__INITIAL_DATA__) : null;

      let postData: any = null;
      
      // 1. Resolve Post Data
      if (initialDataObj) {
        if (initialDataObj.slug === slug || initialDataObj.id === slug) {
          postData = initialDataObj;
        } else if (initialDataObj[`post_${slug}`]) {
          postData = initialDataObj[`post_${slug}`];
        } else if (initialDataObj.post) {
          postData = initialDataObj.post;
        } else if (initialDataObj.posts) {
          postData = initialDataObj.posts.find((p: any) => p.slug === slug || p.id === slug) ||
                     initialDataObj.posts.find((p: any) => p.slug && p.slug.startsWith(slug));
        }
      }

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

      // 2. Resolve Global Data (categories, category_links, settings, posts)
      let globalData: any = null;
      if (initialDataObj && initialDataObj.posts && initialDataObj.categories) {
        globalData = initialDataObj;
      }

      if (!globalData) {
        try {
          globalData = await fetchHomeData();
        } catch (e) {
          console.error("Error fetching home data for sidebar/related:", e);
        }
      }

      if (globalData) {
        const allPostsVal = globalData.posts || [];
        const cats = globalData.categories || [];
        const links = globalData.category_links || [];
        const sett = globalData.settings_flat || {};

        setCategories(cats);
        setCategoryLinks(links);
        setSettings(sett);
        setAllPosts(allPostsVal);

        setCache('categories', cats);
        setCache('category_links', links);
        setCache('settings_flat', sett);
        setCache('posts', allPostsVal);
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

            <table className="translate post-summary-table w-full mb-2 border-collapse">
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

            <PostSocialButtons settings={settings} />

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

          {/* Related Posts and Last Date TODAY Posts Section */}
          {allPosts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 mb-10 w-full px-2">
              {/* Box 1: Related Post's */}
              <div 
                className="bg-background rounded-2xl overflow-hidden border-t-4 border-[#0b3d91]" 
                style={{ boxShadow: 'var(--box-shadow-strong)' }}
              >
                {/* Header */}
                <div className="bg-[#0b3d91]/5 py-3.5 px-4 border-b border-black/5 dark:border-white/5">
                  <h3 className="font-extrabold text-[18px] md:text-[20px] text-[#0b3d91] dark:text-sky-400 uppercase tracking-wide">
                    {language === 'hi' ? 'संबंधित पोस्ट्स' : "Related Post's"}
                  </h3>
                </div>

                {/* Body Content */}
                <div className="p-3 flex flex-col gap-0 sidebar-posts-list" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  {(() => {
                    // Related posts algorithm
                    const currentPostUrls = [
                      `/post/${slug}`,
                      `/post/${post?.slug}`,
                      `/post/${post?.id}`,
                      post?.slug,
                      post?.id
                    ].filter(Boolean);

                    const currentPostLinks = categoryLinks.filter(link => {
                      if (!link.url) return false;
                      const cleanUrl = link.url.trim();
                      return currentPostUrls.some(u => cleanUrl === u || cleanUrl.endsWith('/' + u) || u.endsWith('/' + cleanUrl));
                    });

                    const currentCategoryIds = new Set(currentPostLinks.map(l => l.category_id).filter(Boolean));

                    const stopWords = new Set([
                      'and', 'or', 'the', 'of', 'to', 'in', 'for', 'online', 'form', 'recruitment', 'vacancy', '2026', '2025', '2024',
                      'job', 'jobs', 'post', 'posts', 'with', 'by', 'on', 'at', 'from', 'sarkari', 'sewayojan', 'website', 'official',
                      'और', 'का', 'की', 'के', 'में', 'पर', 'को', 'से', 'भी', 'लिए'
                    ]);

                    const currentTitleWords = (post?.name_of_post || '')
                      .toLowerCase()
                      .replace(/[|:\-–—(),.]/g, ' ')
                      .split(/\s+/)
                      .filter(word => word.length > 2 && !stopWords.has(word));

                    const scoredPosts = allPosts
                      .filter(p => p.id !== post?.id && p.slug !== post?.slug)
                      .map(p => {
                        let score = 0;
                        const pLinks = categoryLinks.filter(link => {
                          if (!link.url) return false;
                          return link.url === `/post/${p.slug}` || link.url === `/post/${p.id}` || link.url === p.slug || link.url === p.id;
                        });
                        const shareCategory = pLinks.some(l => currentCategoryIds.has(l.category_id));
                        if (shareCategory) score += 15;

                        const pTitle = (p.name_of_post || '').toLowerCase();
                        currentTitleWords.forEach(word => {
                          if (pTitle.includes(word)) score += 5;
                        });

                        return { post: p, score };
                      })
                      .filter(item => item.score > 0)
                      .sort((a, b) => b.score - a.score)
                      .map(item => item.post);

                    const finalRelatedPosts = [...scoredPosts];
                    if (finalRelatedPosts.length < 5) {
                      const seenIds = new Set(finalRelatedPosts.map(p => p.id));
                      seenIds.add(post?.id);
                      seenIds.add(post?.slug);

                      const latestJobs = allPosts
                        .filter(p => !seenIds.has(p.id) && !seenIds.has(p.slug))
                        .slice(0, 5 - finalRelatedPosts.length);

                      finalRelatedPosts.push(...latestJobs);
                    }

                    const displayRelated = finalRelatedPosts.slice(0, 5);

                    if (displayRelated.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {language === 'hi' ? 'कोई संबंधित पोस्ट नहीं मिला।' : 'No related posts found.'}
                        </p>
                      );
                    }

                    return displayRelated.map((p, idx) => {
                      const targetUrl = `/post/${p.slug || p.id}`;
                      const titleText = language === 'hi' && p.name_of_post_hi ? p.name_of_post_hi : p.name_of_post;
                      
                      return (
                        <a 
                          key={p.id || idx}
                          href={targetUrl}
                          className="flex items-center justify-between py-1 px-1 border-b border-black/5 dark:border-white/5 transition-all duration-200 group last:border-0"
                        >
                          <div className="max-w-[88%] py-1">
                            <span className="font-bold text-[16px] leading-snug sidebar-post-title transition-all">
                              {titleText}
                            </span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 sidebar-post-arrow" />
                        </a>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Box 2: Last Date TODAY Post's */}
              <div 
                className="bg-background rounded-2xl overflow-hidden border-t-4 border-[#FF0033]" 
                style={{ boxShadow: 'var(--box-shadow-strong)' }}
              >
                {/* Header */}
                <div className="bg-[#FF0033]/5 py-3.5 px-4 border-b border-black/5 dark:border-white/5">
                  <h3 className="font-extrabold text-[18px] md:text-[20px] text-[#FF0033] uppercase tracking-wide flex items-center gap-2">
                    {language === 'hi' ? 'आज अंतिम तिथि वाले पोस्ट्स' : "Last Date TODAY Post's"}
                    {/* Flashing Dot Indicator */}
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF0033]"></span>
                    </span>
                  </h3>
                </div>

                {/* Body Content */}
                <div className="p-3 flex flex-col gap-0 sidebar-posts-list" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  {(() => {
                    const parseLastDate = (lastDateText: string | null | undefined): Date | null => {
                      if (!lastDateText) return null;
                      
                      let s = lastDateText.toLowerCase().trim();
                      s = s.replace(/\|/g, ' ');
                      
                      const hindiToEnglishMonths: Record<string, string> = {
                        'जनवरी': 'january', 'फ़रवरी': 'february', 'फरवरी': 'february', 'मार्च': 'march',
                        'अप्रैल': 'april', 'मई': 'may', 'जून': 'june', 'जुलाई': 'july', 'अगस्त': 'august',
                        'सितंबर': 'september', 'सितम्बर': 'september', 'अक्टूबर': 'october', 'अक्तूबर': 'october',
                        'नवंबर': 'november', 'नवम्बर': 'november', 'दिसंबर': 'december', 'दिसम्बर': 'december'
                      };

                      for (const [hindi, english] of Object.entries(hindiToEnglishMonths)) {
                        if (s.includes(hindi)) {
                          s = s.replace(new RegExp(hindi, 'g'), english);
                        }
                      }

                      const dmyMatch = s.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})\b/);
                      if (dmyMatch) {
                        const day = parseInt(dmyMatch[1], 10);
                        const month = parseInt(dmyMatch[2], 10) - 1;
                        let year = parseInt(dmyMatch[3], 10);
                        if (year < 100) year += 2000;
                        const d = new Date(year, month, day);
                        if (!isNaN(d.getTime())) return d;
                      }

                      s = s.replace(/\b(\d{1,2})(?:st|nd|rd|th)\b/g, '$1');

                      // eslint-disable-next-line no-misleading-character-class
                      let cleanAlpha = s.replace(/^[:\-–—\s\u200b•|ः।●]+/, '').replace(/[:\-–—\s|ः।●]+$/, '').trim();
                      
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
                      if (!isNaN(tryStandard.getTime())) return tryStandard;

                      return null;
                    };

                    const isToday = (date: Date): boolean => {
                      const today = new Date();
                      return (
                        date.getDate() === today.getDate() &&
                        date.getMonth() === today.getMonth() &&
                        date.getFullYear() === today.getFullYear()
                      );
                    };

                    const isUpcoming = (date: Date): boolean => {
                      const todayStart = new Date();
                      todayStart.setHours(0, 0, 0, 0);
                      return date.getTime() >= todayStart.getTime();
                    };

                    // Filter posts with active dates
                    const todayPosts = allPosts.filter(p => {
                      const d = parseLastDate(p.last_date_text);
                      return d ? isToday(d) : false;
                    });

                    let displayTodayOrUpcoming = [...todayPosts];
                    if (displayTodayOrUpcoming.length < 5) {
                      const upcomingPosts = allPosts
                        .map(p => ({ post: p, date: parseLastDate(p.last_date_text) }))
                        .filter(item => item.date && isUpcoming(item.date) && !isToday(item.date))
                        .sort((a, b) => a.date!.getTime() - b.date!.getTime())
                        .map(item => item.post);

                      displayTodayOrUpcoming = [...displayTodayOrUpcoming, ...upcomingPosts].slice(0, 5);
                    }

                    if (displayTodayOrUpcoming.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {language === 'hi' ? 'कोई भी अंतिम तिथि आज या जल्द उपलब्ध नहीं है।' : 'No upcoming last date updates found.'}
                        </p>
                      );
                    }

                    return displayTodayOrUpcoming.map((p, idx) => {
                      const targetUrl = `/post/${p.slug || p.id}`;
                      const titleText = language === 'hi' && p.name_of_post_hi ? p.name_of_post_hi : p.name_of_post;
                      const parsedD = parseLastDate(p.last_date_text);
                      const endsToday = parsedD ? isToday(parsedD) : false;

                      return (
                        <a 
                          key={p.id || idx}
                          href={targetUrl}
                          className="flex items-center justify-between py-1 px-1 border-b border-black/5 dark:border-white/5 transition-all duration-200 group last:border-0"
                        >
                          <div className="max-w-[85%] py-1 text-[16px] leading-snug font-bold">
                            <span className="sidebar-post-title transition-all mr-1.5">
                              {titleText}
                            </span>
                            {endsToday ? (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-[#FF0033] align-middle animate-fast-blink select-none ml-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FF0033]"></span>
                                {language === 'hi' ? 'अंतिम तिथि: आज' : 'LAST DATE: TODAY'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-amber-600 dark:text-amber-400 align-middle select-none ml-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400"></span>
                                {(() => {
                                  const text = p.last_date_text || '';
                                  const lower = text.toLowerCase().trim();
                                  if (lower.includes('last_date') || lower.includes('last date') || lower.includes('अंतिम तिथि') || lower.includes('अन्तिम तिथि')) {
                                    return text;
                                  }
                                  return language === 'hi' ? `अंतिम तिथि: ${text || 'जल्द'}` : `Last Date: ${text || 'Soon'}`;
                                })()}
                              </span>
                            )}
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 sidebar-post-arrow" />
                        </a>
                      );
                    });
                  })()}
                </div>
              </div>
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
