import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Mock localStorage for Node.js
(global as any).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

import { getCategories, getCategoryLinks, getTabletItems, getPosts, getSiteSettingsFlat } from '../src/lib/firebaseService';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 3000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (i === retries - 1) throw e;
      console.warn(`[Firebase Fetch] Attempt ${i + 1} failed, retrying in ${delayMs}ms. Error: ${e.message || String(e)}`);
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
  throw new Error("Unreachable");
}

async function generate() {
  console.log('Fetching data from Firebase...');
  const [categories, initialCategoryLinks, tabletItems, posts, settings] = await Promise.all([
    withRetry(() => getCategories()),
    withRetry(() => getCategoryLinks()),
    withRetry(() => getTabletItems()),
    withRetry(() => getPosts()),
    withRetry(() => getSiteSettingsFlat()),
  ]);

  // Fix or remove broken category links
  const postSlugs = posts.map(p => p.slug);
  const postIds = posts.map(p => p.id);
  const categoryLinks = initialCategoryLinks.map(l => {
    if (l.url && l.url.startsWith('/post/')) {
      const slug = l.url.replace('/post/', '');
      if (!postSlugs.includes(slug) && !postIds.includes(slug)) {
        const match = posts.find(p => p.slug && p.slug.startsWith(slug));
        if (match) {
          return { ...l, url: `/post/${match.slug}` };
        }
        // Mark as broken if no match found
        return { ...l, _broken: true };
      }
    }
    return l;
  }).filter(l => !l._broken);

  const validTabletItems = tabletItems.map(t => {
    if (t.url && t.url.startsWith('/post/')) {
      const slug = t.url.replace('/post/', '');
      if (!postSlugs.includes(slug) && !postIds.includes(slug)) {
        const match = posts.find(p => p.slug && p.slug.startsWith(slug));
        if (match) {
          return { ...t, url: `/post/${match.slug}` };
        }
        return { ...t, _broken: true };
      }
    }
    return t;
  }).filter(t => !t._broken);

  console.log('Data fetched successfully.');

  const templatePath = path.resolve(root, 'dist/index.html');
  if (!fs.existsSync(templatePath)) {
    console.error('dist/index.html not found. Please run "npm run build" first.');
    process.exit(1);
  }
  const template = fs.readFileSync(templatePath, 'utf-8');

  // Load the SSR bundle
  const serverEntryPath = path.resolve(root, 'dist/server/entry-server.js');
  if (!fs.existsSync(serverEntryPath)) {
    console.error('dist/server/entry-server.js not found. Please run "npm run build:ssr" first.');
    process.exit(1);
  }
  const { render } = await import(serverEntryPath);

  const outDir = path.resolve(root, 'dist');
  
  const generatePage = (url: string, data: any, outputPath: string, title: string, description: string) => {
    try {
      const { html: appHtml, helmet } = render(url, data);
      
      let html = template.replace(`<!--ssr-outlet-->`, appHtml)
                         .replace(`<div id="root"></div>`, `<div id="root">${appHtml}</div>`);
      
      // Inject data
      const scriptTag = `<script>window.__INITIAL_DATA__ = ${JSON.stringify(data).replace(/</g, '\\u003c')};</script>`;
      html = html.replace('</body>', `${scriptTag}</body>`);

      // Update SEO tags using Helmet if available
      if (helmet) {
        const helmetTags = `
          ${helmet.title.toString()}
          ${helmet.meta.toString()}
          ${helmet.link.toString()}
          ${helmet.script.toString()}
        `;
        // Remove default title and description
        html = html.replace(/<title>.*?<\/title>/, '');
        html = html.replace(/<meta name="description" content=".*?"\s*\/?>/, '');
        // Inject helmet tags before </head>
        html = html.replace('</head>', `${helmetTags}\n</head>`);
      } else {
        html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
        html = html.replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${description}" />`);
      }

      const fullPath = path.resolve(outDir, outputPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, html);
      console.log(`Generated ${outputPath}`);
    } catch (e) {
      console.error(`Error generating ${url}:`, e);
    }
  };

  // Strip huge HTML from posts for homeData to prevent OOM and huge HTML files
  const lightweightPosts = posts.map(p => {
    const { tables_html, tables_html_hi, media_urls, ...rest } = p;
    return rest;
  });

  // 1. Generate Home Page
  const homeData = {
    categories,
    category_links: categoryLinks,
    tablet_items: validTabletItems,
    posts: lightweightPosts,
    settings_flat: settings,
  };
  generatePage('/', homeData, 'index.html', settings.tagline || 'Sarkari Sewayojan', 'Latest Government Jobs, Results & Notifications');

  // 2. Generate Post Detail Pages
  const dataDir = path.resolve(outDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  for (const post of posts) {
    const postData = {
      ...homeData,
      [`post_${post.slug || post.id}`]: post,
    };
    const cleanDesc = (post.short_info || '').replace(/\*\*(.*?)\*\*/gs, '$1').replace(/<[^>]*>?/gm, '').substring(0, 160);
    generatePage(`/post/${post.slug || post.id}`, postData, `post/${post.slug || post.id}/index.html`, `${post.name_of_post} - Sarkari Sewayojan`, cleanDesc || post.name_of_post);
    
    // Generate individual JSON file for client-side navigation
    fs.writeFileSync(path.resolve(dataDir, `post_${post.slug || post.id}.json`), JSON.stringify(post));
  }

  // 3. Generate Category Pages
  for (const cat of categories) {
    const catData = {
      ...homeData,
    };
    // Use the raw category name for the file path, but encode it for the URL
    const catPath = `category/${cat.name}/index.html`;
    generatePage(`/category/${encodeURIComponent(cat.name)}`, catData, catPath, `${cat.name} - Sarkari Sewayojan`, `All updates for ${cat.name}`);
  }

  // 4. Generate Static Policy Pages
  generatePage('/privacy-policy', homeData, 'privacy-policy/index.html', 'Privacy Policy - Sarkari Sewayojan', 'Privacy Policy');
  generatePage('/dmca-policy', homeData, 'dmca-policy/index.html', 'DMCA Policy - Sarkari Sewayojan', 'DMCA Policy');
  generatePage('/terms-and-conditions', homeData, 'terms-and-conditions/index.html', 'Terms and Conditions - Sarkari Sewayojan', 'Terms and Conditions');
  generatePage('/contact-us', homeData, 'contact-us/index.html', 'Contact Us - Sarkari Sewayojan', 'Contact Us');

  // 5. Generate Admin Shell
  const adminHtml = template.replace(`<!--ssr-outlet-->`, '')
                            .replace(`<div id="root"></div>`, `<div id="root"></div>`);
  fs.writeFileSync(path.resolve(outDir, 'admin.html'), adminHtml);
  console.log(`Generated admin.html shell`);

  // 5.5 Generate 404 Page
  generatePage('/404', homeData, '404.html', '404 - Page Not Found', 'The page you are looking for does not exist.');

  // 6. Generate data.json
  fs.writeFileSync(path.resolve(outDir, 'data.json'), JSON.stringify(homeData));
  console.log(`Generated data.json`);

  // 7. Generate Sitemap
  const baseUrl = 'https://sarkarisewayojan.com';
  let sitemapUrls = `
    <url>
      <loc>${baseUrl}/</loc>
      <changefreq>hourly</changefreq>
      <priority>1.0</priority>
    </url>
  `;

  for (const post of posts) {
    let lastmod = new Date().toISOString();
    try {
      if (post.post_date) {
        const parsedDate = new Date(post.post_date);
        if (!isNaN(parsedDate.getTime())) {
          lastmod = parsedDate.toISOString();
        }
      }
    } catch (e) {
      // fallback to current date
    }

    sitemapUrls += `
      <url>
        <loc>${baseUrl}/post/${post.slug || post.id}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
      </url>
    `;
  }

  for (const cat of categories) {
    sitemapUrls += `
      <url>
        <loc>${baseUrl}/category/${encodeURIComponent(cat.name)}</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
      </url>
    `;
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemapUrls}
</urlset>`;

  fs.writeFileSync(path.resolve(outDir, 'sitemap.xml'), sitemapXml);
  console.log(`Generated sitemap.xml`);

  // 8. Generate robots.txt
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${baseUrl}/sitemap.xml
`;
  fs.writeFileSync(path.resolve(outDir, 'robots.txt'), robotsTxt);
  console.log(`Generated robots.txt`);

  console.log('Static site generation complete.');
  process.exit(0);
}

generate().catch((e) => {
  console.error(e);
  process.exit(1);
});
