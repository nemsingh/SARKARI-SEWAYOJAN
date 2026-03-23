import { useState, useEffect } from 'react';
import { getCategories, getCategoryLinks, getPosts, getTabletItems, getSiteSettingsFlat } from '@/lib/firebaseService';
import { getCache, setCache } from '@/lib/cache';
import SiteHeader from '@/components/website/SiteHeader';
import SiteMenu from '@/components/website/SiteMenu';
import Sidebar from '@/components/website/Sidebar';
import UpdateBar from '@/components/website/UpdateBar';
import TabletGrid from '@/components/website/TabletGrid';
import CategoryBox from '@/components/website/CategoryBox';
import SeoContentBox from '@/components/website/SeoContentBox';
import SiteFooter from '@/components/website/SiteFooter';

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
  const [appliedSearch, setAppliedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('Home');
  const [filterSource, setFilterSource] = useState<'menu' | 'more'>('menu');
  const [categories, setCategories] = useState<any[]>(() => initialData?.categories || getCache('categories') || []);
  const [categoryLinks, setCategoryLinks] = useState<any[]>(() => initialData?.category_links || getCache('category_links') || []);
  const [posts, setPosts] = useState<any[]>(() => initialData?.posts || getCache('posts') || []);
  const [tabletItems, setTabletItems] = useState<any[]>(() => initialData?.tablet_items || getCache('tablet_items') || []);
  const [settings, setSettings] = useState<Record<string, string>>(() => initialData?.settings_flat || getCache('settings_flat') || {});

  // Fetch from Firebase on the client side to ensure live updates
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [cats, links, psts, tabs, sett] = await Promise.all([
          getCategories(),
          getCategoryLinks(),
          getPosts(),
          getTabletItems(),
          getSiteSettingsFlat()
        ]);
        
        // Filter out broken category links
        const postSlugs = psts.map(post => post.slug);
        const postIds = psts.map(post => post.id);
        const validLinks = links.filter(link => {
          if (link.url && link.url.startsWith('/post/')) {
            const slug = link.url.replace('/post/', '');
            return postSlugs.includes(slug) || postIds.includes(slug);
          }
          return true; // Keep external links
        });

        setCategories(cats);
        setCategoryLinks(validLinks);
        setPosts(psts);
        setTabletItems(tabs);
        setSettings(sett);
        
        // Update cache
        setCache('categories', cats);
        setCache('category_links', validLinks);
        setCache('posts', psts);
        setCache('tablet_items', tabs);
        setCache('settings_flat', sett);
      } catch (e) {
        console.error('Fetch error:', e);
      }
    };

    fetchAll();
  }, []);

  const handleFilter = (option: string) => {
    if (option === 'Home') {
      setActiveFilter('Home');
      setAppliedSearch('');
      setSidebarOpen(false);
      return;
    }
    const url = `/?filter=${encodeURIComponent(option)}&source=menu`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filter = params.get('filter');
    const source = params.get('source');
    if (filter) {
      setActiveFilter(filter);
      setFilterSource(source === 'more' ? 'more' : 'menu');
    }
  }, []);

  const handleSearch = () => {
    setAppliedSearch(searchQuery);
    setSearchQuery('');
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
  const filteredPosts = filterSource === 'more' && activeFilter !== 'Home'
    ? posts.filter((post) => {
        const searchTargets = [
          post.name_of_post,
          post.name_of_post_hi,
          post.short_info,
          post.short_info_hi,
          post.tables_html,
          post.tables_html_hi,
        ];
        return searchTargets.some((value) => (value || '').toLowerCase().includes(keyword));
      })
    : [];

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

  return (
    <div className="min-h-screen bg-background overflow-x-hidden font-sans">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} onFilter={handleFilter} />
      <SiteHeader />
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
        <div className="py-8 px-3 mx-auto">
          <div className="bg-background rounded-2xl relative pt-[70px] px-5 pb-5" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
            <div className="absolute top-0 left-0 w-full text-center text-xl font-bold text-primary py-4 bg-background/40 backdrop-blur-sm rounded-t-2xl" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              {activeFilter} Update's
            </div>
            {filteredPosts.length > 0 ? (
              <ul className="list-none p-0 mt-2.5">
                {filteredPosts.map((post) => (
                  <li key={post.id} className="mb-2.5">
                    <div className="flex items-center text-primary font-medium text-sm">
                      <span className="w-2 h-2 rounded-full bg-primary mr-2 flex-shrink-0" />
                      <a
                        href={`/post/${encodeURIComponent(post.slug || post.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary no-underline hover:underline"
                      >
                        {post.name_of_post}
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-primary font-medium mt-2.5">No updates found for {activeFilter}.</p>
            )}
          </div>
        </div>
      ) : (
        <div className={`grid gap-5 py-8 px-3 mx-auto ${activeFilter !== 'Home' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {filteredCategoriesWithSearch.map(cat => (
            <CategoryBox
              key={cat.id}
              name={cat.name}
              links={categoryLinks.filter(l => l.category_id === cat.id)}
            />
          ))}
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
