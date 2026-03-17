interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onFilter: (option: string) => void;
}

const Sidebar = ({ isOpen, onToggle, onFilter }: SidebarProps) => {
  const menuItems = ['Home', 'Latest Jobs', 'Admit Card', 'Result', 'Answer Key', 'Syllabus', 'Contact Us'];

  const handleClick = (item: string) => {
    onFilter(item);
    onToggle();
  };

  return (
    <>
      {/* Hamburger */}
      <div className="fixed top-8 left-5 cursor-pointer z-[3000]" onClick={onToggle}>
        <div className="w-7 h-[3px] bg-primary my-1.5 rounded-sm" />
        <div className="w-7 h-[3px] bg-primary my-1.5 rounded-sm" />
        <div className="w-7 h-[3px] bg-primary my-1.5 rounded-sm" />
      </div>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-transparent z-[2000]" onClick={onToggle} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 h-full w-[280px] backdrop-blur-[20px] bg-primary/5 transition-all duration-400 pt-24 z-[2500] ${
          isOpen ? 'left-0' : '-left-[280px]'
        }`}
      >
      {menuItems.map(item => (
          <a
            key={item}
            onClick={() => handleClick(item)}
            className="block py-4 px-8 no-underline text-primary font-semibold text-lg cursor-pointer hover:bg-primary hover:text-primary-foreground hover:pl-10 transition-all duration-200"
          >
            {item}
          </a>
        ))}
      </div>
    </>
  );
};

export default Sidebar;
