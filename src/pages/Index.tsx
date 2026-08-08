import { useState, useEffect } from 'react';
import { getCache, setCache } from '@/lib/cache';
import { fetchHomeData } from '@/lib/fetchData';
import SiteHeader from '@/components/website/SiteHeader';
import SiteMenu from '@/components/website/SiteMenu';
import Sidebar from '@/components/website/Sidebar';
import UpdateBar from '@/components/website/UpdateBar';
import TabletGrid from '@/components/website/TabletGrid';
import CategoryBox from '@/components/website/CategoryBox';
import SeoContentBox from '@/components/website/SeoContentBox';
import SiteFooter from '@/components/website/SiteFooter';
import SEO from '@/components/SEO';

const Index = () => {
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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeFilter, setActiveFilter] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const filter = params.get('filter');
      if (filter) return filter;
    }
    return 'Home';
  });

  const [filterSource, setFilterSource] = useState<'menu' | 'more'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const source = params.get('source');
      if (source === 'more') return 'more';
    }
    return 'menu';
  });

  const [appliedSearch, setAppliedSearch] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const search = params.get('search');
      if (search) return search;
    }
    return '';
  });

  const [categories, setCategories] = useState<any[]>(() => initialData?.categories || getCache('categories') || []);
  const [categoryLinks, setCategoryLinks] = useState<any[]>(() => initialData?.category_links || getCache('category_links') || []);
  const [posts, setPosts] = useState<any[]>(() => initialData?.posts || getCache('posts') || []);
  const [tabletItems, setTabletItems] = useState<any[]>(() => initialData?.tablet_items || getCache('tablet_items') || []);
  const [settings, setSettings] = useState<Record<string, string>>(() => initialData?.settings_flat || getCache('settings_flat') || {});

  // One-time fetch from Firebase (no real-time listeners)
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const isStaticMode = (typeof window !== 'undefined' && (window as any).__INITIAL_DATA__) || (typeof global !== 'undefined' && (global as any).__INITIAL_DATA__);
        let data: any;

        if (isStaticMode) {
          data = (window as any).__INITIAL_DATA__ || (global as any).__INITIAL_DATA__;
        } else {
          data = await fetchHomeData();
        }

        if (data) {
          setCategories(data.categories || []); setCache('categories', data.categories || []);
          setCategoryLinks(data.category_links || []); setCache('category_links', data.category_links || []);
          setTabletItems(data.tablet_items || []); setCache('tablet_items', data.tablet_items || []);
          setPosts(data.posts || []); setCache('posts', data.posts || []);
          setSettings(data.settings_flat || {}); setCache('settings_flat', data.settings_flat || {});
        }
      } catch (e) {
        console.error('Fetch error:', e);
      }
    };

    fetchAll();
  }, []);

  const handleFilter = (option: string) => {
    setSidebarOpen(false);
  };

  useEffect(() => {
    // URL params are now parsed synchronously during state initialization
    // to prevent un-filtered UI flashes.
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.open('/search?filter=' + encodeURIComponent(searchQuery) + '&source=more', '_blank');
      setSearchQuery('');
    }
  };

  const filteredCategories = activeFilter === 'Home'
    ? categories
    : categories.filter(c => {
        const nameMatch = c.name.toLowerCase().includes(activeFilter.toLowerCase());
        const linksMatch = categoryLinks
          .filter(l => l.category_id === c.id)
          .some(l => l.title.toLowerCase().includes(activeFilter.toLowerCase()));
        return nameMatch || linksMatch;
      });

  const filteredCategoriesWithSearch = appliedSearch
    ? filteredCategories.filter(c => {
        const links = categoryLinks.filter(l => l.category_id === c.id);
        return c.name.toLowerCase().includes(appliedSearch.toLowerCase()) ||
          links.some(l => l.title.toLowerCase().includes(appliedSearch.toLowerCase()));
      })
    : filteredCategories;

  const keyword = activeFilter.trim().toLowerCase();
  
  const getSearchLinks = () => {
    if (filterSource !== 'more' || activeFilter === 'Home') return [];
    
    // 1. Find all posts that match the keyword
    const matchingPosts = posts.filter((post) => {
        const searchTargets = [
          post.name_of_post,
          post.name_of_post_hi,
          post.short_info,
          post.short_info_hi,
          post.search_corpus,
        ];
        return searchTargets.some((value) => (value || '').toLowerCase().includes(keyword));
    });

    // 2. Find all category links that match the keyword
    const matchingLinks = categoryLinks.filter(l => l.title && l.title.toLowerCase().includes(keyword));

    // Combine them, avoiding duplicates (links take precedence or vice versa, let's just make a map of URLs)
    const uniqueLinksMap = new Map();

    // Add matching posts first
    matchingPosts.forEach(post => {
      uniqueLinksMap.set(`/post/${post.slug || post.id}`, {
        id: post.id,
        url: `/post/${post.slug || post.id}`,
        title: post.name_of_post,
        is_new: false,
        last_date_text: post.last_date_text
      });
    });

    // Add matching category links, overriding/adding
    matchingLinks.forEach(link => {
      if (!uniqueLinksMap.has(link.url)) {
         let last_date_text = link.actual_last_date_text;
         if (!last_date_text && link.url?.startsWith('/post/')) {
           const slug = link.url.replace('/post/', '');
           const mPost = posts.find(p => p.slug === slug || p.id === slug);
           if (mPost) last_date_text = mPost.last_date_text;
         }
         uniqueLinksMap.set(link.url, {
           id: link.id,
           url: link.url,
           title: link.title,
           is_new: link.is_new,
           last_date_text: last_date_text
         });
      }
    });

    return Array.from(uniqueLinksMap.values());
  };

  const combinedSearchLinks = getSearchLinks();

  const globalDirection = (settings['update_bar_direction'] as 'left' | 'right' | 'bounce') || 'left';

  const updateBars: { text: string; direction: 'left' | 'right' | 'bounce' }[] = [];
  if (settings.update_bar_text) {
    updateBars.push({
      text: settings.update_bar_text,
      direction: (settings['update_bar_direction_1'] as 'left' | 'right' | 'bounce') || globalDirection,
    });
  }
  for (let i = 2; i <= 10; i++) {
    const key = `update_bar_text_${i}`;
    if (settings[key]) {
      updateBars.push({
        text: settings[key],
        direction: (settings[`update_bar_direction_${i}`] as 'left' | 'right' | 'bounce') || globalDirection,
      });
    }
  }

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://sarkarisewayojan.com/#website",
        "url": "https://sarkarisewayojan.com/",
        "name": "Sarkari Sewayojan",
        "alternateName": [
          "SarkariSewayojan",
          "Sarkari Sewayojan Official",
          "Sarkari Sewayojan Portal",
          "SarkariSewayojan Portal"
        ],
        "publisher": {
          "@id": "https://sarkarisewayojan.com/#organization"
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://sarkarisewayojan.com/?search={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "Organization",
        "@id": "https://sarkarisewayojan.com/#organization",
        "name": "Sarkari Sewayojan",
        "alternateName": [
          "SarkariSewayojan",
          "Sarkari Sewayojan Team"
        ],
        "url": "https://sarkarisewayojan.com/",
        "logo": {
          "@type": "ImageObject",
          "@id": "https://sarkarisewayojan.com/#logo",
          "url": settings.logo_url || "https://sarkarisewayojan.com/logo_icon.png",
          "caption": "Sarkari Sewayojan"
        },
        "image": {
          "@id": "https://sarkarisewayojan.com/#logo"
        }
      }
    ]
  };

  const pageTitle = activeFilter === 'Home' 
    ? "Sarkari Sewayojan - Sarkari Result, Sarkari Exam, Sewayojan UP & Rojgar Result 2026"
    : `${activeFilter} Jobs - Latest Sarkari Result, Sarkari Sewayojan`;

  const pageDescription = activeFilter === 'Home'
    ? "Sarkari Sewayojan is India's No.1 Sarkari Result Portal. Find latest Sarkari Exam, Sewayojan, Rojgar Result, Free Job Alert, Railway, Bank, SSC, and Police Updates."
    : `Latest Online Form & Sarkari Result for ${activeFilter} Jobs on Sarkari Sewayojan. Stay updated with Sarkari Exam and Rojgar Result notifications.`;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden font-sans">
      <SEO 
        title={pageTitle}
        description={pageDescription}
        schema={schema}
        url="https://sarkarisewayojan.com/"
      />
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} onFilter={handleFilter} />
      <SiteHeader logoUrl={settings.logo_url} />
      <SiteMenu onFilter={handleFilter} searchQuery={searchQuery} onSearchChange={setSearchQuery} onSearch={handleSearch} />
      
      {updateBars.map((bar, i) => (
        <UpdateBar key={i} text={bar.text} direction={bar.direction} />
      ))}

      {activeFilter === 'Home' && (
        <div id="live-info-banner" className="w-full max-w-5xl mx-auto px-4 mt-0 mb-1">
          <div className="live-banner-container w-full rounded-2xl pt-2.5 pb-2 px-4 transition-all duration-300 relative overflow-hidden bg-white dark:bg-slate-900 border-0 text-center shadow-lg">
            
            {/* Embedded styles for live blink/glow, robust dark mode & Bhagwa theme support */}
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes live-dot-ping {
                0% { transform: scale(1); opacity: 1; }
                70% { transform: scale(2.6); opacity: 0; }
                100% { transform: scale(2.6); opacity: 0; }
              }
              @keyframes instant-dot-blink {
                0%, 49.9% { opacity: 1; }
                50%, 100% { opacity: 0.3; }
              }
              .live-led-dot {
                animation: live-dot-ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
              }
              .live-led-center {
                animation: instant-dot-blink 0.4s infinite;
              }
              
              /* Scoped theme classes supporting custom backgrounds & responsive styles */
              .live-banner-container {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border: none !important;
              }
              html.dark .live-banner-container {
                background: linear-gradient(135deg, #090e1a 0%, #0c1524 100%);
                border: none !important;
              }
              .theme-bhagwa .live-banner-container {
                background: linear-gradient(135deg, #ffffff 0%, #fffbf0 100%) !important;
                border: none !important;
                box-shadow: 0 10px 30px rgba(241, 141, 27, 0.08) !important;
              }
            `}} />

            {/* Title & Core Platform Statement */}
            <h2 className="text-[17px] md:text-[20px] leading-relaxed text-slate-800 dark:text-slate-100 mb-1 font-normal">
              <strong className="font-extrabold text-[#0b3d91] dark:text-sky-400 theme-box-text">
                (Sarkari Sewayojan website since 2022) Trusted Platform for Government Job Updates
              </strong>{" "}
              – Latest Government Job Updates, Online Forms, Results, Admit Cards, Answer Keys, Syllabus & More.
            </h2>

            {/* Supportive Sub-statement */}
            <p className="text-[14px] md:text-[16px] text-slate-600 dark:text-slate-400 mb-1.5 font-medium max-w-3xl mx-auto">
              Fast, reliable and easy-to-understand information for all your Sarkari job needs in one place.
            </p>

            {/* Crucial Disclaimer Alert Block */}
            <div className="mb-1.5 max-w-4xl mx-auto">
              <p className="inline-block px-3 py-1 bg-rose-500/10 dark:bg-rose-500/5 text-rose-600 dark:text-rose-400 text-[11px] md:text-[12px] rounded-lg border border-rose-500/25 font-bold leading-normal">
                Sarkari Sewayojan is a private website and not affiliated with any government organization.
              </p>
            </div>

            {/* Highly interactive and attractive centered fast-blinking Live button as requested */}
            <div className="flex flex-col items-center justify-center pt-0.5">
              <div 
                className="group relative inline-flex items-center gap-2.5 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-extrabold text-[12px] md:text-[14px] px-5 py-2 rounded-full shadow-[0_6px_20px_rgba(239,68,68,0.4)] hover:shadow-[0_10px_25px_rgba(239,68,68,0.5)] transition-all duration-300 transform hover:scale-[1.03] cursor-pointer"
                id="live-portal-badge"
              >
                {/* Embedded fast pulsing modern LED circular signal */}
                <span className="relative flex h-3 w-3 mr-0.5">
                  <span className="live-led-dot absolute inline-flex h-full w-full rounded-full bg-white opacity-85"></span>
                  <span className="live-led-center relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
                
                {/* Static Live text */}
                <span className="tracking-wide uppercase font-black select-none text-white">
                  LIVE UPDATES
                </span>

                {/* Subtle sheen highlight inside button */}
                <div className="absolute inset-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
              </div>

              {/* Little server status note */}
              <p className="text-[10px] md:text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 font-mono flex items-center gap-1.5 select-none animate-pulse">
                <span className="inline-block w-1 h-1 rounded-full bg-emerald-500"></span>
                Live server ping: 24ms • Connection encrypted
              </p>
            </div>

          </div>
        </div>
      )}

      {activeFilter === 'Home' && (
        <TabletGrid items={tabletItems} searchQuery={appliedSearch} />
      )}

      <div className="text-center text-accent font-black text-lg my-2.5">
        {settings.tagline || ''}
      </div>

      {filterSource === 'more' && activeFilter !== 'Home' ? (
        <div className="grid gap-5 py-8 px-3 mx-auto grid-cols-1">
          {combinedSearchLinks.length > 0 ? (
            <CategoryBox
              name={`${activeFilter} Update's`}
              links={combinedSearchLinks}
              maxVisible={999999}
            />
          ) : (
            <div className="category-box-body bg-background rounded-2xl relative pt-[70px] px-5 pb-5 text-center" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
              <div className="category-box-header absolute top-0 left-0 w-full text-center text-[26px] font-bold text-primary py-4 bg-background/40 backdrop-blur-sm rounded-t-2xl" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                {activeFilter} Update's
              </div>
              <p className="text-primary font-medium mt-2.5 text-[19px]">No updates found for {activeFilter}.</p>
            </div>
          )}
        </div>
      ) : (
        <div className={`grid gap-5 py-8 px-3 mx-auto ${activeFilter !== 'Home' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {filteredCategoriesWithSearch.map((cat, index) => {
            let catLinks = categoryLinks.filter(l => l.category_id === cat.id);
            if (activeFilter !== 'Home' && filterSource === 'menu' && (cat.name.toLowerCase().includes('latest') || cat.name.toLowerCase().includes('letest'))) {
               catLinks = catLinks.map((l: any) => {
                 const match = l.url?.match(/\/post\/(.+)/);
                 const slug = match ? match[1] : null;
                 const post = posts.find((p: any) => p.slug === slug || p.id === slug);
                 return { ...l, actual_last_date_text: post?.last_date_text };
               });
            }
            return (
              <CategoryBox
                key={cat.id}
                name={cat.name}
                links={catLinks}
                maxVisible={activeFilter === 'Home' ? (index < 6 ? 25 : 15) : 999999}
              />
            );
          })}
        </div>
      )}

      <div className="text-center text-accent font-black text-lg my-2.5">
        {settings.contact_text || ''}
      </div>

      {activeFilter === 'Home' && <SeoContentBox />}
      <SiteFooter settings={settings} hideDisclaimer={activeFilter === 'Home'} />
    </div>
  );
};

export default Index;
