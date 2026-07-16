import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jsdom from 'jsdom';

// Mock localStorage for Node.js
(global as any).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const { JSDOM } = jsdom;
(global as any).DOMParser = class {
  parseFromString(html: string, type: string) {
    const dom = new JSDOM(html);
    return dom.window.document as any;
  }
} as any;

const cleanText = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/[\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractDateText = (text: string): string | null => {
  if (!text) return null;
  const cleaned = cleanText(text);
  // eslint-disable-next-line no-misleading-character-class
  const finalVal = cleaned.replace(/^[:\-–—\s\u200b•|ः।●]+/, '').replace(/[:\-–—\s|ः।●]+$/, '').trim();
  if (!finalVal) return null;

  const hasDate = /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/i.test(finalVal) || 
                  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|जनवरी|फ़रवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|अक्तूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर)/i.test(finalVal);
  
  if (hasDate) {
    if (finalVal.length < 55) return finalVal;
  }
  
  const matchNumeric = finalVal.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/i);
  if (matchNumeric) return matchNumeric[0];

  const matchAlpha = finalVal.match(/\b\d{1,2}(?:st|nd|rd|th)?[\s./-]*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|जनवरी|फ़रवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|अक्तूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर)[a-z]*[\s./-]*\d{2,4}\b/i);
  if (matchAlpha) return matchAlpha[0];

  const matchAlphaRev = finalVal.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|जनवरी|फ़रवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|अक्तूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर)[a-z]*[\s./-]*\d{1,2}(?:st|nd|rd|th)?[\s./-]*\d{2,4}\b/i);
  if (matchAlphaRev) return matchAlphaRev[0];

  if (finalVal.length < 25 && /\d/.test(finalVal)) {
    return finalVal;
  }

  return null;
};

const parseCleanDate = (cleanStr: string | null | undefined): Date | null => {
  if (!cleanStr) return null;
  
  let s = cleanStr.toLowerCase().trim();
  s = s.replace(/\|/g, ' ');
  
  const hindiToEnglishMonths: Record<string, string> = {
    'जनवरी': 'january',
    'फ़रवरी': 'february',
    'फरवरी': 'february',
    'मार्च': 'march',
    'अप्रैल': 'april',
    'मई': 'may',
    'जून': 'june',
    'जुलाई': 'july',
    'अगस्त': 'august',
    'सितंबर': 'september',
    'सितम्बर': 'september',
    'अक्टूबर': 'october',
    'अक्तूबर': 'october',
    'नवंबर': 'november',
    'नवम्बर': 'november',
    'दिसंबर': 'december',
    'दिसम्बर': 'december'
  };

  for (const [hindi, english] of Object.entries(hindiToEnglishMonths)) {
    if (s.includes(hindi)) {
      s = s.replace(new RegExp(hindi, 'g'), english);
    }
  }

  // Handle formats like: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = s.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})\b/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed month
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) {
      year += 2000;
    }
    const parsedDate = new Date(year, month, day);
    if (!isNaN(parsedDate.getTime())) {
      parsedDate.setHours(23, 59, 59, 999);
      return parsedDate;
    }
  }

  // Support suffix matching, e.g. "31st May" -> "31 May"
  s = s.replace(/\b(\d{1,2})(?:st|nd|rd|th)\b/g, '$1');

  // Strip non-standard characters from start/end before parsing to help standard new Date()
  // eslint-disable-next-line no-misleading-character-class
  let cleanAlpha = s.replace(/^[:\-–—\s\u200b•|ः।●]+/, '').replace(/[:\-–—\s|ः।●]+$/, '').trim();
  
  // Extract pure date substring if there is trailing noise like "(until 11:00 PM)"
  const matchAlpha = cleanAlpha.match(/\b\d{1,2}[\s./-]*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s./-]*\d{2,4}\b/i);
  if (matchAlpha) {
    cleanAlpha = matchAlpha[0];
  } else {
    const matchAlphaRev = cleanAlpha.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s./-]*\d{1,2}[\s./-]*\d{2,4}\b/i);
    if (matchAlphaRev) {
      cleanAlpha = matchAlphaRev[0];
    }
  }

  const tryStandard = new Date(cleanAlpha);
  if (!isNaN(tryStandard.getTime())) {
    tryStandard.setHours(23, 59, 59, 999);
    return tryStandard;
  }

  return null;
};

const extractDatesFromHtml = (htmlContent: string | null | undefined) => {
  if (!htmlContent) return { startDate: null, lastDate: null };
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  let startDate: string | null = null;
  let lastDate: string | null = null;

  const startKeywords = [/apply\s*online\s*(?:start|begin|date)/i, /application\s*(?:begin|start)/i];
  const lastKeywords = [/last\s*date/i, /closing\s*date/i, /(?:अंतिम|अन्तिम|आखिरी|आखरी)\s*तिथि/i];

  const rows = Array.from(doc.querySelectorAll('tr'));
  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('td, th'));
    if (cells.length >= 2) {
      for (let i = 0; i < cells.length; i++) {
        const cellText = cleanText(cells[i].textContent || '');
        if (!cellText) continue;

        if (!startDate && startKeywords.some(kw => kw.test(cellText))) {
          for (let j = i + 1; j < cells.length; j++) {
            const nextText = cleanText(cells[j].textContent || '');
            const extracted = extractDateText(nextText);
            if (extracted) { startDate = extracted; break; }
          }
        }
        if (!lastDate && lastKeywords.some(kw => kw.test(cellText))) {
          for (let j = i + 1; j < cells.length; j++) {
            const nextText = cleanText(cells[j].textContent || '');
            const extracted = extractDateText(nextText);
            if (extracted) { lastDate = extracted; break; }
          }
        }
      }
    }
  }
  return { startDate, lastDate };
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

  // Fix or remove broken category links and auto-expire "New" flag for Latest Jobs
  const postSlugs = posts.map(p => p.slug);
  const postIds = posts.map(p => p.id);
  
  const latestJobsCat = categories.find((c: any) => 
    c.name && 
    (c.name.toLowerCase().includes('latest') || c.name.toLowerCase().includes('letest')) && 
    c.name.toLowerCase().includes('job')
  );

  const categoryLinks = initialCategoryLinks.map(l => {
    const updatedLink = { ...l };
    
    // 1. URL fixing
    if (updatedLink.url && updatedLink.url.startsWith('/post/')) {
      const slug = updatedLink.url.replace('/post/', '');
      if (!postSlugs.includes(slug) && !postIds.includes(slug)) {
        const match = posts.find(p => p.slug && p.slug.startsWith(slug));
        if (match) {
          updatedLink.url = `/post/${match.slug}`;
        } else {
          // Mark as broken if no match found
          updatedLink._broken = true;
        }
      }
    }

    // 2. Auto-expire "New" flag for Latest Jobs
    if (!updatedLink._broken && latestJobsCat && updatedLink.category_id === latestJobsCat.id && updatedLink.is_new) {
      if (updatedLink.url) {
        const match = updatedLink.url.match(/\/post\/(.+)/);
        const slug = match ? match[1] : null;
        if (slug) {
          const post = posts.find((p: any) => p.slug === slug || p.id === slug);
          if (post) {
            // Check if there is a last date text
            const lastDateStr = post.last_date_text || post.last_date_text_hi || 
                                (post.tables_html ? extractDatesFromHtml(post.tables_html).lastDate : null) || 
                                (post.tables_html_hi ? extractDatesFromHtml(post.tables_html_hi).lastDate : null);
            if (lastDateStr) {
              const cleaned = extractDateText(lastDateStr) || lastDateStr;
              const parsedDate = parseCleanDate(cleaned);
              if (parsedDate && parsedDate.getTime() < Date.now()) {
                updatedLink.is_new = false;
                console.log(`[Build Auto-Expire] Marked expired "New" badge for link: "${updatedLink.title}" (Date: ${parsedDate.toLocaleDateString()})`);
              }
            }
          }
        }
      }
    }

    return updatedLink;
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
        // Remove default title, canonical, and meta tags to avoid duplicates that confuse search engines and social crawlers
        html = html.replace(/<title>.*?<\/title>/gi, '');
        html = html.replace(/<link [^>]*rel=["']canonical["'][^>]*>/gi, '');
        html = html.replace(/<meta [^>]*name=["']description["'][^>]*>/gi, '');
        html = html.replace(/<meta [^>]*name=["']keywords["'][^>]*>/gi, '');
        html = html.replace(/<meta [^>]*property=["']og:title["'][^>]*>/gi, '');
        html = html.replace(/<meta [^>]*property=["']og:description["'][^>]*>/gi, '');
        html = html.replace(/<meta [^>]*property=["']og:image["'][^>]*>/gi, '');
        html = html.replace(/<meta [^>]*property=["']og:url["'][^>]*>/gi, '');
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

  // Initialize lightweightPosts with empty search_corpus
  const lightweightPosts = posts.map(p => {
    const { tables_html, tables_html_hi, media_urls, ...rest } = p;
    return { ...rest, search_corpus: '' };
  });

  const homeData = {
    categories,
    category_links: categoryLinks,
    tablet_items: validTabletItems,
    posts: lightweightPosts,
    settings_flat: settings,
  };

  // 2. Generate Post Detail Pages
  const dataDir = path.resolve(outDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  const { loadChunksForPost } = await import(path.resolve(root, 'src/lib/firebaseService.ts'));
  const stripHtml = (html: string) => html ? html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ') : '';

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    // Load chunks individually, then discard them to prevent OOM
    await loadChunksForPost(post.id, post);
    
    // Populate search_corpus for lightweightPosts and homeData now that we have the full chunk
    const corpus = `${stripHtml(post.tables_html || '')} ${stripHtml(post.tables_html_hi || '')}`.substring(0, 5000);
    homeData.posts[i].search_corpus = corpus;

    const postData = {
      ...homeData,
      [`post_${post.slug || post.id}`]: post,
    };
    const getPostCategoryName = (p: any) => {
      if (!p || !categoryLinks || !categories) return '';
      const postSlug = p.slug || p.id;
      const matchedLink = categoryLinks.find((link: any) => 
        link.url && (
          link.url.endsWith(`/post/${postSlug}`) || 
          link.url.endsWith(`/post/${p.id}`) || 
          link.url.includes(`/post/${postSlug}`) || 
          link.url.includes(`/post/${p.id}`)
        )
      );
      if (matchedLink) {
        const cat = categories.find((c: any) => c.id === matchedLink.category_id);
        if (cat) return cat.name;
      }
      return '';
    };

    const generateDynamicDescription = (p: any, catName: string) => {
      const title = p?.name_of_post || '';
      const catLower = (catName || '').toLowerCase();
      const cleanShortInfo = p?.short_info ? p.short_info.replace(/\*\*(.*?)\*\*/gs, '$1').replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim() : '';
      let actionPrefix = '';

      if (catLower.includes('admit') || catLower.includes('exam')) {
        actionPrefix = `Download Admit Card for ${title}. Check Exam Date, Admit Card Download Link, Exam Pattern, Syllabus, Eligibility on Sarkari Sewayojan.`;
      } else if (catLower.includes('job') || catLower.includes('vacancy') || catLower.includes('recruitment') || catLower.includes('form')) {
        actionPrefix = `Apply Online for ${title} Recruitment 2026. Check Online Form Date, Age Limit, Educational Eligibility, Vacancy Details, Notification PDF, Sarkari Sewayojan.`;
      } else if (catLower.includes('result')) {
        actionPrefix = `Check Sarkari Result for ${title}. Check Written Exam Result, Score Card, Cut Off Marks, Merit List, Selected Candidates List on Sarkari Sewayojan.`;
      } else if (catLower.includes('answer') || catLower.includes('key')) {
        actionPrefix = `Download official Answer Key for ${title}. Check Question Paper Solutions, Objection Form, Answer Sheet PDF on Sarkari Sewayojan.`;
      } else if (catLower.includes('syllabus')) {
        actionPrefix = `Download Exam Syllabus PDF for ${title}. Check Exam Pattern, Selection Process, Subject-wise Marks, Paper Pattern on Sarkari Sewayojan.`;
      } else if (catLower.includes('admission')) {
        actionPrefix = `Apply Online Admission for ${title}. Check Course Intake, Direct Entrance Exam, College Admission List, Eligibility Criteria on Sarkari Sewayojan.`;
      } else {
        // Fallback matching using keywords from the title itself
        const titleLower = title.toLowerCase();
        if (titleLower.includes('admit') || titleLower.includes('hall ticket')) {
          actionPrefix = `Download Admit Card for ${title}. Check Exam Date, Admit Card Download Link, Exam Pattern, Syllabus, Eligibility on Sarkari Sewayojan.`;
        } else if (titleLower.includes('online form') || titleLower.includes('apply online') || titleLower.includes('recruitment') || titleLower.includes('vacancy') || titleLower.includes('bharti')) {
          actionPrefix = `Apply Online for ${title} Recruitment 2026. Check Online Form Date, Age Limit, Educational Eligibility, Vacancy Details, Notification PDF, Sarkari Sewayojan.`;
        } else if (titleLower.includes('result') || titleLower.includes('score card') || titleLower.includes('marksheet')) {
          actionPrefix = `Check Sarkari Result for ${title}. Check Written Exam Result, Score Card, Cut Off Marks, Merit List, Selected Candidates List on Sarkari Sewayojan.`;
        } else if (titleLower.includes('answer key') || titleLower.includes('key')) {
          actionPrefix = `Download official Answer Key for ${title}. Check Question Paper Solutions, Objection Form, Answer Sheet PDF on Sarkari Sewayojan.`;
        } else if (titleLower.includes('syllabus')) {
          actionPrefix = `Download Exam Syllabus PDF for ${title}. Check Exam Pattern, Selection Process, Subject-wise Marks, Paper Pattern on Sarkari Sewayojan.`;
        } else if (titleLower.includes('admission')) {
          actionPrefix = `Apply Online Admission for ${title}. Check Course Intake, Direct Entrance Exam, College Admission List, Eligibility Criteria on Sarkari Sewayojan.`;
        } else {
          actionPrefix = `Check full details of ${title}. Check Eligibility Criteria, Download Notification, Direct Apply Link, and Latest Sarkari Updates on Sarkari Sewayojan.`;
        }
      }

      if (cleanShortInfo) {
        const snippet = cleanShortInfo.length > 120 
          ? cleanShortInfo.substring(0, 120) + '...' 
          : cleanShortInfo;
        return `${actionPrefix} ${snippet}`;
      }

      return actionPrefix;
    };

    const postCategory = getPostCategoryName(post);
    const postDescription = generateDynamicDescription(post, postCategory);
    generatePage(`/post/${post.slug || post.id}`, postData, `post/${post.slug || post.id}.html`, `${post.name_of_post} - Sarkari Sewayojan`, postDescription);
    
    // Generate individual JSON file for client-side navigation
    fs.writeFileSync(path.resolve(dataDir, `post_${post.slug || post.id}.json`), JSON.stringify(post));

    // Free up string memory
    post.tables_html = undefined;
    post.tables_html_hi = undefined;
  }

  // 1. Generate Home Page (moved here so homeData has the populated search_corpus)
  generatePage('/', homeData, 'index.html', settings.tagline || 'Sarkari Sewayojan', 'Latest Government Jobs, Results & Notifications');

  // 3. Generate Category Pages
  for (const cat of categories) {
    const catData = {
      ...homeData,
    };
    // Use the raw category name for the file path, but encode it for the URL
    const catPath = `category/${cat.name}.html`;
    generatePage(`/category/${encodeURIComponent(cat.name)}`, catData, catPath, `${cat.name} - Sarkari Sewayojan`, `All updates for ${cat.name}`);
  }

  // 4. Generate Static Policy Pages
  generatePage('/privacy-policy', homeData, 'privacy-policy.html', 'Privacy Policy - Sarkari Sewayojan', 'Privacy Policy');
  generatePage('/dmca-policy', homeData, 'dmca-policy.html', 'DMCA Policy - Sarkari Sewayojan', 'DMCA Policy');
  generatePage('/terms-and-conditions', homeData, 'terms-and-conditions.html', 'Terms and Conditions - Sarkari Sewayojan', 'Terms and Conditions');
  generatePage('/contact-us', homeData, 'contact-us.html', 'Contact Us - Sarkari Sewayojan', 'Contact Us');
  generatePage('/fact-checking-policy', homeData, 'fact-checking-policy.html', 'Fact Checking Policy - Sarkari Sewayojan', 'Fact Checking Policy');

  // 5. Generate Admin Shell
  const adminHtml = template.replace(`<!--ssr-outlet-->`, '')
                            .replace(`<div id="root"></div>`, `<div id="root"></div>`);
  fs.writeFileSync(path.resolve(outDir, 'admin.html'), adminHtml);
  console.log(`Generated admin.html shell`);

  // 5.5 Generate Search Shell
  const scriptTag = `<script>window.__INITIAL_DATA__ = ${JSON.stringify(homeData).replace(/</g, '\\u003c')};</script>`;
  const searchHtml = template.replace(`<!--ssr-outlet-->`, '')
                             .replace(`<title>Vite + React + TS</title>`, `<title>Search Results - Sarkari Sewayojan</title>`)
                             .replace(`<div id="root"></div>`, `<div id="root"><div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif; font-size: 20px; font-weight: bold; color: #0b3d91;">Loading...</div></div>`)
                             .replace('</body>', `${scriptTag}</body>`);
  fs.writeFileSync(path.resolve(outDir, 'search.html'), searchHtml);
  console.log(`Generated search.html shell`);

  // 5.6 Generate Category Shell
  const categoryHtml = template.replace(`<!--ssr-outlet-->`, '')
                               .replace(`<title>Vite + React + TS</title>`, `<title>Section Details - Sarkari Sewayojan</title>`)
                               .replace(`<div id="root"></div>`, `<div id="root"><div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif; font-size: 20px; font-weight: bold; color: #0b3d91;">Loading...</div></div>`)
                               .replace('</body>', `${scriptTag}</body>`);
  fs.writeFileSync(path.resolve(outDir, 'category_shell.html'), categoryHtml);
  console.log(`Generated category_shell.html shell`);

  // 5.7 Generate 404 Page
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

    let imageXml = '';
    if (post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0) {
      try {
        const cleanImgTitle = (post.name_of_post || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
        const cleanImgUrl = (post.media_urls[0] || '').replace(/&/g, '&amp;');
        imageXml = `
      <image:image>
        <image:loc>${cleanImgUrl}</image:loc>
        <image:title>${cleanImgTitle}</image:title>
      </image:image>`;
      } catch (err) {
        // Safe fallback
      }
    }

    sitemapUrls += `
    <url>
      <loc>${baseUrl}/post/${post.slug || post.id}</loc>
      <lastmod>${lastmod}</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.8</priority>${imageXml}
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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
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
