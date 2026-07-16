import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  schema?: Record<string, any>;
  url?: string;
  image?: string;
}

export default function SEO({ title, description, keywords, schema, url, image }: SEOProps) {
  const siteName = "Sarkari Sewayojan";
  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  const defaultKeywords = "sarkari sewayojan, sarkari result, sarkari exam, rojgar result, sarkari csc, find jobs, sewayojan, sewayojan up, government jobs, new vacancy, free job alert, sarkari result 2026, sarkari exam 2026, freejobalert, latest government jobs, upsssc, ssc, bank jobs, railway jobs, police jobs, defence jobs, teaching jobs, admit card, result, syllabus, online form, सरकारी रिजल्ट, सरकारी एग्जाम, रोजगार रिजल्ट, सेवायोजन, यूपी सेवायोजन, सरकारी नौकरी, नई वैकेंसी, लेटेस्ट सरकारी जॉब्स";
  
  // Ensure the image URL is fully qualified with the absolute domain for social media crawlers
  const defaultImage = "https://sarkarisewayojan.com/logo_icon.png";
  let finalImage = defaultImage;
  if (image) {
    if (image.startsWith('http')) {
      finalImage = image;
    } else {
      finalImage = `https://sarkarisewayojan.com${image.startsWith('/') ? '' : '/'}${image}`;
    }
  } else if (url) {
    // If no custom image/banner is provided, dynamically generate a retina-quality (deviceScaleFactor=2)
    // screenshot of the specific page using the highly reliable, fast, and cached Microlink screenshot API.
    // Since search engines & social media (WhatsApp, Telegram, Facebook) request this, it's 100% free,
    // has zero performance impact on your normal visitors, and works lifetime automatically.
    const encodedUrl = encodeURIComponent(url);
    finalImage = `https://api.microlink.io/?url=${encodedUrl}&screenshot=true&embed=screenshot.url&screenshot.viewport.width=1200&screenshot.viewport.height=630&screenshot.viewport.deviceScaleFactor=2`;
  }

  return (
    <Helmet>
      {/* Basic HTML Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords ? `${keywords}, ${defaultKeywords}` : defaultKeywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {url && <meta property="og:url" content={url} />}
      <meta property="og:image" content={finalImage} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={finalImage} />

      {/* Canonical URL */}
      {url && <link rel="canonical" href={url} />}

      {/* JSON-LD Schema Markup */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}
