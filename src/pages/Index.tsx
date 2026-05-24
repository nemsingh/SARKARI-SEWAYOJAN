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
        "url": "https://sarkarisewayojan.com/",
        "logo": {
          "@type": "ImageObject",
          "url": settings.logo_url || "https://sarkarisewayojan.com/logo.png"
        }
      }
    ]
  };

  const pageTitle = activeFilter === 'Home' 
    ? "Sarkari Sewayojan | Sarkari Result, Sarkari Exam, Latest Govt Jobs Portal"
    : `${activeFilter} Jobs - Sarkari Sewayojan | Sarkari Result, Sarkari Exam`;

  const pageDescription = activeFilter === 'Home'
    ? "Sarkari Sewayojan is India's No.1 Govt Jobs Portal. Get latest Sarkari Result, Sarkari Exam, Free Job Alert, Railway, Bank, SSC, UPSSSC, and Police Jobs updates instantly."
    : `Get the latest updates, online forms, and Sarkari Result for ${activeFilter} jobs on Sarkari Sewayojan. Stay updated with Sarkari Exam notifications.`;

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
            <div className="category-box-body bg-background rounded-2xl relative pt-[70px] px-5 pb-5 text-center" style={{ boxShadow: 'var(--box-shadow-strong)', transform: 'translateZ(0)' }}>
              <div className="category-box-header absolute top-0 left-0 w-full text-center text-[26px] font-bold text-primary py-4 bg-gray-100 rounded-t-2xl" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
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
