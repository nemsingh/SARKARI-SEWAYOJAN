import { useEffect, useState } from 'react';
import { getCache, setCache } from '@/lib/cache';
import { fetchHomeData } from '@/lib/fetchData';
import SiteHeader from '@/components/website/SiteHeader';
import SiteMenu from '@/components/website/SiteMenu';
import Sidebar from '@/components/website/Sidebar';
import SiteFooter from '@/components/website/SiteFooter';

interface PolicySection {
  heading: string;
  paragraphs: string[];
}

interface PolicyContent {
  title: string;
  sections: PolicySection[];
}

const factCheckingPolicy: PolicyContent = {
  title: 'Fact Checking Policy',
  sections: [
    {
      heading: 'Overview',
      paragraphs: [
        'At Sarkari Sewayojan, maintaining accuracy, reliability, and transparency is one of our highest priorities. We are committed to providing users with trustworthy information related to government jobs, admit cards, results, admissions, answer keys, government schemes, and other educational updates.',
      ],
    },
    {
      heading: 'Our Fact-Checking Process',
      paragraphs: [
        'Before publishing any content on our website, our editorial team carefully reviews information using multiple reliable and publicly available sources, including:',
        '• Official Government Websites<br/>• Recruitment Boards & Commissions<br/>• Public Notifications & Advertisements<br/>• Official Press Releases<br/>• Employment News & Department Notices<br/>• Educational Institutions & Examination Authorities',
        'We make reasonable efforts to verify important details such as:',
        '• Application Dates<br/>• Eligibility Criteria<br/>• Age Limits<br/>• Selection Process<br/>• Exam Dates<br/>• Admit Card Availability<br/>• Result Announcements<br/>• Official Notification Details'
      ],
    },
    {
      heading: 'Editorial Review',
      paragraphs: [
        'All content published on Sarkari Sewayojan goes through an editorial review process before publication. Our team aims to ensure that the information is presented clearly, accurately, and in a user-friendly format.',
      ],
    },
    {
      heading: 'Corrections & Updates',
      paragraphs: [
        'Although we strive to provide accurate and updated information, unintentional errors or delays in updates may occasionally occur. If any incorrect, outdated, or incomplete information is identified, necessary corrections and updates are made as soon as possible.',
        'Users are also encouraged to verify important information through the official website of the concerned department or authority before making any decision or application.',
      ],
    },
    {
      heading: 'User Feedback',
      paragraphs: [
        'We value feedback from our users. If you notice any factual error, outdated information, or misleading content on our website, you may contact us through our official support email.',
        '<strong>Support Email:</strong><br/>Helpdesk@sarkarisewayojan.com',
      ],
    },
    {
      heading: 'Transparency Commitment',
      paragraphs: [
        'Sarkari Sewayojan is an independent informational platform. We do not represent any government authority or organization. Our objective is to simplify official information and make it easily accessible for users in a clear and understandable manner.',
      ],
    },
  ],
};

const FactCheckingPolicy = () => {
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

  const [settings, setSettings] = useState<Record<string, string>>(() => initialData?.settings_flat || getCache('settings_flat') || {});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
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
          const sett = data.settings_flat || {};
          setSettings(sett);
          setCache('settings_flat', sett);
        }
      } catch (error) {
        console.error('Settings fetch error:', error);
      }
    };

    fetchSettings();
  }, []);

  const handleFilter = (option: string) => {
    setSidebarOpen(false);
  };

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (!query) return;

    window.open(`/?search=${encodeURIComponent(query)}`, '_blank');
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden font-sans">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} onFilter={handleFilter} />
      <SiteHeader logoUrl={settings.logo_url} />
      <SiteMenu
        onFilter={handleFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearch={handleSearch}
      />

      <div className="px-3 sm:px-4 md:px-6 py-4 md:py-8 mx-auto max-w-[1400px]">
        <div className="w-full rounded-2xl overflow-hidden bg-card border border-border" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div className="px-5 sm:px-6 md:px-10 py-6 md:py-10">
            {/* Main Title */}
            <div className="text-center mb-8 md:mb-12 pb-6 border-b-2 border-primary/20">
              <h1 className="text-primary text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
                {factCheckingPolicy.title}
              </h1>
            </div>

            {factCheckingPolicy.sections.map((section) => (
              <section key={section.heading} className="mb-8 md:mb-10 last:mb-0">
                <h2 className="text-primary text-lg sm:text-xl md:text-2xl font-extrabold mb-3 md:mb-4 pb-2 border-b border-border/60 flex items-center gap-2">
                  <span className="inline-block w-1 h-6 md:h-7 bg-primary rounded-full" />
                  {section.heading}
                </h2>

                {section.paragraphs.map((paragraph, index) => (
                  <p key={`${section.heading}-${index}`} className="text-foreground text-[16px] sm:text-[17px] md:text-[19px] leading-7 sm:leading-8 md:leading-9 mb-3 last:mb-0" dangerouslySetInnerHTML={{ __html: paragraph }} />
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>

      <SiteFooter settings={settings} />
    </div>
  );
};

export default FactCheckingPolicy;
