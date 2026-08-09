interface CategoryLink {
  id: string;
  title: string;
  url: string | null;
  is_new?: boolean;
  last_date_text?: string | null;
  actual_last_date_text?: string | null;
  link_timestamp?: number;
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

const isLinkExpired = (lastDateText: string | null | undefined): boolean => {
  if (!lastDateText) return false;
  
  let s = lastDateText.toLowerCase().trim();
  s = s.replace(/\|/g, ' ');
  
  const hindiToEnglishMonths: Record<string, string> = {
    'जनवरी': 'january',
    'फ़रवरी': 'february',
    'फरवरी': 'february',
    'मार्च': 'march',
    'अप्रैल': 'april',
    'मई': 'may',
    'जून': 'june',
    'जुलाई': 'july',
    'अगस्त': 'august',
    'सितंबर': 'september',
    'सितम्बर': 'september',
    'अक्टूबर': 'october',
    'अक्तूबर': 'october',
    'नवंबर': 'november',
    'नवम्बर': 'november',
    'दिसंबर': 'december',
    'दिसम्बर': 'december'
  };

  for (const [hindi, english] of Object.entries(hindiToEnglishMonths)) {
    if (s.includes(hindi)) {
      s = s.replace(new RegExp(hindi, 'g'), english);
    }
  }

  // Handle formats like: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = s.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})\b/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed month
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) {
      year += 2000;
    }
    const parsedDate = new Date(year, month, day);
    if (!isNaN(parsedDate.getTime())) {
      parsedDate.setHours(23, 59, 59, 999);
      return parsedDate.getTime() < Date.now();
    }
  }

  // Support suffix matching, e.g. "31st May" -> "31 May"
  s = s.replace(/\b(\d{1,2})(?:st|nd|rd|th)\b/g, '$1');

  // Strip non-standard characters from start/end before parsing to help standard new Date()
  // eslint-disable-next-line no-misleading-character-class
  let cleanAlpha = s.replace(/^[:\-–—\s\u200b•|ः।●]+/, '').replace(/[:\-–—\s|ः।●]+$/, '').trim();
  
  // Extract pure date substring if there is trailing noise like "(until 11:00 PM)"
  const matchAlpha = cleanAlpha.match(/\b\d{1,2}[\s./-]*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s./-]*\d{2,4}\b/i);
  if (matchAlpha) {
    cleanAlpha = matchAlpha[0];
  } else {
    const matchAlphaRev = cleanAlpha.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s./-]*\d{1,2}[\s./-]*\d{2,4}\b/i);
    if (matchAlphaRev) {
      cleanAlpha = matchAlphaRev[0];
    }
  }

  const tryStandard = new Date(cleanAlpha);
  if (!isNaN(tryStandard.getTime())) {
    tryStandard.setHours(23, 59, 59, 999);
    return tryStandard.getTime() < Date.now();
  }

  return false;
};

const CategoryBox = ({ name, links, maxVisible = 25 }: CategoryBoxProps) => {
  const isLatestJobs = name && (
    (name.toLowerCase().includes('latest') || name.toLowerCase().includes('letest')) && 
    name.toLowerCase().includes('job')
  );

  let actualMax = maxVisible;
  if (maxVisible >= 25 && maxVisible < 100 && links.length > 25) {
    let linesCount = 0;
    for (let i = 0; i < 25; i++) {
      if (!links[i]) break;
      linesCount += 1;
      if (links[i].title && links[i].title.length > 45) linesCount += 1;
      if (links[i].last_date_text || links[i].actual_last_date_text) linesCount += 1;
    }
    
    // Dynamically add 1-3 extra links if the box is visually shorter (fewer lines)
    if (linesCount < 28) actualMax = 28;
    else if (linesCount < 32) actualMax = 27;
    else if (linesCount < 36) actualMax = 26;
    else actualMax = 25;
  }

  const visibleLinks = links.slice(0, actualMax);
  const hasMore = links.length > actualMax;

  return (
    <div className="category-box-body bg-background rounded-2xl relative pt-[70px] px-5 pb-5 transition-all duration-300 hover:-translate-y-1 h-full flex flex-col" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
      <div className="category-box-header absolute top-0 left-0 w-full text-center text-[26px] font-bold text-primary py-4 bg-background/40 backdrop-blur-sm rounded-t-2xl" style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        {name}
      </div>
      <ul className="list-none p-0 mt-2.5 flex-1">
        {visibleLinks.map(link => {
          const CATEGORY_NEW_BADGE_EXPIRY_DAYS = 5;
          let isExpired = false;
          let showNewBadge = false;

          if (isLatestJobs) {
            isExpired = isLinkExpired(link.last_date_text || link.actual_last_date_text);
            // Latest Jobs category box parameters: automatically show 'New' badge if not expired
            showNewBadge = !isExpired;
          } else {
            if (link.link_timestamp) {
              const msSinceCreated = Date.now() - link.link_timestamp;
              const msInExpiryDays = CATEGORY_NEW_BADGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
              isExpired = msSinceCreated > msInExpiryDays;
            }
            showNewBadge = link.is_new && !isExpired;
          }

          return (
            <li key={link.id} className="category-link-item mb-2.5">
              <div className="flex items-start text-primary font-medium text-[19px] group leading-snug">
                <span className="w-2 h-2 rounded-full bg-primary mr-2.5 mt-2 flex-shrink-0 group-hover:scale-150 transition-transform" />
                <div className="flex-1">
                  {link.url ? (
                    <a href={getValidUrl(link.url)} target="_blank" rel="noopener noreferrer" className="text-primary no-underline hover:underline hover:text-accent transition-colors">
                      {link.title}
                    </a>
                  ) : (
                    link.title
                  )}
                  {showNewBadge && (
                    <span className="ml-2 text-[16px] font-bold animate-blink-new inline-block">New</span>
                  )}
                </div>
              </div>
              {(link.last_date_text || link.actual_last_date_text) && (
                <div className="ml-4 text-[16px] text-destructive font-semibold mt-0.5" style={{ color: 'red' }}>
                  {link.last_date_text || link.actual_last_date_text}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <div className="mt-auto pt-4 flex justify-end">
           <a
               href={`/category/${encodeURIComponent(name)}`}
               target="_blank"
               rel="noopener noreferrer"
               className="text-primary font-bold hover:underline text-[19px] hover:text-accent transition-colors"
             >
               View More
             </a>
         </div>
      )}
    </div>
  );
};

export default CategoryBox;
