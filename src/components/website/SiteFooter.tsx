import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface FooterSection {
  title: string;
  items: { text: string; url: string }[];
}

const parseFooterSection = (raw: string): { text: string; url: string }[] => {
  if (!raw) return [];
  return raw.split('\n').filter(l => l.trim()).map(line => {
    const parts = line.split('||');
    return { text: parts[0]?.trim() || '', url: parts[1]?.trim() || '' };
  });
};

interface SiteFooterProps {
  settings?: Record<string, string>;
  hideDisclaimer?: boolean;
}

const SiteFooter = ({ settings = {}, hideDisclaimer = false }: SiteFooterProps) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    if (isHomePage) return;

    // Load DMCA script dynamically
    const script = document.createElement('script');
    script.src = 'https://images.dmca.com/Badges/DMCABadgeHelper.min.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script if component unmounts
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [isHomePage]);

  const quickLinks = [
    ...parseFooterSection(settings['footer_quick_links'] || ''),
    { text: 'Privacy Policy', url: '/privacy-policy' },
  ];
  const apps = parseFooterSection(settings['footer_apps'] || '');
  const more = parseFooterSection(settings['footer_more'] || '');

  const sections: FooterSection[] = [
    { title: 'Quick Links', items: quickLinks },
    { title: 'Apps', items: apps },
  ].filter(s => s.items.length > 0);

  // "More" section items act as category filters - open in new tab
  const moreSection = more.length > 0 ? { title: 'More', items: more } : null;

  return (
    <>
      <div className="mx-auto px-3 mt-8 mb-4">
        {/* Footer Sections */}
        {(sections.length > 0 || moreSection) && (
          <div className={`grid grid-cols-1 ${sections.length + (moreSection ? 1 : 0) >= 3 ? 'md:grid-cols-3' : sections.length + (moreSection ? 1 : 0) >= 2 ? 'md:grid-cols-2' : ''} gap-4 mb-6`}>
            {sections.map(section => (
              <div key={section.title} className="rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
                <h3 className="bg-primary text-primary-foreground text-[20px] font-bold py-2.5 px-4">{section.title}</h3>
                <div className="bg-background py-2 px-4">
                  {section.items.map((item, i) => (
                    <div key={i} className="py-1.5">
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary text-[18px] font-medium hover:underline hover:text-accent hover:pl-1 transition-all">
                          {item.text}
                        </a>
                      ) : (
                        <span className="text-primary text-[18px]">{item.text}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {moreSection && (
              <div className="rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
                <h3 className="bg-primary text-primary-foreground text-[20px] font-bold py-2.5 px-4">{moreSection.title}</h3>
                <div className="bg-background py-2 px-4">
                  <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
                    {moreSection.items.map((item, i) => (
                      <a
                        key={i}
                        href={item.url || `/?filter=${encodeURIComponent(item.text)}&source=more`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-[18px] font-medium hover:underline hover:text-accent hover:pl-1 transition-all cursor-pointer py-1"
                      >
                        {item.text}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Welcome Box */}
        <div className="rounded-2xl overflow-hidden mb-6" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
          <h2 className="bg-primary text-primary-foreground text-[20px] font-bold py-3 px-5">
            Welcome to the Official Website of Sarkari Sewayojan
          </h2>
          <div className="bg-background text-primary py-3 px-5 text-[18px] leading-relaxed">
            Thank you for visiting the official portal of Sarkari Sewayojan. Through this website, you can easily access the latest updates related to Government Jobs, Recruitment Notifications, Admissions, Results, Admit Cards, Answer Keys, Syllabus, and other important announcements. For your convenience, our official mobile application is also available free of charge on the Google Play Store and Apple App Store. You can also stay connected with Sarkari Sewayojan through our official social media platforms including X (Twitter), Facebook, Instagram, Threads, Telegram, WhatsApp, and YouTube for regular updates.
          </div>
          <div className="bg-background text-primary py-3 px-5 text-[18px] leading-relaxed border-t border-border">
            © 2026–2027 Sarkari Sewayojan. All Rights Reserved. For advertisement and business inquiries, please contact: helpdesk@sarkarisewayojan.com
          </div>
        </div>

        {/* Disclaimer Box - hidden on home page where SeoContentBox already has it */}
        {!hideDisclaimer && (
          <div className="rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
            <h2 className="bg-primary text-primary-foreground text-[20px] font-bold py-3 px-5">
              Disclaimer
            </h2>
            <div className="bg-background text-primary py-3 px-5 text-[18px] leading-relaxed">
              The examination results, marks, notifications, short information, and other content published on this website are provided solely for the purpose of immediate reference and information to candidates. This information should not be considered as a legal or official document. Although every reasonable effort is made to ensure that the information available on this website is accurate and up to date, Sarkari Sewayojan does not guarantee the completeness, reliability, or absolute accuracy of the content. We shall not be held responsible for any unintentional errors, omissions, or inaccuracies that may appear in the published results, marks, notifications, or other materials. Furthermore, we are not liable for any loss, damage, or inconvenience caused to any individual or entity due to any shortcomings, defects, or inaccuracies in the information provided on this website. Users are advised to verify details from the official website of the concerned department or authority before taking any action.
            </div>
          </div>
        )}
      </div>

      {/* DMCA Badge */}
      {!isHomePage && (
        <div className="flex justify-center mb-4">
          <a href="//www.dmca.com/Protection/Status.aspx?ID=fbf51709-e4ca-4d86-9bef-1b7e98731d7e" title="DMCA.com Protection Status" className="dmca-badge">
            <img src="https://images.dmca.com/Badges/dmca-badge-w150-5x1-07.png?ID=fbf51709-e4ca-4d86-9bef-1b7e98731d7e" alt="DMCA.com Protection Status" />
          </a>
        </div>
      )}

      {/* Full Width Bottom Footer */}
      <div className="site-footer-bottom w-full bg-[#0b3d91] text-white py-6 text-center font-bold mt-8">
        <p className="text-[16px] md:text-[18px] mb-3">
          © 2026 Sarkari Sewayojan | www.sarkarisewayojan.com | All Rights Reserved
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-[14px] md:text-[16px]">
          <a href="/privacy-policy" className="hover:underline">Privacy Policy</a>
          <span>|</span>
          <a href="/terms-and-conditions" className="hover:underline">Terms & Conditions</a>
          <span>|</span>
          <a href="/dmca-policy" className="hover:underline">DMCA Policy</a>
          <span>|</span>
          <a href="/contact-us" className="hover:underline">Contact Us</a>
        </div>
      </div>
    </>
  );
};

export default SiteFooter;
