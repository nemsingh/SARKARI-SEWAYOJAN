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
  title: 'Contact Us',
  sections: [
    {
      heading: 'Welcome to Sarkari Sewayojan (www.sarkarisewayojan.com)',
      paragraphs: [
        'We appreciate your interest in our website. If you have any questions, suggestions, or need any assistance related to job updates, admit cards, results, or government schemes, feel free to contact us. Our team is always ready to help you.',
      ],
    },
    {
      heading: '📩 Contact Information',
      paragraphs: [
        'For general inquiries, support, feedback, or any issue related to the website, you can contact us through the following:',
        'Email: Helpdesk@sarkarisewayojan.com',
        'We usually respond within 24–48 hours.',
      ],
    },
    {
      heading: '👤 About Our Content',
      paragraphs: [
        'Sarkari Sewayojan provides information related to government jobs, results, admit cards, and various सरकारी योजनाएं.',
        'All the content published on this website is created after proper research from official websites, notifications, and trusted public sources. Our goal is to provide accurate and easy-to-understand information to our users.',
      ],
    },
    {
      heading: '⚠️ Important Note',
      paragraphs: [
        'We are not affiliated with any government organization.',
        'We only provide information for educational and informational purposes.',
        'Users are advised to always verify details from official sources before taking any action.',
      ],
    },
    {
      heading: '✉️ Report or Suggest Changes',
      paragraphs: [
        'If you find any incorrect information or want to suggest updates or improvements, please contact us via email:',
        'Email: Helpdesk@sarkarisewayojan.com',
        'We value your feedback and will try to improve our content accordingly.',
        'Thank you for visiting Sarkari Sewayojan...',
      ],
    },
  ],
};

const hindiPolicy: PolicyContent = {
  title: 'संपर्क करें',
  sections: [
    {
      heading: 'सरकारी सेवायोजन (www.sarkarisewayojan.com) में आपका स्वागत है',
      paragraphs: [
        'हम हमारी वेबसाइट में आपकी रुचि की सराहना करते हैं। यदि आपके कोई प्रश्न, सुझाव हैं, या नौकरी अपडेट, एडमिट कार्ड, परिणाम या सरकारी योजनाओं से संबंधित किसी सहायता की आवश्यकता है, तो बेझिझक हमसे संपर्क करें। हमारी टीम आपकी मदद करने के लिए हमेशा तैयार है।',
      ],
    },
    {
      heading: '📩 संपर्क जानकारी',
      paragraphs: [
        'सामान्य पूछताछ, समर्थन, प्रतिक्रिया, या वेबसाइट से संबंधित किसी भी समस्या के लिए, आप निम्नलिखित के माध्यम से हमसे संपर्क कर सकते हैं:',
        'ईमेल: Helpdesk@sarkarisewayojan.com',
        'हम आमतौर पर 24-48 घंटों के भीतर जवाब देते हैं।',
      ],
    },
    {
      heading: '👤 हमारी सामग्री के बारे में',
      paragraphs: [
        'सरकारी सेवायोजन सरकारी नौकरियों, परिणामों, एडमिट कार्ड और विभिन्न सरकारी योजनाओं से संबंधित जानकारी प्रदान करता है।',
        'इस वेबसाइट पर प्रकाशित सभी सामग्री आधिकारिक वेबसाइटों, सूचनाओं और विश्वसनीय सार्वजनिक स्रोतों से उचित शोध के बाद बनाई गई है। हमारा लक्ष्य अपने उपयोगकर्ताओं को सटीक और समझने में आसान जानकारी प्रदान करना है।',
      ],
    },
    {
      heading: '⚠️ महत्वपूर्ण नोट',
      paragraphs: [
        'हम किसी भी सरकारी संगठन से संबद्ध नहीं हैं।',
        'हम केवल शैक्षिक और सूचनात्मक उद्देश्यों के लिए जानकारी प्रदान करते हैं।',
        'उपयोगकर्ताओं को सलाह दी जाती है कि वे कोई भी कार्रवाई करने से पहले हमेशा आधिकारिक स्रोतों से विवरण सत्यापित करें।',
      ],
    },
    {
      heading: '✉️ रिपोर्ट करें या परिवर्तन का सुझाव दें',
      paragraphs: [
        'यदि आपको कोई गलत जानकारी मिलती है या आप अपडेट या सुधार का सुझाव देना चाहते हैं, तो कृपया ईमेल के माध्यम से हमसे संपर्क करें:',
        'ईमेल: Helpdesk@sarkarisewayojan.com',
        'हम आपकी प्रतिक्रिया को महत्व देते हैं और तदनुसार हमारी सामग्री को बेहतर बनाने का प्रयास करेंगे।',
        'सरकारी सेवायोजन पर आने के लिए धन्यवाद...',
      ],
    },
  ],
};

const contentByLanguage: Record<LangCode, PolicyContent> = {
  en: englishPolicy,
  hi: hindiPolicy,
};

const ContactUs = () => {
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

export default ContactUs;
