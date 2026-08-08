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
  let finalImage = defaultImage;
  if (image) {
    if (image.startsWith('http')) {
      finalImage = image;
    } else {
      finalImage = `https://sarkarisewayojan.com${image.startsWith('/') ? '' : '/'}${image}`;
    }
  } else if (url) {
    // Dynamically generate a high-speed, retina HD (1200x630, 2x scale) screenshot of the page using Microlink API.
    // Removed prerender=true and delay to ensure <1.5s response time for WhatsApp & Facebook crawlers.
    const encodedUrl = encodeURIComponent(url);
    finalImage = `https://api.microlink.io/?url=${encodedUrl}&screenshot=true&embed=screenshot.url&screenshot.viewport.width=1200&screenshot.viewport.height=630&screenshot.viewport.deviceScaleFactor=2`;
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
      <meta property="og:image" content={finalImage} />
      <meta property="og:image:secure_url" content={finalImage} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
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
