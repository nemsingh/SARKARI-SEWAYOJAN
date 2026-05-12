import { useEffect, useMemo, useState } from 'react';
import { getCache, setCache } from '@/lib/cache';
import { fetchHomeData } from '@/lib/fetchData';
import SiteHeader from '@/components/website/SiteHeader';
import SiteMenu from '@/components/website/SiteMenu';
import Sidebar from '@/components/website/Sidebar';
import SiteFooter from '@/components/website/SiteFooter';

type LangCode = 'en' | 'hi';

interface LangOption {
  code: LangCode;
  label: string;
  nativeLabel: string;
}

interface PolicySection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

interface PolicyContent {
  title: string;
  sections: PolicySection[];
}

const languages: LangOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
];

const englishPolicy: PolicyContent = {
  title: 'DMCA / Copyright Policy',
  sections: [
    {
      heading: 'Effective Date: 01-01-2026',
      paragraphs: [
        'We respect the intellectual property rights of others and expect users of our website to do the same. In accordance with the Digital Millennium Copyright Act (DMCA), we will respond to properly submitted notices of alleged copyright infringement.',
      ],
    },
    {
      heading: '1. Content Ownership',
      paragraphs: [
        'All content published on www.sarkarisewayojan.com, including text, graphics, logos, job listings formatting, design, and code, is the property of Sarkari Sewayojan unless otherwise stated. Unauthorized use, reproduction, or copying is strictly prohibited.',
      ],
    },
    {
      heading: '2. Reporting Copyright Infringement',
      paragraphs: [
        'If you believe that any content on this website infringes your copyright, you may submit a written DMCA notice with the following details:',
      ],
      bullets: [
        'Your full name and contact information (email, phone number)',
        'Description of the copyrighted work',
        'Exact URL of the infringing content',
        'A statement that you believe in good faith that the use is unauthorized',
        'A statement that the information provided is accurate and you are the copyright owner (or authorized to act on behalf)',
        'Your physical or electronic signature',
      ],
    },
    {
      heading: '3. Action on Valid Complaints',
      paragraphs: [
        'Upon receiving a valid DMCA notice:',
      ],
      bullets: [
        'We may remove or disable access to the allegedly infringing content',
        'We may notify the user responsible for the content',
      ],
    },
    {
      heading: '4. Repeat Infringers',
      paragraphs: [
        'We reserve the right to terminate access of users who repeatedly infringe copyrights.',
      ],
    },
    {
      heading: '5. Contact for DMCA Notices',
      paragraphs: [
        'Email: Helpdesk@sarkarisewayojan.com',
      ],
    },
    {
      heading: '6. Disclaimer',
      paragraphs: [
        'We do not knowingly host pirated or copyrighted content. All job-related information is collected from publicly available sources and is shared for informational purposes only.',
        'If any content violates copyright, please contact us for immediate removal.',
      ],
    },
  ],
};

const hindiPolicy: PolicyContent = {
  title: 'DMCA / कॉपीराइट नीति',
  sections: [
    {
      heading: 'प्रभावी तिथि: 01-01-2026',
      paragraphs: [
        'हम दूसरों के बौद्धिक संपदा अधिकारों का सम्मान करते हैं और अपनी वेबसाइट के उपयोगकर्ताओं से भी ऐसा ही करने की अपेक्षा करते हैं। डिजिटल मिलेनियम कॉपीराइट एक्ट (DMCA) के अनुसार, हम कथित कॉपीराइट उल्लंघन के उचित रूप से प्रस्तुत किए गए नोटिसों का जवाब देंगे।',
      ],
    },
    {
      heading: '1. सामग्री का स्वामित्व',
      paragraphs: [
        'www.sarkarisewayojan.com पर प्रकाशित सभी सामग्री, जिसमें टेक्स्ट, ग्राफिक्स, लोगो, जॉब लिस्टिंग फॉर्मेटिंग, डिज़ाइन और कोड शामिल हैं, सरकारी सेवायोजन की संपत्ति है, जब तक कि अन्यथा न कहा गया हो। अनधिकृत उपयोग, पुनरुत्पादन या नकल करना सख्त वर्जित है।',
      ],
    },
    {
      heading: '2. कॉपीराइट उल्लंघन की रिपोर्ट करना',
      paragraphs: [
        'यदि आपको लगता है कि इस वेबसाइट की कोई भी सामग्री आपके कॉपीराइट का उल्लंघन करती है, तो आप निम्नलिखित विवरणों के साथ एक लिखित DMCA नोटिस प्रस्तुत कर सकते हैं:',
      ],
      bullets: [
        'आपका पूरा नाम और संपर्क जानकारी (ईमेल, फोन नंबर)',
        'कॉपीराइट किए गए कार्य का विवरण',
        'उल्लंघन करने वाली सामग्री का सटीक URL',
        'एक बयान कि आप सद्भावपूर्वक विश्वास करते हैं कि उपयोग अनधिकृत है',
        'एक बयान कि प्रदान की गई जानकारी सटीक है और आप कॉपीराइट स्वामी हैं (या ओर से कार्य करने के लिए अधिकृत हैं)',
        'आपका भौतिक या इलेक्ट्रॉनिक हस्ताक्षर',
      ],
    },
    {
      heading: '3. वैध शिकायतों पर कार्रवाई',
      paragraphs: [
        'एक वैध DMCA नोटिस प्राप्त होने पर:',
      ],
      bullets: [
        'हम कथित रूप से उल्लंघन करने वाली सामग्री को हटा सकते हैं या उस तक पहुंच अक्षम कर सकते हैं',
        'हम सामग्री के लिए जिम्मेदार उपयोगकर्ता को सूचित कर सकते हैं',
      ],
    },
    {
      heading: '4. बार-बार उल्लंघन करने वाले',
      paragraphs: [
        'हम उन उपयोगकर्ताओं की पहुंच समाप्त करने का अधिकार सुरक्षित रखते हैं जो बार-बार कॉपीराइट का उल्लंघन करते हैं।',
      ],
    },
    {
      heading: '5. DMCA नोटिस के लिए संपर्क',
      paragraphs: [
        'ईमेल: Helpdesk@sarkarisewayojan.com',
      ],
    },
    {
      heading: '6. अस्वीकरण',
      paragraphs: [
        'हम जानबूझकर पायरेटेड या कॉपीराइट सामग्री होस्ट नहीं करते हैं। नौकरी से संबंधित सभी जानकारी सार्वजनिक रूप से उपलब्ध स्रोतों से एकत्र की जाती है और केवल सूचनात्मक उद्देश्यों के लिए साझा की जाती है।',
        'यदि कोई सामग्री कॉपीराइट का उल्लंघन करती है, तो कृपया तत्काल हटाने के लिए हमसे संपर्क करें।',
      ],
    },
  ],
};

const contentByLanguage: Record<LangCode, PolicyContent> = {
  en: englishPolicy,
  hi: hindiPolicy,
};

const DmcaPolicy = () => {
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

  const [lang, setLang] = useState<LangCode>('en');
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

    if (option === 'Home') {
      window.open('/', '_self');
      return;
    }

    if (option === 'Contact Us') {
      window.open('/contact-us', '_self');
      return;
    }

    window.open(`/category/${encodeURIComponent(option)}`, '_self');
  };

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (!query) return;

    window.open(`/?search=${encodeURIComponent(query)}`, '_blank');
    setSearchQuery('');
  };

  const currentContent = useMemo(() => contentByLanguage[lang] || contentByLanguage.en, [lang]);

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
          {/* Language Toggle */}
          <div className="bg-muted/60 px-4 md:px-6 py-4 flex items-center gap-3 justify-center border-b border-border">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => setLang(language.code)}
                className={`px-5 md:px-7 py-2.5 rounded-full text-sm md:text-base font-bold tracking-wide transition-all border-2 ${
                  lang === language.code
                    ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                    : 'bg-background text-foreground border-border hover:border-primary hover:bg-primary/5'
                }`}
              >
                {language.nativeLabel}
              </button>
            ))}
          </div>

          <div className="px-5 sm:px-6 md:px-10 py-6 md:py-10">
            {/* Main Title */}
            <div className="text-center mb-8 md:mb-12 pb-6 border-b-2 border-primary/20">
              <h1 className="text-primary text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
                {currentContent.title}
              </h1>
            </div>

            {currentContent.sections.map((section) => (
              <section key={section.heading} className="mb-8 md:mb-10 last:mb-0">
                <h2 className="text-primary text-lg sm:text-xl md:text-2xl font-extrabold mb-3 md:mb-4 pb-2 border-b border-border/60 flex items-center gap-2">
                  <span className="inline-block w-1 h-6 md:h-7 bg-primary rounded-full" />
                  {section.heading}
                </h2>

                {section.paragraphs.map((paragraph, index) => (
                  <p key={`${section.heading}-${index}`} className="text-foreground text-[16px] sm:text-[17px] md:text-[19px] leading-7 sm:leading-8 md:leading-9 mb-3 last:mb-0">
                    {paragraph}
                  </p>
                ))}

                {section.bullets && section.bullets.length > 0 && (
                  <ul className="list-disc text-foreground text-[16px] sm:text-[17px] md:text-[19px] leading-7 sm:leading-8 md:leading-9 mt-2 pl-6 md:pl-8 space-y-1">
                    {section.bullets.map((bullet) => (
                      <li key={`${section.heading}-${bullet}`}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>

      <SiteFooter settings={settings} />
    </div>
  );
};

export default DmcaPolicy;
