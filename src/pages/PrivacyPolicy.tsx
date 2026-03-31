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
  title: 'Privacy Policy – Sarkari Sewayojan',
  sections: [
    {
      heading: 'Introduction',
      paragraphs: [
        'Welcome to Sarkari Sewayojan. Protecting the privacy of our visitors is one of our top priorities. This Privacy Policy document explains the types of information that are collected and recorded by Sarkari Sewayojan and how we use it.',
        'Sarkari Sewayojan is an informational website that provides updates related to government jobs, admit cards, results, admissions, answer keys, and other educational notifications. The information provided on this website is for informational purposes only.',
        'By accessing and using our website, you agree to the terms described in this Privacy Policy.',
      ],
    },
    {
      heading: 'Information We Collect',
      paragraphs: [
        'When you visit our website, certain information may be collected automatically to improve user experience and website performance.',
        'The information we may collect includes:',
        'This information helps us understand how visitors interact with our website so that we can improve our content and services.',
        'We do not require visitors to register, sign up, or create an account to access information on our website.',
      ],
      bullets: [
        'Internet Protocol (IP) address',
        'Browser type and browser version',
        'Device type and operating system',
        'Internet Service Provider (ISP)',
        'Date and time of visit',
        'Pages visited on our website',
        'Referring or exit pages',
        'Approximate geographic location',
      ],
    },
    {
      heading: 'Log Files',
      paragraphs: [
        'Sarkari Sewayojan follows a standard procedure of using log files. These files log visitors when they visit websites.',
        'The information collected by log files may include:',
        'This information is used for analyzing trends, administering the website, tracking user movement on the website, and gathering demographic information.',
      ],
      bullets: [
        'IP addresses',
        'Browser type',
        'Internet Service Provider (ISP)',
        'Date and time stamp',
        'Referring/exit pages',
        'Number of clicks',
      ],
    },
    {
      heading: 'Cookies and Web Beacons',
      paragraphs: [
        'Like many other websites, Sarkari Sewayojan uses cookies to store information about visitors preferences and the pages they accessed on the website.',
        'Cookies help us:',
        'Users can choose to disable cookies through their browser settings if they prefer.',
      ],
      bullets: [
        'Understand user behavior',
        'Improve website functionality',
        'Provide a better browsing experience',
        'Display relevant advertisements',
      ],
    },
    {
      heading: 'Google AdSense and Third-Party Advertising',
      paragraphs: [
        'Our website may use Google AdSense or other third-party advertising networks to display advertisements.',
        'These third-party vendors may use technologies such as:',
        'to collect information about your visits to this and other websites in order to provide advertisements about goods and services that may interest you.',
        'Google, as a third-party vendor, uses DART cookies to serve ads to visitors based on their visit to our website and other websites on the internet.',
        'Users may opt out of personalized advertising by visiting:',
        'https://adssettings.google.com',
        'For more information about how Google uses data from sites that use its services, please visit:',
        'https://policies.google.com/technologies/ads',
        'Please note that Sarkari Sewayojan has no access to or control over cookies used by third-party advertisers.',
      ],
      bullets: ['Cookies', 'Web Beacons', 'JavaScript'],
    },
    {
      heading: 'Third-Party Privacy Policies',
      paragraphs: [
        "Sarkari Sewayojan's Privacy Policy does not apply to other advertisers or websites.",
        'Our website may contain links to external websites such as official government portals or other informational resources. Once you leave our website, we are not responsible for the privacy practices or policies of those external websites.',
        'We recommend that users review the privacy policies of those third-party websites separately.',
      ],
    },
    {
      heading: 'Purpose of Data Collection',
      paragraphs: ['The information we collect may be used for the following purposes:'],
      bullets: [
        'To operate and maintain our website',
        'To improve website performance and functionality',
        'To understand visitor behavior and traffic patterns',
        'To personalize user experience',
        'To display relevant advertisements',
        'To prevent fraudulent or malicious activities',
      ],
    },
    {
      heading: "Children's Information",
      paragraphs: [
        'Protecting children while using the internet is important to us.',
        'Sarkari Sewayojan does not knowingly collect any personal identifiable information from children under the age of 13.',
        'If you believe that your child has provided personal information on our website, please contact us immediately and we will take necessary steps to remove such information from our records.',
      ],
    },
    {
      heading: 'Data Security',
      paragraphs: [
        'We take appropriate technical and organizational measures to protect information collected through our website.',
        'These measures may include:',
        'However, no method of transmission over the internet or electronic storage is completely secure. Therefore, we cannot guarantee absolute security of data.',
      ],
      bullets: [
        'Secure hosting infrastructure',
        'Firewall protection',
        'Regular monitoring and maintenance',
        'Limited access to data',
      ],
    },
    {
      heading: 'Online Privacy Policy Only',
      paragraphs: [
        'This Privacy Policy applies only to our online activities and is valid for visitors to our website regarding the information they share and/or that is collected on Sarkari Sewayojan.',
        'This policy does not apply to information collected offline or through channels other than this website.',
      ],
    },
    {
      heading: 'Changes to This Privacy Policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time in order to reflect changes in our practices, services, or legal requirements.',
        'Any changes will be posted on this page. Users are advised to review this page periodically to stay informed about our privacy practices.',
      ],
    },
    {
      heading: 'Consent',
      paragraphs: [
        'By using our website Sarkari Sewayojan, you hereby consent to our Privacy Policy and agree to its terms.',
      ],
    },
    {
      heading: 'Contact Information',
      paragraphs: [
        'If you have any questions or concerns about this Privacy Policy or our website practices, you may contact us at:',
        'Website: Sarkari Sewayojan',
        'Email: Helpdesk@sarkarisewayojan.com',
      ],
    },
  ],
};

const hindiPolicy: PolicyContent = {
  title: 'गोपनीयता नीति – सरकारी सेवायोजन',
  sections: [
    {
      heading: 'परिचय',
      paragraphs: [
        'सरकारी सेवायोजन में आपका स्वागत है। हमारे आगंतुकों की गोपनीयता की सुरक्षा हमारी सर्वोच्च प्राथमिकताओं में से एक है। यह गोपनीयता नीति बताती है कि सरकारी सेवायोजन द्वारा कौन-कौन सी जानकारी एकत्र और रिकॉर्ड की जाती है तथा उसका उपयोग कैसे किया जाता है।',
        'सरकारी सेवायोजन एक सूचनात्मक वेबसाइट है जो सरकारी नौकरियों, एडमिट कार्ड, रिजल्ट, एडमिशन, आंसर-की और अन्य शैक्षिक अपडेट प्रदान करती है। इस वेबसाइट पर दी गई जानकारी केवल सूचना उद्देश्य के लिए है।',
        'हमारी वेबसाइट का उपयोग करके आप इस गोपनीयता नीति में दिए गए नियमों और शर्तों से सहमत होते हैं।',
      ],
    },
    {
      heading: 'हम कौन सी जानकारी एकत्र करते हैं',
      paragraphs: [
        'जब आप हमारी वेबसाइट पर आते हैं, तो बेहतर उपयोगकर्ता अनुभव और वेबसाइट प्रदर्शन के लिए कुछ जानकारी स्वतः एकत्र की जा सकती है।',
        'हम निम्न जानकारी एकत्र कर सकते हैं:',
        'यह जानकारी हमें यह समझने में मदद करती है कि उपयोगकर्ता वेबसाइट के साथ कैसे इंटरैक्ट करते हैं, ताकि हम अपनी सामग्री और सेवाओं को बेहतर बना सकें।',
        'हम वेबसाइट पर जानकारी देखने के लिए विज़िटर से रजिस्ट्रेशन, साइन-अप या अकाउंट बनाना अनिवार्य नहीं करते हैं।',
      ],
      bullets: [
        'इंटरनेट प्रोटोकॉल (IP) एड्रेस',
        'ब्राउज़र का प्रकार और संस्करण',
        'डिवाइस का प्रकार और ऑपरेटिंग सिस्टम',
        'इंटरनेट सेवा प्रदाता (ISP)',
        'विज़िट की तारीख और समय',
        'वे पेज जिन्हें आपने हमारी वेबसाइट पर देखा',
        'रेफ़रिंग या एग्ज़िट पेज',
        'लगभग भौगोलिक स्थान',
      ],
    },
    {
      heading: 'लॉग फाइल्स',
      paragraphs: [
        'सरकारी सेवायोजन लॉग फाइल्स के उपयोग की मानक प्रक्रिया का पालन करता है। ये फाइल्स विज़िट के समय उपयोगकर्ता गतिविधि रिकॉर्ड करती हैं।',
        'लॉग फाइल्स में एकत्र जानकारी में शामिल हो सकता है:',
        'इस जानकारी का उपयोग ट्रेंड विश्लेषण, वेबसाइट प्रशासन, वेबसाइट पर यूज़र मूवमेंट ट्रैक करने और जनसांख्यिकीय जानकारी एकत्र करने के लिए किया जाता है।',
      ],
      bullets: [
        'IP एड्रेस',
        'ब्राउज़र प्रकार',
        'इंटरनेट सेवा प्रदाता (ISP)',
        'तारीख और समय स्टैम्प',
        'रेफ़रिंग/एग्ज़िट पेज',
        'क्लिक की संख्या',
      ],
    },
    {
      heading: 'कुकीज़ और वेब बीकन',
      paragraphs: [
        'अन्य वेबसाइटों की तरह, सरकारी सेवायोजन भी विज़िटर की प्राथमिकताओं और एक्सेस किए गए पेजों की जानकारी स्टोर करने के लिए कुकीज़ का उपयोग करता है।',
        'कुकीज़ हमारी मदद करती हैं:',
        'यदि उपयोगकर्ता चाहें तो अपने ब्राउज़र सेटिंग्स से कुकीज़ बंद कर सकते हैं।',
      ],
      bullets: [
        'उपयोगकर्ता व्यवहार समझने में',
        'वेबसाइट कार्यक्षमता बेहतर करने में',
        'बेहतर ब्राउज़िंग अनुभव देने में',
        'प्रासंगिक विज्ञापन दिखाने में',
      ],
    },
    {
      heading: 'Google AdSense और तृतीय-पक्ष विज्ञापन',
      paragraphs: [
        'हमारी वेबसाइट पर Google AdSense या अन्य तृतीय-पक्ष विज्ञापन नेटवर्क के विज्ञापन प्रदर्शित हो सकते हैं।',
        'ये तृतीय-पक्ष विक्रेता निम्न तकनीकों का उपयोग कर सकते हैं:',
        'ताकि आपके विज़िट व्यवहार के आधार पर रुचिकर विज्ञापन दिखाए जा सकें।',
        'Google एक तृतीय-पक्ष विक्रेता के रूप में DART कुकीज़ का उपयोग करता है, जिससे आपकी इस और अन्य वेबसाइटों की विज़िट के आधार पर विज्ञापन दिखाए जाते हैं।',
        'उपयोगकर्ता पर्सनलाइज़्ड विज्ञापन से बाहर निकलने के लिए यहाँ जाएँ:',
        'https://adssettings.google.com',
        'Google अपने विज्ञापन/सेवाओं में डेटा का उपयोग कैसे करता है, इसकी जानकारी यहाँ उपलब्ध है:',
        'https://policies.google.com/technologies/ads',
        'कृपया ध्यान दें कि तृतीय-पक्ष विज्ञापनदाताओं द्वारा उपयोग की जाने वाली कुकीज़ पर सरकारी सेवायोजन का कोई नियंत्रण नहीं है।',
      ],
      bullets: ['Cookies', 'Web Beacons', 'JavaScript'],
    },
    {
      heading: 'तृतीय-पक्ष गोपनीयता नीतियाँ',
      paragraphs: [
        'सरकारी सेवायोजन की गोपनीयता नीति अन्य विज्ञापनदाताओं या वेबसाइटों पर लागू नहीं होती।',
        'हमारी वेबसाइट में बाहरी वेबसाइटों (जैसे सरकारी पोर्टल या अन्य जानकारी स्रोत) के लिंक हो सकते हैं। वेबसाइट छोड़ने के बाद उन बाहरी साइटों की गोपनीयता प्रथाओं/नीतियों के लिए हम जिम्मेदार नहीं हैं।',
        'हम सुझाव देते हैं कि उपयोगकर्ता उन तृतीय-पक्ष वेबसाइटों की गोपनीयता नीतियाँ अलग से पढ़ें।',
      ],
    },
    {
      heading: 'डेटा संग्रह का उद्देश्य',
      paragraphs: ['हम जो जानकारी एकत्र करते हैं, उसका उपयोग निम्न उद्देश्यों के लिए किया जा सकता है:'],
      bullets: [
        'वेबसाइट संचालित और बनाए रखने के लिए',
        'वेबसाइट प्रदर्शन और कार्यक्षमता सुधारने के लिए',
        'यूज़र व्यवहार और ट्रैफ़िक पैटर्न समझने के लिए',
        'उपयोगकर्ता अनुभव को बेहतर/व्यक्तिगत करने के लिए',
        'प्रासंगिक विज्ञापन दिखाने के लिए',
        'धोखाधड़ी या दुरुपयोग रोकने के लिए',
      ],
    },
    {
      heading: 'बच्चों की जानकारी',
      paragraphs: [
        'इंटरनेट उपयोग के दौरान बच्चों की सुरक्षा हमारे लिए महत्वपूर्ण है।',
        'सरकारी सेवायोजन 13 वर्ष से कम आयु के बच्चों से जानबूझकर कोई व्यक्तिगत पहचान योग्य जानकारी एकत्र नहीं करता है।',
        'यदि आपको लगता है कि आपके बच्चे ने हमारी वेबसाइट पर व्यक्तिगत जानकारी साझा की है, तो तुरंत हमसे संपर्क करें। हम आवश्यक कदम उठाकर ऐसी जानकारी हटाएंगे।',
      ],
    },
    {
      heading: 'डेटा सुरक्षा',
      paragraphs: [
        'हम वेबसाइट के माध्यम से एकत्र की गई जानकारी की सुरक्षा के लिए उपयुक्त तकनीकी और संगठनात्मक उपाय अपनाते हैं।',
        'इनमें शामिल हो सकते हैं:',
        'फिर भी इंटरनेट या इलेक्ट्रॉनिक स्टोरेज पर डेटा ट्रांसमिशन का कोई तरीका पूरी तरह सुरक्षित नहीं है। इसलिए हम पूर्ण सुरक्षा की गारंटी नहीं दे सकते।',
      ],
      bullets: [
        'सुरक्षित होस्टिंग इंफ्रास्ट्रक्चर',
        'फ़ायरवॉल सुरक्षा',
        'नियमित मॉनिटरिंग और मेंटेनेंस',
        'डेटा तक सीमित पहुंच',
      ],
    },
    {
      heading: 'केवल ऑनलाइन गोपनीयता नीति',
      paragraphs: [
        'यह गोपनीयता नीति केवल हमारी ऑनलाइन गतिविधियों पर लागू होती है और वेबसाइट विज़िटर्स द्वारा साझा/एकत्र की गई जानकारी के लिए मान्य है।',
        'यह नीति ऑफलाइन माध्यमों या इस वेबसाइट के अलावा अन्य चैनलों से एकत्र जानकारी पर लागू नहीं होती।',
      ],
    },
    {
      heading: 'इस गोपनीयता नीति में बदलाव',
      paragraphs: [
        'हम समय-समय पर अपनी सेवाओं, प्रक्रियाओं या कानूनी आवश्यकताओं के अनुसार इस गोपनीयता नीति को अपडेट कर सकते हैं।',
        'किसी भी परिवर्तन को इसी पेज पर प्रकाशित किया जाएगा। उपयोगकर्ताओं को सलाह दी जाती है कि वे समय-समय पर इस पेज की समीक्षा करते रहें।',
      ],
    },
    {
      heading: 'सहमति',
      paragraphs: [
        'हमारी वेबसाइट सरकारी सेवायोजन का उपयोग करके आप इस गोपनीयता नीति से सहमत होते हैं और इसकी शर्तों को स्वीकार करते हैं।',
      ],
    },
    {
      heading: 'संपर्क जानकारी',
      paragraphs: [
        'यदि आपको इस गोपनीयता नीति या हमारी वेबसाइट की प्रक्रियाओं के बारे में कोई प्रश्न है, तो आप हमसे संपर्क कर सकते हैं:',
        'Website: Sarkari Sewayojan',
        'Email: Helpdesk@sarkarisewayojan.com',
      ],
    },
  ],
};

const contentByLanguage: Record<LangCode, PolicyContent> = {
  en: englishPolicy,
  hi: hindiPolicy,
};

const PrivacyPolicy = () => {
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
  const isRtl = false;

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
              <p className="text-muted-foreground text-sm md:text-base mt-2 font-medium">
                {lang === 'hi' ? 'अंतिम अपडेट: मार्च 2026' : 'Last Updated: March 2026'}
              </p>
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

export default PrivacyPolicy;
