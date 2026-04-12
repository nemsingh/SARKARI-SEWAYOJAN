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
  const defaultKeywords = "sarkari sewayojan, sarkari result, sarkari exam, sarkari job portal, sarkari naukri, free job alert, latest government jobs, sarkari result 2026, sarkari exam 2026, upsssc, ssc, bank jobs, railway jobs, police jobs, defence jobs, teaching jobs, admit card, result, syllabus, online form";
  
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
      {image && <meta property="og:image" content={image} />}
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}

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
