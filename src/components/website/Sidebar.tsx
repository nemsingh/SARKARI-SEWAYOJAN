import { useEffect, useState } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onFilter: (option: string) => void;
}

const Sidebar = ({ isOpen, onToggle, onFilter }: SidebarProps) => {
  const menuItems = ['Home', 'Latest Jobs', 'Admit Card', 'Result', 'Answer Key', 'Syllabus', 'Contact Us'];
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (window.scrollY > 150) {
            setIsScrolled(true);
          } else {
            setIsScrolled(false);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount in case already scrolled
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = (item: string) => {
    onFilter(item);
    onToggle();
  };

  return (
    <>
      {/* Hamburger */}
      <div 
        className={`hamburger-menu fixed top-8 left-5 cursor-pointer z-[3000] transition-all duration-300 ${isOpen ? 'is-open' : ''} ${isScrolled && !isOpen ? '-translate-x-[150%] opacity-0' : 'translate-x-0 opacity-100'}`} 
        onClick={onToggle}
      >
        <div className="hamburger-line w-7 h-[3px] bg-primary my-1.5 rounded-sm transition-colors" />
        <div className="hamburger-line w-7 h-[3px] bg-primary my-1.5 rounded-sm transition-colors" />
        <div className="hamburger-line w-7 h-[3px] bg-primary my-1.5 rounded-sm transition-colors" />
      </div>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-transparent z-[2000]" onClick={onToggle} />
      )}

      {/* Sidebar */}
      <div
        className={`sidebar fixed top-0 h-full w-[280px] backdrop-blur-[20px] bg-primary/5 transition-all duration-400 pt-24 z-[2500] ${
          isOpen ? 'left-0' : '-left-[280px]'
        }`}
      >
      {menuItems.map(item => (
          <a
            key={item}
            href={item === 'Home' ? '/' : item === 'Contact Us' ? '/contact-us' : `/category/${encodeURIComponent(item)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleClick(item)}
            className="block py-4 px-8 no-underline text-primary font-semibold text-[20px] cursor-pointer hover:bg-primary hover:text-primary-foreground hover:pl-10 transition-all duration-200 select-none"
          >
            {item}
          </a>
        ))}
      </div>
    </>
  );
};

export default Sidebar;
