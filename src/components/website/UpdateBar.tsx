import { useNavigate } from 'react-router-dom';

interface UpdateItem {
  text: string;
  url: string;
}

interface UpdateBarProps {
  text: string;
  direction?: 'left' | 'right' | 'bounce';
}

const parseUpdateBarText = (raw: string): UpdateItem[] => {
  if (!raw) return [];
  return raw.split('\n').filter(line => line.trim()).map(line => {
    const parts = line.split('||');
    return {
      text: parts[0]?.trim() || '',
      url: parts[1]?.trim() || '',
    };
  });
};

const UpdateBar = ({ text, direction = 'left' }: UpdateBarProps) => {
  const navigate = useNavigate();
  const items = parseUpdateBarText(text);

  const handleClick = (url: string) => {
    if (!url) return;
    let finalUrl = url;
    if (!url.startsWith('http') && !url.startsWith('/') && !url.startsWith('#') && !url.startsWith('mailto:')) {
      finalUrl = `/post/${url}`;
    }
    window.open(finalUrl, '_blank');
  };

  if (items.length === 0) return null;

  const animClass = direction === 'right' ? 'animate-scroll-right' : direction === 'bounce' ? 'animate-scroll-bounce' : 'animate-scroll-left';

  return (
    <div className="update-bar-wrapper bg-[hsl(var(--update-bar-bg))] py-3 overflow-hidden relative">
      <div className={`inline-block whitespace-nowrap text-accent text-[22px] font-semibold ${animClass}`}>
        {items.map((item, i) => (
          <span key={i}>
            {item.url ? (
              <span onClick={() => handleClick(item.url)} className="cursor-pointer hover:underline">
                {item.text}
              </span>
            ) : (
              <span>{item.text}</span>
            )}
            {i < items.length - 1 && <span className="mx-4">•</span>}
          </span>
        ))}
      </div>
    </div>
  );
};

export default UpdateBar;
