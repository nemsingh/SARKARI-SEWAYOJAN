import { useState, useEffect, useMemo } from 'react';
import { getCache, setCache } from '@/lib/cache';
import { fetchHomeData } from '@/lib/fetchData';
import SiteHeader from '@/components/website/SiteHeader';
import SiteMenu from '@/components/website/SiteMenu';
import Sidebar from '@/components/website/Sidebar';
import SiteFooter from '@/components/website/SiteFooter';
import SEO from '@/components/SEO';
import { ShieldCheck, Target, Users, Award, CheckCircle2, Globe, Sparkles } from 'lucide-react';

export default function AboutUs() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<{ settings?: any; categories?: any[] }>(() => {
    return getCache('home_data') || {
      settings: {
        logo_url: '/logo_icon.png',
        header_marquee_text: 'Sarkari Sewayojan - India\'s No.1 Official Job Portal',
        marquee_link: '/',
        disclaimer_text: 'SarkariSewayojan.com is an educational news portal providing instant updates.'
      },
      categories: []
    };
  });

  useEffect(() => {
    fetchHomeData().then((res) => {
      if (res && res.settings) {
        setData(res);
        setCache('home_data', res);
      }
    });
  }, []);

  const settings = data.settings || {};

  const aboutSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "name": "About Us - Sarkari Sewayojan",
        "url": "https://sarkarisewayojan.com/about-us",
        "description": "Learn about Sarkari Sewayojan, India's leading portal for Sarkari Result, Sarkari Exam, Sewayojan UP, Admit Cards, and Free Job Alerts."
      },
      {
        "@type": "Organization",
        "name": "Sarkari Sewayojan",
        "url": "https://sarkarisewayojan.com/",
        "logo": "https://sarkarisewayojan.com/logo_icon.png",
        "sameAs": [
          "https://sarkarisewayojan.com/"
        ],
        "description": "Sarkari Sewayojan provides accurate, fast, and verified updates regarding Government recruitment exams, results, admit cards, answer keys, and employment news across India."
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background font-sans overflow-x-hidden">
      <SEO
        title="About Us - Sarkari Sewayojan | Official Sarkari Result & Exam Portal"
        description="About Sarkari Sewayojan (SarkariSewayojan.com) - India's most trusted portal for Sarkari Result, Sewayojan UP, Rojgar Result, Admit Cards, Syllabus, and Latest Government Job updates."
        keywords="about sarkari sewayojan, sarkari result, sarkari exam, sewayojan up, rojgar result, government job updates"
        url="https://sarkarisewayojan.com/about-us"
        schema={aboutSchema}
      />

      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <SiteHeader logoUrl={settings.logo_url} />
      <SiteMenu onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} marqueeText={settings.header_marquee_text} marqueeLink={settings.marquee_link} />

      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-6">
        <div className="bg-card text-card-foreground border rounded-lg shadow-sm p-4 sm:p-8 space-y-8">
          
          {/* Header Banner */}
          <div className="border-b pb-6 text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Official Educational Portal
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-primary tracking-tight">
              About Sarkari Sewayojan
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-3xl mx-auto leading-relaxed">
              Welcome to <span className="font-bold text-foreground">SarkariSewayojan.com</span> — India’s premier job notification portal dedicated to empowering job seekers with fast, verified, and transparent updates for government exams, results, admit cards, and employment news.
            </p>
          </div>

          {/* Mission & Vision Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border rounded-xl p-5 bg-muted/20 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg">Our Mission</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                To bridge the gap between job seekers and government job updates by providing instant, accurate, and 100% verified notification links, syllabus breakdowns, and cut-off analysis in real time.
              </p>
            </div>

            <div className="border rounded-xl p-5 bg-muted/20 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg">100% Verified Information</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Every notification, admit card link, and Sarkari Result hosted on Sarkari Sewayojan is cross-checked directly from official government commission websites (UPSC, SSC, UPSSSC, Railways, NTA, Banking, etc.).
              </p>
            </div>

            <div className="border rounded-xl p-5 bg-muted/20 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg">Student First Approach</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                We design clean, fast-loading, ad-safe, mobile-responsive layouts ensuring students can easily access direct application forms and hall tickets without misleading popups or redirects.
              </p>
            </div>
          </div>

          {/* Detailed Content in English and Hindi */}
          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground border-l-4 border-primary pl-3">
                Who We Are (हमारे बारे में)
              </h2>
              <p>
                <strong>Sarkari Sewayojan</strong> (SarkariSewayojan.com) is an independent educational news and career information platform founded to help millions of Indian youth find reliable career guidance. We track recruitment notices across Central Government departments, State Public Service Commissions (UPPSC, MPPSC, BPSC, UKPSC, etc.), Staff Selection Commission (SSC), Railway Recruitment Board (RRB), Defence, Banking (IBPS, SBI), Teaching (CTET, UPTET), and State Employment Exchanges like Sewayojan UP (Rozgar Sangam Uttar Pradesh).
              </p>
              <p className="hindi-text font-serif">
                सरकारी सेवायोजन (SarkariSewayojan.com) भारत का एक अग्रणी और विश्वसनीय जॉब पोर्टल है। हमारा उद्देश्य देश भर के युवाओं को सरकारी नौकरियों (Sarkari Naukri), सरकारी रिजल्ट (Sarkari Result), प्रवेश पत्र (Admit Card), उत्तर कुंजी (Answer Key), पाठ्यक्रम (Syllabus) और उत्तर प्रदेश सेवायोजन (Sewayojan UP) की सटीक और सबसे तेज जानकारी प्रदान करना है।
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-foreground border-l-4 border-primary pl-3">
                Key Features of Sarkari Sewayojan
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-foreground font-medium text-xs sm:text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Real-time Sarkari Result & Score Card updates</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Direct Official Links for Online Application</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Verified Admit Cards & Exam City Intimation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Sewayojan UP & State Rojgar Mela updates</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Latest Answer Keys & Official Cut-Off Marks</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Complete Syllabus PDF Downloads</li>
              </ul>
            </section>

            <section className="bg-muted/30 p-4 rounded-lg border space-y-2">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> Content Transparency & Disclaimer
              </h2>
              <p className="text-xs">
                Sarkari Sewayojan is a private educational portal operated for informational purposes only. We are not a government body or recruitment agency. All logos, trademarks, and exam names belong to their respective government departments. Official links are provided directly to official government portals for user convenience.
              </p>
            </section>
          </div>

        </div>
      </main>

      <SiteFooter disclaimerText={settings.disclaimer_text} />
    </div>
  );
}
