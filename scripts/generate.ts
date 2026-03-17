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

async function generate() {
  console.log('Fetching data from Firebase...');
  const [categories, categoryLinks, tabletItems, posts, settings] = await Promise.all([
    getCategories(),
    getCategoryLinks(),
    getTabletItems(),
    getPosts(),
    getSiteSettingsFlat(),
  ]);

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

  const publicDir = path.resolve(root, 'dist');

  const generatePage = (url: string, data: any, outputPath: string, title: string, description: string) => {
    try {
      const appHtml = render(url, data);
      
      let html = template.replace(`<!--ssr-outlet-->`, appHtml)
                         .replace(`<div id="root"></div>`, `<div id="root">${appHtml}</div>`);
      
      // Inject data
      const scriptTag = `<script>window.__INITIAL_DATA__ = ${JSON.stringify(data)};</script>`;
      html = html.replace('</body>', `${scriptTag}</body>`);

      // Update SEO tags
      html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
      html = html.replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${description}" />`);

      const fullPath = path.resolve(publicDir, outputPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, html);
      console.log(`Generated ${outputPath}`);
    } catch (e) {
      console.error(`Error generating ${url}:`, e);
    }
  };

  // 1. Generate Home Page
  const homeData = {
    categories,
    category_links: categoryLinks,
    tablet_items: tabletItems,
    posts,
    settings_flat: settings,
  };
  generatePage('/', homeData, 'index.html', settings.tagline || 'Sarkari Sewayojan', 'Latest Government Jobs, Results & Notifications');

  // 2. Generate Post Detail Pages
  for (const post of posts) {
    const postData = {
      ...homeData,
      [`post_${post.slug || post.id}`]: post,
    };
    generatePage(`/post/${post.slug || post.id}`, postData, `post/${post.slug || post.id}.html`, `${post.name_of_post} - Sarkari Sewayojan`, post.short_info || '');
    // Also support index.html in folder for clean URLs if needed, but the prompt asked for .html files
  }

  // 3. Generate Category Pages
  for (const cat of categories) {
    const catData = {
      ...homeData,
    };
    generatePage(`/category/${encodeURIComponent(cat.name)}`, catData, `category/${encodeURIComponent(cat.name)}.html`, `${cat.name} - Sarkari Sewayojan`, `All updates for ${cat.name}`);
  }

  // 4. Generate Privacy Policy
  generatePage('/privacy-policy', homeData, 'privacy-policy.html', 'Privacy Policy - Sarkari Sewayojan', 'Privacy Policy');

  console.log('Static site generation complete.');
  process.exit(0);
}

generate().catch((e) => {
  console.error(e);
  process.exit(1);
});
