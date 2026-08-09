interface SiteMenuProps {
  onFilter: (option: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
}

const SiteMenu = ({ onFilter, searchQuery, onSearchChange, onSearch }: SiteMenuProps) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSearch();
  };

  const menuItems = ['Home', 'Latest Jobs', 'Admit Card', 'Result', 'Answer Key', 'Syllabus', 'Contact Us'];

  return (
    <div className="site-menu hidden md:flex justify-evenly items-center bg-background sticky top-[173px] z-40 w-full px-1" style={{ boxShadow: 'var(--box-shadow-light)' }}>
      {menuItems.map(item => (
        <a
          key={item}
          href={item === 'Home' ? '/' : item === 'Contact Us' ? '/contact-us' : `/category/${encodeURIComponent(item)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onFilter(item)}
          className="no-underline text-primary py-4 px-1 font-bold transition-all flex-1 text-center cursor-pointer whitespace-nowrap text-[18px] hover:bg-primary hover:text-primary-foreground select-none"
        >
          {item}
        </a>
      ))}
      <div className="flex-1 flex justify-center items-center px-1">
        <div className="search-bar-container w-full bg-background rounded-full p-1 border border-border flex items-center" style={{ boxShadow: '2px 2px 6px rgba(0,0,0,0.1)' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search..."
            className="flex-1 border-none outline-none py-1.5 px-2.5 rounded-full text-[18px] bg-transparent min-w-0"
          />
          <button onClick={onSearch} aria-label="Search" className="w-9 h-9 rounded-full border-none cursor-pointer flex items-center justify-center bg-background hover:bg-primary/10 transition-colors flex-shrink-0" style={{ boxShadow: '1px 1px 4px rgba(0,0,0,0.1)' }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-primary stroke-[2.5] fill-none">
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SiteMenu;
