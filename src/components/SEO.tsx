import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  schema?: Record<string, any>;
  url?: string;
  image?: string;
  waitForSelector?: string;
}

export default function SEO({ title, description, keywords, schema, url, image, waitForSelector }: SEOProps) {
  const siteName = "Sarkari Sewayojan";
  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  const defaultKeywords = "sarkari sewayojan, sarkari result, sarkari exam, rojgar result, sarkari csc, find jobs, sewayojan, sewayojan up, government jobs, new vacancy, free job alert, sarkari result 2026, sarkari exam 2026, freejobalert, latest government jobs, upsssc, ssc, bank jobs, railway jobs, police jobs, defence jobs, teaching jobs, admit card, result, syllabus, online form, सरकारी रिजल्ट, सरकारी एग्जाम, रोजगार रिजल्ट, सेवायोजन, यूपी सेवायोजन, सरकारी नौकरी, नई वैकेंसी, लेटेस्ट सरकारी जॉब्स";
  
  // Ensure the image URL is fully qualified with the absolute domain for social media crawlers
  const defaultImage = "https://sarkarisewayojan.com/logo_icon.png";
  let primaryImage = defaultImage;
  let screenshotImage = "";

  if (image) {
    if (image.startsWith('http')) {
      primaryImage = image;
    } else {
      primaryImage = `https://sarkarisewayojan.com${image.startsWith('/') ? '' : '/'}${image}`;
    }
  } else if (url) {
    // Dynamically generate a high-speed, direct PNG screenshot (1200x630) of the exact page using Thum.io CDN engine
    const targetUrl = url.startsWith('http') ? url : `https://sarkarisewayojan.com${url.startsWith('/') ? '' : '/'}${url}`;
    screenshotImage = `https://image.thum.io/get/width/1200/crop/630/noanimate/${targetUrl}`;
    primaryImage = screenshotImage;
  }

  return (
    <Helmet>
      {/* Basic HTML Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords ? `${keywords}, ${defaultKeywords}` : defaultKeywords} />
      <meta name="application-name" content={siteName} />
      <meta name="apple-mobile-web-app-title" content={siteName} />

      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {url && <meta property="og:url" content={url} />}
      <meta property="og:image" content={primaryImage} />
      <meta property="og:image:secure_url" content={primaryImage} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      
      {/* Fallback image tag for social media crawlers if primary image has delay */}
      {primaryImage !== defaultImage && (
        <meta property="og:image" content={defaultImage} />
      )}

      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={primaryImage} />

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
