interface CategoryLink {
  id: string;
  title: string;
  url: string | null;
  is_new?: boolean;
  last_date_text?: string | null;
}

interface CategoryBoxProps {
  name: string;
  links: CategoryLink[];
  maxVisible?: number;
}

const getValidUrl = (url: string | null) => {
  if (!url) return '#';
  if (url.startsWith('http') || url.startsWith('/') || url.startsWith('#') || url.startsWith('mailto:')) {
    return url;
  }
  return `/post/${url}`;
};

const CategoryBox = ({ name, links, maxVisible = 25 }: CategoryBoxProps) => {
  const visibleLinks = links.slice(0, maxVisible);
  const hasMore = links.length > maxVisible;

  return (
    <div className="bg-background rounded-2xl relative pt-[70px] px-5 pb-5 transition-all duration-300 hover:-translate-y-1" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
      <div className="absolute top-0 left-0 w-full text-center text-[26px] font-bold text-primary py-4 bg-background/40 backdrop-blur-sm rounded-t-2xl" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        {name}
      </div>
      <ul className="list-none p-0 mt-2.5">
        {visibleLinks.map(link => (
          <li key={link.id} className="mb-2.5">
            <div className="flex items-center text-primary font-medium text-[19px] group">
              <span className="w-2 h-2 rounded-full bg-primary mr-2 flex-shrink-0 group-hover:scale-150 transition-transform" />
              {link.url ? (
                <a href={getValidUrl(link.url)} target="_blank" rel="noopener noreferrer" className="text-primary no-underline hover:underline hover:text-accent transition-colors">
                  {link.title}
                </a>
              ) : (
                link.title
              )}
              {link.is_new && (
                <span className="ml-2 text-[16px] font-bold animate-blink-new">New</span>
              )}
            </div>
            {link.last_date_text && (
              <div className="ml-4 text-[16px] text-destructive font-semibold mt-0.5">
                {link.last_date_text}
              </div>
            )}
          </li>
        ))}
      </ul>
      {hasMore && (
       <a
           href={`/category/${encodeURIComponent(name)}`}
           target="_blank"
           rel="noopener noreferrer"
           className="block text-center text-primary font-bold mt-2 hover:underline text-[19px] hover:text-accent transition-colors"
         >
           More →
         </a>
      )}
    </div>
  );
};

export default CategoryBox;
