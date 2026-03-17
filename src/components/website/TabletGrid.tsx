interface TabletItem {
  id: string;
  title: string;
  subtitle: string | null;
  url: string | null;
}

interface TabletGridProps {
  items: TabletItem[];
  searchQuery?: string;
}

const TabletGrid = ({ items, searchQuery }: TabletGridProps) => {
  const filtered = searchQuery
    ? items.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : items;

  return (
    <div className="max-w-[1200px] mx-auto my-5 grid grid-cols-4 gap-2.5 px-5 max-sm:grid-cols-2">
      {filtered.map(item => (
        <a
          key={item.id}
          href={item.url || '#'}
          className="py-4 px-2.5 text-center text-primary no-underline font-extrabold text-xl bg-background rounded-xl transition-all duration-300 flex flex-col justify-center min-h-[65px] border border-primary hover:bg-primary hover:text-primary-foreground hover:-translate-y-1 max-sm:text-base"
          style={{ boxShadow: '0 8px 15px rgba(0,0,0,0.25)' }}
        >
          {item.title}
          {item.subtitle && (
            <span className="block text-[11px] font-medium mt-1 text-muted-foreground">
              {item.subtitle}
            </span>
          )}
        </a>
      ))}
    </div>
  );
};

export default TabletGrid;
