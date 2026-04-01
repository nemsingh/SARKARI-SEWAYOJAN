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
  title: 'Terms and Conditions',
  sections: [
    {
      heading: 'Effective Date: 01-01-2026',
      paragraphs: [
        'Welcome to www.sarkarisewayojan.com. By accessing or using our website, you agree to comply with and be bound by the following terms.',
      ],
    },
    {
      heading: '1. Use of Website',
      paragraphs: [
        'This website is provided for informational purposes related to job updates. Users must not misuse the content or attempt unauthorized activities.',
      ],
    },
    {
      heading: '2. Content Accuracy',
      paragraphs: [
        'We strive to provide accurate and up-to-date information, but we do not guarantee completeness or accuracy. Users are advised to verify details from official sources.',
      ],
    },
    {
      heading: '3. Intellectual Property',
      paragraphs: [
        'All content, design, and materials on this website are protected by copyright laws. Unauthorized copying or reproduction is prohibited.',
      ],
    },
    {
      heading: '4. External Links',
      paragraphs: [
        'Our website may contain links to third-party websites. We are not responsible for the content or policies of those sites.',
      ],
    },
    {
      heading: '5. Limitation of Liability',
      paragraphs: [
        'We shall not be held responsible for any loss or damage arising from the use of our website.',
      ],
    },
    {
      heading: '6. Changes to Terms',
      paragraphs: [
        'We may update these terms at any time without prior notice.',
      ],
    },
    {
      heading: '7. Contact',
      paragraphs: [
        'For any queries, contact us at:',
        'Email: Helpdesk@sarkarisewayojan.com',
      ],
    },
  ],
};

const hindiPolicy: PolicyContent = {
  title: 'नियम और शर्तें',
  sections: [
    {
      heading: 'प्रभावी तिथि: 01-01-2026',
      paragraphs: [
        'www.sarkarisewayojan.com में आपका स्वागत है। हमारी वेबसाइट तक पहुँचने या उसका उपयोग करने से, आप निम्नलिखित शर्तों का पालन करने और उनसे बाध्य होने के लिए सहमत होते हैं।',
      ],
    },
    {
      heading: '1. वेबसाइट का उपयोग',
      paragraphs: [
        'यह वेबसाइट नौकरी अपडेट से संबंधित सूचनात्मक उद्देश्यों के लिए प्रदान की गई है। उपयोगकर्ताओं को सामग्री का दुरुपयोग नहीं करना चाहिए या अनधिकृत गतिविधियों का प्रयास नहीं करना चाहिए।',
      ],
    },
    {
      heading: '2. सामग्री की सटीकता',
      paragraphs: [
        'हम सटीक और अद्यतित जानकारी प्रदान करने का प्रयास करते हैं, लेकिन हम पूर्णता या सटीकता की गारंटी नहीं देते हैं। उपयोगकर्ताओं को आधिकारिक स्रोतों से विवरण सत्यापित करने की सलाह दी जाती है।',
      ],
    },
    {
      heading: '3. बौद्धिक संपदा',
      paragraphs: [
        'इस वेबसाइट पर सभी सामग्री, डिज़ाइन और सामग्री कॉपीराइट कानूनों द्वारा संरक्षित हैं। अनधिकृत नकल या पुनरुत्पादन निषिद्ध है।',
      ],
    },
    {
      heading: '4. बाहरी लिंक',
      paragraphs: [
        'हमारी वेबसाइट में तृतीय-पक्ष वेबसाइटों के लिंक हो सकते हैं। हम उन साइटों की सामग्री या नीतियों के लिए ज़िम्मेदार नहीं हैं।',
      ],
    },
    {
      heading: '5. देयता की सीमा',
      paragraphs: [
        'हम अपनी वेबसाइट के उपयोग से होने वाले किसी भी नुकसान या क्षति के लिए ज़िम्मेदार नहीं होंगे।',
      ],
    },
    {
      heading: '6. शर्तों में बदलाव',
      paragraphs: [
        'हम बिना किसी पूर्व सूचना के किसी भी समय इन शर्तों को अपडेट कर सकते हैं।',
      ],
    },
    {
      heading: '7. संपर्क',
      paragraphs: [
        'किसी भी प्रश्न के लिए, हमसे संपर्क करें:',
        'ईमेल: Helpdesk@sarkarisewayojan.com',
      ],
    },
  ],
};

const contentByLanguage: Record<LangCode, PolicyContent> = {
  en: englishPolicy,
  hi: hindiPolicy,
};

const TermsAndConditions = () => {
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
      window.open('/', '_blank');
      return;
    }

    window.open(`/?filter=${encodeURIComponent(option)}&source=menu`, '_blank');
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

export default TermsAndConditions;
