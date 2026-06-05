import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCache, setCache } from '@/lib/cache';
import { fetchHomeData } from '@/lib/fetchData';
import SiteHeader from '@/components/website/SiteHeader';
import SiteMenu from '@/components/website/SiteMenu';
import Sidebar from '@/components/website/Sidebar';
import CategoryBox from '@/components/website/CategoryBox';
import SiteFooter from '@/components/website/SiteFooter';
import SEO from '@/components/SEO';

const getValidUrl = (url: string | null) => {
  if (!url) return '#';
  if (url.startsWith('http') || url.startsWith('/') || url.startsWith('#') || url.startsWith('mailto:')) {
    return url;
  }
  return `/post/${url}`;
};

const CategoryMore = () => {
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

  const { name } = useParams();
  const navigate = useNavigate();
  const [links, setLinks] = useState<any[]>(() => {
    if (initialData && initialData.category_links) {
      const cats = initialData.categories || [];
      const decodedName = decodeURIComponent(name || '');
      const cat = cats.find((c: any) => c.name === decodedName);
      if (cat) {
        let filtered = initialData.category_links.filter((l: any) => l.category_id === cat.id);
        const allPosts = initialData.posts || [];
        filtered = filtered.map((l: any) => {
          const match = l.url?.match(/\/post\/(.+)/);
          const slug = match ? match[1] : null;
          const post = allPosts.find((p: any) => p.slug === slug || p.id === slug);
          return { ...l, actual_last_date_text: post?.last_date_text };
        });
        return filtered;
      }
    }
    return [];
  });
  const [category, setCategory] = useState<any>(() => {
    if (initialData) {
      const cats = initialData.categories || [];
      const decodedName = decodeURIComponent(name || '');
      return cats.find((c: any) => c.name === decodedName) || null;
    }
    return null;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [categories, setCategories] = useState<any[]>(() => initialData?.categories || getCache('categories') || []);
  const [categoryLinks, setCategoryLinks] = useState<any[]>(() => initialData?.category_links || getCache('category_links') || []);
  const [settings, setSettings] = useState<Record<string, string>>(() => initialData?.settings_flat || getCache('settings_flat') || {});
  const [notFound, setNotFound] = useState(() => {
    if (initialData) {
      const cats = initialData.categories || [];
      const decodedName = decodeURIComponent(name || '');
      const cat = cats.find((c: any) => c.name === decodedName);
      return !cat;
    }
    return false;
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!name) return;
      
      // Try cache first
      const cachedCats = getCache<any[]>('categories');
      const cachedLinks = getCache<any[]>('category_links');
      const cachedSettings = getCache<Record<string, string>>('settings_flat');
      
      if (cachedCats) setCategories(cachedCats);
      if (cachedLinks) setCategoryLinks(cachedLinks);
      if (cachedSettings) setSettings(cachedSettings);
      
      const cachedPosts = getCache<any[]>('posts');
      let foundCategory = false;
      const decodedName = decodeURIComponent(name);
      if (cachedCats && cachedLinks && cachedSettings && cachedPosts) {
        const cat = cachedCats.find((c: any) => c.name === decodedName);
        if (cat) {
          setCategory(cat);
          let filtered = cachedLinks.filter((l: any) => l.category_id === cat.id);
          filtered = filtered.map((l: any) => {
            const match = l.url?.match(/\/post\/(.+)/);
            const slug = match ? match[1] : null;
            const post = cachedPosts.find((p: any) => p.slug === slug || p.id === slug);
            return { ...l, actual_last_date_text: post?.last_date_text };
          });
          setLinks(filtered);
          setNotFound(false);
          foundCategory = true;
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
        const allCats = data.categories || [];
        const allLinks = data.category_links || [];
        const sett = data.settings_flat || {};
        
        const decodedName2 = decodeURIComponent(name);
        const cat = allCats.find((c: any) => c.name === decodedName2);
        if (cat) {
          setCategory(cat);
          let filtered = allLinks.filter((l: any) => l.category_id === cat.id);
          const allPosts = data.posts || [];
          filtered = filtered.map((l: any) => {
            const match = l.url?.match(/\/post\/(.+)/);
            const slug = match ? match[1] : null;
            const post = allPosts.find((p: any) => p.slug === slug || p.id === slug);
            return { ...l, actual_last_date_text: post?.last_date_text };
          });
          setLinks(filtered);
        } else {
          setNotFound(true);
        }
        setCategories(allCats);
        setCategoryLinks(allLinks);
        setSettings(sett);
      } else {
        setNotFound(true);
      }
    };
    fetchData();
  }, [name]);

  const handleFilter = (option: string) => {
    setSidebarOpen(false);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.open('/?search=' + encodeURIComponent(searchQuery), '_blank');
    }
  };

  const filteredCategories = activeFilter
    ? categories.filter(c => c.name.includes(activeFilter))
    : [];

  if (notFound) return <div className="min-h-screen flex items-center justify-center text-primary font-bold text-xl">Category Not Found</div>;

  const categoryName = category?.name || decodeURIComponent(name || 'Category');

  return (
    <div className="min-h-screen bg-background font-sans overflow-x-hidden">
      <SEO 
        title={`${categoryName} - Sarkari Result | Sarkari Sewayojan`}
        description={`All latest updates, online forms, and Sarkari Result keys for ${categoryName} on Sarkari Sewayojan.`}
        keywords={`${categoryName}, ${categoryName} online form, ${categoryName} result, ${categoryName} admit card, sarkari result, sarkari exam, rojgar result, sewayojan`}
        url={`https://sarkarisewayojan.com/category/${encodeURIComponent(categoryName)}`}
      />
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
              <CategoryBox
                key={cat.id}
                name={cat.name}
                links={categoryLinks.filter(l => l.category_id === cat.id)}
              />
            ))}
          </div>
          <div className="text-center text-accent font-black text-lg my-2.5">
            {settings.contact_text || ''}
          </div>
        </>
      ) : (
        <div className="grid gap-5 py-8 px-3 mx-auto grid-cols-1">
          <CategoryBox
            name={`${categoryName} - All Links`}
            links={links}
            maxVisible={999999}
          />
        </div>
      )}
      <SiteFooter settings={settings} hideDisclaimer={false} />
    </div>
  );
};

export default CategoryMore;
