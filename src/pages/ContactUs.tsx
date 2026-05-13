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
      heading: 'Welcome to Sarkari Sewayojan',
      paragraphs: [
        'If you need any assistance regarding recruitment notifications, admit cards, results, government schemes, application procedures, or any information related to the website, you may contact us anytime. Our team is committed to providing accurate and reliable information to users.',
      ],
    },
    {
      heading: 'Contact Information',
      paragraphs: [
        '<strong>Website:</strong><br/>Sarkari Sewayojan',
        '<strong>Email Support:</strong><br/>Helpdesk@sarkarisewayojan.com',
      ],
    },
    {
      heading: 'About Us',
      paragraphs: [
        'Sarkari Sewayojan is an independent information portal dedicated to providing updates related to government jobs, admit cards, results, answer keys, admissions, government schemes, and other important notifications in a simple and user-friendly manner.',
        'Our objective is to deliver fast, accurate, and trustworthy information so that users can access important government-related updates and services from a single platform.',
      ],
    },
    {
      heading: 'Founder & Content Administration',
      paragraphs: [
        '<strong>Vikas Kumar Suryavanshi</strong><br/>Founder & Content Administrator – Sarkari Sewayojan',
        'He is actively involved in content management and publishing related to education, government recruitment updates, and digital information services. The quality, clarity, and usefulness of the content published on the website are maintained under his supervision.',
      ],
    },
    {
      heading: 'Content Transparency',
      paragraphs: [
        'The information available on Sarkari Sewayojan is prepared using various official sources, government websites, public notices, employment news, and press releases.',
        'We make every possible effort to provide users with accurate and updated information. However, candidates are advised to verify details from the official website of the respective department before making any application or decision.',
        'If you find any error, outdated information, or require any correction regarding the content published on the website, please inform us through email.',
      ],
    },
    {
      heading: 'Fact Checking Policy',
      paragraphs: [
        'At Sarkari Sewayojan, we follow a proper verification and editorial review process to ensure the accuracy and reliability of the information published on our platform. Users can read our complete Fact Checking Policy to understand how content is reviewed, verified, corrected, and updated before publication.',
        '<a href="/fact-checking-policy" class="text-blue-600 hover:text-blue-800 underline font-bold" target="_blank" rel="noopener noreferrer">Read Full Fact Checking Policy</a>',
      ],
    },
    {
      heading: 'Official Helpdesk',
      paragraphs: [
        'Helpdesk@sarkarisewayojan.com',
      ],
    },
  ],
};

const hindiPolicy: PolicyContent = {
  title: 'संपर्क करें',
  sections: [
    {
      heading: 'Welcome to Sarkari Sewayojan',
      paragraphs: [
        'यदि आपको किसी भर्ती, रिजल्ट, एडमिट कार्ड, सरकारी योजना, आवेदन प्रक्रिया या वेबसाइट से संबंधित किसी भी प्रकार की सहायता चाहिए, तो आप हमसे संपर्क कर सकते हैं। हमारी टीम उपयोगकर्ताओं को सही एवं विश्वसनीय जानकारी उपलब्ध कराने के लिए प्रतिबद्ध है।',
      ],
    },
    {
      heading: 'Contact Information',
      paragraphs: [
        '<strong>Website:</strong><br/>Sarkari Sewayojan',
        '<strong>Email Support:</strong><br/>Helpdesk@sarkarisewayojan.com',
      ],
    },
    {
      heading: 'About Us',
      paragraphs: [
        'Sarkari Sewayojan एक स्वतंत्र सूचना पोर्टल है, जिसका उद्देश्य सरकारी नौकरियों, एडमिट कार्ड, रिजल्ट, उत्तर कुंजी, प्रवेश पत्र, सरकारी योजनाओं तथा अन्य महत्वपूर्ण अपडेट को सरल और स्पष्ट रूप में उपलब्ध कराना है।',
        'हमारा प्रयास है कि उपयोगकर्ताओं तक तेज, सटीक एवं भरोसेमंद जानकारी पहुंचाई जाए, ताकि उन्हें विभिन्न सरकारी सेवाओं एवं अवसरों से जुड़ी जानकारी एक ही स्थान पर प्राप्त हो सके।',
      ],
    },
    {
      heading: 'Founder & Content Administration',
      paragraphs: [
        '<strong>Vikas Kumar</strong><br/>Founder & Content Administrator – Sarkari Sewayojan',
        'वे शिक्षा, सरकारी भर्ती अपडेट एवं डिजिटल सूचना सेवाओं से संबंधित कंटेंट मैनेजमेंट एवं पब्लिशिंग कार्यों में सक्रिय रूप से जुड़े हुए हैं। वेबसाइट पर प्रकाशित सामग्री की गुणवत्ता, स्पष्टता एवं उपयोगिता सुनिश्चित करने का कार्य उनके निर्देशन में किया जाता है।',
      ],
    },
    {
      heading: 'Content Transparency',
      paragraphs: [
        'Sarkari Sewayojan पर उपलब्ध जानकारी विभिन्न आधिकारिक स्रोतों, सरकारी वेबसाइटों, सार्वजनिक नोटिस, रोजगार समाचार एवं प्रेस विज्ञप्तियों के आधार पर तैयार की जाती है।',
        'हम उपयोगकर्ताओं तक यथासंभव सटीक एवं अद्यतन जानकारी पहुंचाने का प्रयास करते हैं। हालांकि, अभ्यर्थियों को किसी भी आवेदन या निर्णय से पहले संबंधित विभाग की आधिकारिक वेबसाइट पर उपलब्ध सूचना अवश्य सत्यापित करनी चाहिए।',
        'यदि आपको वेबसाइट पर प्रकाशित किसी जानकारी में त्रुटि, संशोधन या अपडेट की आवश्यकता प्रतीत होती है, तो कृपया हमें ईमेल के माध्यम से सूचित करें।',
      ],
    },
    {
      heading: 'Fact Checking Policy',
      paragraphs: [
        'Sarkari Sewayojan पर प्रकाशित जानकारी की सटीकता और विश्वसनीयता सुनिश्चित करने के लिए हमारी टीम एक उचित सत्यापन एवं संपादकीय समीक्षा प्रक्रिया का पालन करती है। उपयोगकर्ता यह जानने के लिए हमारी पूरी Fact Checking Policy पढ़ सकते हैं कि वेबसाइट पर प्रकाशित सामग्री को किस प्रकार जांचा, सत्यापित, संशोधित और अपडेट किया जाता है।',
        '<a href="/fact-checking-policy" class="text-blue-600 hover:text-blue-800 underline font-bold" target="_blank" rel="noopener noreferrer">पूरी Fact Checking Policy पढ़ें</a>',
      ],
    },
    {
      heading: 'Official Helpdesk',
      paragraphs: [
        'Helpdesk@sarkarisewayojan.com',
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

    if (option === 'Contact Us') {
      window.open('/contact-us', '_blank');
      return;
    }

    window.open(`/category/${encodeURIComponent(option)}`, '_blank');
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
                  <p key={`${section.heading}-${index}`} className="text-foreground text-[16px] sm:text-[17px] md:text-[19px] leading-7 sm:leading-8 md:leading-9 mb-3 last:mb-0" dangerouslySetInnerHTML={{ __html: paragraph }} />
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
