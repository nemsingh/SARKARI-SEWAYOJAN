import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCache, setCache } from '@/lib/cache';
import SiteHeader from '@/components/website/SiteHeader';
import SiteMenu from '@/components/website/SiteMenu';
import Sidebar from '@/components/website/Sidebar';
import CategoryBox from '@/components/website/CategoryBox';
import SiteFooter from '@/components/website/SiteFooter';

const CategoryMore = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const [links, setLinks] = useState<any[]>([]);
  const [category, setCategory] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryLinks, setCategoryLinks] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

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
      
      let foundCategory = false;
      const decodedName = decodeURIComponent(name);
      if (cachedCats && cachedLinks) {
        const cat = cachedCats.find((c: any) => c.name === decodedName);
        if (cat) {
          setCategory(cat);
          setLinks(cachedLinks.filter((l: any) => l.category_id === cat.id));
          foundCategory = true;
        }
      }

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
        const allCats = data.categories || [];
        const allLinks = data.category_links || [];
        const sett = data.settings_flat || {};
        
        const decodedName2 = decodeURIComponent(name);
        const cat = allCats.find((c: any) => c.name === decodedName2);
        if (cat) {
          setCategory(cat);
          setLinks(allLinks.filter((l: any) => l.category_id === cat.id));
        }
        setCategories(allCats);
        setCategoryLinks(allLinks);
        setSettings(sett);
      }
    };
    fetchData();
  }, [name]);

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
    }
  };

  const filteredCategories = activeFilter
    ? categories.filter(c => c.name.includes(activeFilter))
    : [];

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
        <div className="mx-auto my-8 px-3">
          <h2 className="text-3xl font-bold text-primary mb-6">{category?.name || 'Category'} - All Links</h2>
          <div className="bg-background rounded-2xl p-6" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
            <ul className="list-none p-0">
              {links.map(link => (
                <li key={link.id} className="flex items-center mb-3 text-primary font-medium text-base">
                  <span className="w-2 h-2 rounded-full bg-primary mr-3 flex-shrink-0" />
                  {link.url ? (
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary no-underline hover:underline">
                      {link.title}
                    </a>
                  ) : (
                    link.title
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <SiteFooter settings={settings} hideDisclaimer={false} />
    </div>
  );
};

export default CategoryMore;
