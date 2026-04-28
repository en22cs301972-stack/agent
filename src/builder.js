'use strict';

const fs = require('fs');
const path = require('path');

const COLOR_MAP = {
  navy: '#1f2a44',
  blue: '#2563eb',
  indigo: '#4f46e5',
  purple: '#7c3aed',
  pink: '#db2777',
  red: '#dc2626',
  orange: '#ea580c',
  amber: '#f59e0b',
  yellow: '#facc15',
  green: '#16a34a',
  teal: '#0f766e',
  cyan: '#0891b2',
  gray: '#64748b',
  slate: '#475569',
  black: '#111827',
  white: '#ffffff'
};

const INDUSTRY_KEYWORDS = [
  { industry: 'restaurant', keywords: ['restaurant', 'cafe', 'bistro', 'food', 'dining'] },
  { industry: 'portfolio', keywords: ['portfolio', 'freelance', 'designer', 'developer', 'photographer'] },
  { industry: 'saas', keywords: ['saas', 'software', 'app', 'platform', 'subscription'] },
  { industry: 'agency', keywords: ['agency', 'studio', 'consulting', 'marketing'] },
  { industry: 'ecommerce', keywords: ['ecommerce', 'shop', 'store', 'boutique'] }
];

const TONE_KEYWORDS = [
  { tone: 'luxury', keywords: ['luxury', 'premium', 'exclusive'] },
  { tone: 'minimal', keywords: ['minimal', 'clean', 'simple'] },
  { tone: 'playful', keywords: ['playful', 'fun', 'vibrant'] },
  { tone: 'bold', keywords: ['bold', 'strong', 'confident'] },
  { tone: 'warm', keywords: ['warm'] },
  { tone: 'friendly', keywords: ['friendly', 'approachable'] }
];

function buildSite(prompt, options = {}) {
  const outputDir = options.outputDir || path.resolve(process.cwd(), 'site');
  const spec = refineSpec(createSpec(prompt));

  if (!options.dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
    const html = renderHtml(spec);
    const css = renderCss(spec);
    const js = renderJs(spec);

    fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf8');
    fs.writeFileSync(path.join(outputDir, 'styles.css'), css, 'utf8');
    fs.writeFileSync(path.join(outputDir, 'app.js'), js, 'utf8');
  }

  return {
    spec,
    outputDir,
    files: ['index.html', 'styles.css', 'app.js']
  };
}

function createSpec(prompt) {
  const normalizedPrompt = prompt.trim();
  const promptLower = normalizedPrompt.toLowerCase();
  const parsed = parsePromptLines(normalizedPrompt);

  const industry = detectIndustry(promptLower);
  const tone = parsed.tone || detectTone(promptLower);
  const name = parsed.name || detectName(normalizedPrompt);
  const description = parsed.description || firstSentence(normalizedPrompt);
  const audience = parsed.audience || detectAudience(promptLower);
  const primaryColor = resolveColor(parsed.primaryColor, '#2563eb');
  const secondaryColor = resolveColor(parsed.secondaryColor, '#f97316');
  const cta = parsed.cta || detectCta(promptLower);
  const layout = promptLower.includes('split') ? 'split' : 'stacked';

  const meta = {
    name,
    industry,
    tone,
    audience,
    description,
    primaryColor,
    secondaryColor,
    cta,
    layout,
    tagline: parsed.tagline || buildTagline(industry, tone),
    location: parsed.location || 'Available worldwide',
    email: parsed.email || buildEmail(name),
    phone: parsed.phone || '+1 (555) 013-2026'
  };

  const sections = buildSections(meta);

  return {
    meta,
    sections,
    footer: {
      text: `${meta.name} · Crafted for ${meta.audience}`
    }
  };
}

function parsePromptLines(prompt) {
  const data = {};
  const lines = prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) {
      continue;
    }
    const rawKey = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    if (!rawKey || !value) {
      continue;
    }
    const key = normalizeKey(rawKey);
    if (key) {
      data[key] = value;
    }
  }

  return data;
}

function normalizeKey(rawKey) {
  const map = {
    'site name': 'name',
    name: 'name',
    brand: 'name',
    tagline: 'tagline',
    description: 'description',
    audience: 'audience',
    'target audience': 'audience',
    tone: 'tone',
    cta: 'cta',
    'call to action': 'cta',
    'primary color': 'primaryColor',
    'secondary color': 'secondaryColor',
    location: 'location',
    email: 'email',
    phone: 'phone'
  };
  return map[rawKey] || null;
}

function detectIndustry(promptLower) {
  for (const entry of INDUSTRY_KEYWORDS) {
    if (entry.keywords.some((keyword) => promptLower.includes(keyword))) {
      return entry.industry;
    }
  }
  return 'business';
}

function detectTone(promptLower) {
  for (const entry of TONE_KEYWORDS) {
    if (entry.keywords.some((keyword) => promptLower.includes(keyword))) {
      return entry.tone;
    }
  }
  return 'modern';
}

function detectName(prompt) {
  const match = prompt.match(/\"([^\"]{3,40})\"/);
  if (match) {
    return match[1];
  }
  return 'Your Brand';
}

function firstSentence(prompt) {
  const sentence = prompt.split(/[.!?]/)[0];
  return sentence && sentence.trim() ? sentence.trim() : 'A focused, modern web presence tailored to your goals.';
}

function detectAudience(promptLower) {
  if (promptLower.includes('startups')) {
    return 'fast-moving startup teams';
  }
  if (promptLower.includes('freelance')) {
    return 'independent clients';
  }
  if (promptLower.includes('families')) {
    return 'local families';
  }
  return 'ambitious customers';
}

function detectCta(promptLower) {
  if (promptLower.includes('book')) {
    return 'Book a Demo';
  }
  if (promptLower.includes('reserve')) {
    return 'Reserve a Table';
  }
  if (promptLower.includes('subscribe')) {
    return 'Start a Trial';
  }
  return 'Get Started';
}

function resolveColor(input, fallback) {
  if (!input) {
    return fallback;
  }
  const trimmed = input.trim().toLowerCase();
  if (trimmed.startsWith('#') && trimmed.length >= 4) {
    return trimmed;
  }
  return COLOR_MAP[trimmed] || fallback;
}

function buildTagline(industry, tone) {
  const toneText = tone === 'modern' ? 'bold' : tone;
  const industryText = industry === 'business' ? 'brand' : industry;
  return `A ${toneText} ${industryText} experience that feels effortless.`;
}

function buildEmail(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `hello@${slug || 'brand'}.com`;
}

function buildSections(meta) {
  const baseSections = {
    restaurant: ['hero', 'menu', 'highlights', 'testimonials', 'location', 'contact'],
    portfolio: ['hero', 'projects', 'about', 'skills', 'testimonials', 'contact'],
    saas: ['hero', 'features', 'integrations', 'pricing', 'faq', 'contact'],
    agency: ['hero', 'services', 'work', 'testimonials', 'process', 'contact'],
    ecommerce: ['hero', 'collection', 'benefits', 'reviews', 'faq', 'contact'],
    business: ['hero', 'features', 'process', 'testimonials', 'faq', 'contact']
  };

  const order = baseSections[meta.industry] || baseSections.business;
  return order.map((type) => buildSection(type, meta));
}

function buildSection(type, meta) {
  switch (type) {
    case 'hero':
      return {
        id: 'hero',
        type,
        title: meta.name,
        navTitle: 'Home',
        body: meta.description,
        cta: meta.cta
      };
    case 'menu':
      return createListSection('menu', 'Signature Menu', 'Seasonal highlights with crafted flavors.', [
        { title: 'Chef’s Tasting Trio', description: 'A rotating set of locally inspired dishes.' },
        { title: 'Garden Harvest Bowl', description: 'Fresh produce with house-made dressing.' },
        { title: 'Citrus Glaze Dessert', description: 'A bright finish to every meal.' }
      ]);
    case 'highlights':
      return createListSection('highlights', 'Dining Highlights', 'Details that make the experience memorable.', [
        { title: 'Locally sourced', description: 'Partnering with nearby farms and artisans.' },
        { title: 'Thoughtful atmosphere', description: 'Warm lighting, curated music, calm energy.' },
        { title: 'Seasonal pairings', description: 'Signature drinks that evolve monthly.' }
      ]);
    case 'projects':
      return createCardsSection('projects', 'Featured Projects', 'A snapshot of recent work that drives results.', [
        { title: 'Launch Strategy', description: 'Positioning a new product for rapid adoption.' },
        { title: 'Visual Identity', description: 'A cohesive brand system across web and print.' },
        { title: 'Growth Campaign', description: 'Multi-channel outreach with measurable ROI.' }
      ]);
    case 'about':
      return createTextSection('about', 'About the Studio', 'A focused partner delivering thoughtful design and strategy.');
    case 'skills':
      return createListSection('skills', 'Core Skills', 'A toolkit built to support ambitious ideas.', [
        { title: 'UX Strategy', description: 'User journeys that convert with clarity.' },
        { title: 'Visual Design', description: 'Systems that scale with your brand.' },
        { title: 'Launch Support', description: 'Iterative improvements with quick turnaround.' }
      ]);
    case 'features':
      return createListSection('features', 'Key Features', `Designed for ${meta.audience} who value momentum.`, [
        { title: 'Fast onboarding', description: 'Clear steps from kickoff to launch.' },
        { title: 'Consistent branding', description: 'A cohesive system across every touchpoint.' },
        { title: 'Reliable support', description: 'Guidance whenever you need it.' }
      ]);
    case 'integrations':
      return createCardsSection('integrations', 'Integrations', 'Connect every workflow without friction.', [
        { title: 'Payments', description: 'Simple subscription and invoicing flows.' },
        { title: 'Analytics', description: 'Track the moments that matter.' },
        { title: 'Automation', description: 'Reduce manual work with smart triggers.' }
      ]);
    case 'pricing':
      return createCardsSection('pricing', 'Pricing', 'Clear options that scale as you grow.', [
        { title: 'Starter', description: 'Best for getting your first customers.' },
        { title: 'Growth', description: 'Automation and analytics included.' },
        { title: 'Scale', description: 'Custom workflows with dedicated support.' }
      ]);
    case 'services':
      return createCardsSection('services', 'Services', 'A tight set of offerings that deliver impact.', [
        { title: 'Brand Strategy', description: 'Define positioning, tone, and messaging.' },
        { title: 'Web Experience', description: 'Design and build sites that convert.' },
        { title: 'Launch Support', description: 'Campaigns, content, and enablement.' }
      ]);
    case 'work':
      return createCardsSection('work', 'Recent Work', 'Highlights from recent client engagements.', [
        { title: 'Market Research', description: 'Customer interviews and messaging maps.' },
        { title: 'Product Website', description: 'High-converting landing pages and flows.' },
        { title: 'Content Engine', description: 'Repeatable assets for every channel.' }
      ]);
    case 'process':
      return createListSection('process', 'Process', 'Structured collaboration with clear milestones.', [
        { title: 'Discover', description: 'Align goals, audiences, and success metrics.' },
        { title: 'Design', description: 'Rapid iterations with focused feedback.' },
        { title: 'Launch', description: 'Deploy, measure, and refine.' }
      ]);
    case 'collection':
      return createCardsSection('collection', 'Featured Collection', 'Curated products crafted with care.', [
        { title: 'Everyday Essentials', description: 'Versatile pieces designed to last.' },
        { title: 'Limited Editions', description: 'Small runs with bold details.' },
        { title: 'Gift Sets', description: 'Thoughtful bundles for any occasion.' }
      ]);
    case 'benefits':
      return createListSection('benefits', 'Why Shop Here', 'Benefits that keep customers coming back.', [
        { title: 'Fast shipping', description: 'Reliable delivery with tracking included.' },
        { title: 'Quality guarantee', description: 'Every item is checked before shipping.' },
        { title: 'Human support', description: 'Real people on hand to help.' }
      ]);
    case 'reviews':
      return createCardsSection('reviews', 'Customer Reviews', 'Real stories from happy customers.', [
        { title: '“Beautifully packaged.”', description: '“Everything arrived perfectly and on time.”' },
        { title: '“Exceeded expectations.”', description: '“The quality is outstanding for the price.”' },
        { title: '“Will order again.”', description: '“The support team was incredibly helpful.”' }
      ]);
    case 'location':
      return createTextSection('location', 'Visit Us', 'Find us in the heart of the neighborhood with easy parking.');
    case 'testimonials':
      return createCardsSection('testimonials', 'Testimonials', 'Proof from people who trust the brand.', [
        { title: '“Exceptional experience.”', description: '“Everything felt polished and easy.”' },
        { title: '“Clear results.”', description: '“We saw momentum within weeks.”' },
        { title: '“Highly recommend.”', description: '“The team made every step simple.”' }
      ]);
    case 'faq':
      return createListSection('faq', 'FAQ', 'Answers to the questions we hear most.', [
        { title: 'How fast can we launch?', description: 'Most sites ship in 1–2 weeks.' },
        { title: 'Can we customize later?', description: 'Yes, every section is flexible.' },
        { title: 'What if we need support?', description: 'We are available by email and chat.' }
      ]);
    case 'contact':
      return {
        id: 'contact',
        type,
        title: 'Contact',
        body: 'Tell us about your goals and we will respond within 24 hours.',
        details: [
          { label: 'Email', value: meta.email },
          { label: 'Phone', value: meta.phone },
          { label: 'Location', value: meta.location }
        ]
      };
    default:
      return createTextSection(type, type, meta.description);
  }
}

function createTextSection(id, title, body) {
  return { id, type: 'text', title, body };
}

function createListSection(id, title, body, items) {
  return { id, type: 'list', title, body, items };
}

function createCardsSection(id, title, body, items) {
  return { id, type: 'cards', title, body, items };
}

function refineSpec(spec) {
  let passes = 0;
  while (passes < 2) {
    const issues = evaluateSpec(spec);
    if (!issues.length) {
      break;
    }
    applyFixes(spec, issues);
    passes += 1;
  }
  spec.meta.refinementPasses = passes;
  return spec;
}

function evaluateSpec(spec) {
  const issues = [];
  if (!spec.meta.name || spec.meta.name === 'Your Brand') {
    issues.push({ code: 'name' });
  }
  if (!spec.meta.cta) {
    issues.push({ code: 'cta' });
  }
  const ids = new Set();
  for (const section of spec.sections) {
    if (!section.id) {
      issues.push({ code: 'section-id', section });
    } else if (ids.has(section.id)) {
      issues.push({ code: 'duplicate-id', section });
    } else {
      ids.add(section.id);
    }
    if (!section.title) {
      issues.push({ code: 'section-title', section });
    }
  }
  if (!spec.sections.find((section) => section.type === 'hero')) {
    issues.push({ code: 'missing-hero' });
  }
  if (!spec.sections.find((section) => section.type === 'contact')) {
    issues.push({ code: 'missing-contact' });
  }
  if (spec.sections.length < 4) {
    issues.push({ code: 'section-count' });
  }
  return issues;
}

function applyFixes(spec, issues) {
  for (const issue of issues) {
    switch (issue.code) {
      case 'name':
        spec.meta.name = 'Your Brand';
        break;
      case 'cta':
        spec.meta.cta = 'Get Started';
        break;
      case 'section-id':
        issue.section.id = slugify(issue.section.title || issue.section.type || 'section');
        break;
      case 'duplicate-id':
        issue.section.id = `${issue.section.id}-${Math.floor(Math.random() * 1000)}`;
        break;
      case 'section-title':
        issue.section.title = titleCase(issue.section.id || 'Section');
        break;
      case 'missing-hero':
        spec.sections.unshift(buildSection('hero', spec.meta));
        break;
      case 'missing-contact':
        spec.sections.push(buildSection('contact', spec.meta));
        break;
      case 'section-count':
        spec.sections.push(buildSection('features', spec.meta));
        break;
      default:
        break;
    }
  }
}

function renderHtml(spec) {
  const navLinks = spec.sections
    .filter((section) => section.type !== 'text' || section.id !== 'footer')
    .map((section) => `<a href="#${section.id}">${section.navTitle || section.title}</a>`)
    .join('');

  const sectionsHtml = spec.sections.map((section) => renderSection(section, spec.meta)).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(spec.meta.name)}</title>
    <meta name="description" content="${escapeHtml(spec.meta.description)}" />
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <header class="site-header">
      <div class="container nav-wrap">
        <div class="brand">${escapeHtml(spec.meta.name)}</div>
        <nav class="nav" data-nav>${navLinks}</nav>
        <button class="nav-toggle" data-nav-toggle aria-label="Toggle navigation">Menu</button>
      </div>
    </header>
    <main>
      ${sectionsHtml}
    </main>
    <footer class="site-footer">
      <div class="container">
        <p>${escapeHtml(spec.footer.text)}</p>
        <p class="muted">© <span data-year></span> ${escapeHtml(spec.meta.name)}. All rights reserved.</p>
      </div>
    </footer>
    <script src="./app.js"></script>
  </body>
</html>`;
}

function renderSection(section, meta) {
  switch (section.type) {
    case 'hero':
      return `<section id="${section.id}" class="section hero hero--${meta.layout}">
  <div class="container hero-content">
    <div>
      <p class="eyebrow">${escapeHtml(meta.tagline)}</p>
      <h1>${escapeHtml(section.title)}</h1>
      <p>${escapeHtml(section.body)}</p>
      <button class="primary">${escapeHtml(section.cta)}</button>
    </div>
    <div class="hero-card">
      <p class="hero-card-title">Built for ${escapeHtml(meta.audience)}</p>
      <p>${escapeHtml(meta.tone)} visuals · ${escapeHtml(meta.industry)} focus · clear messaging</p>
    </div>
  </div>
</section>`;
    case 'cards':
      return `<section id="${section.id}" class="section">
  <div class="container">
    <h2>${escapeHtml(section.title)}</h2>
    <p>${escapeHtml(section.body)}</p>
    <div class="card-grid">
      ${section.items.map(renderCard).join('')}
    </div>
  </div>
</section>`;
    case 'list':
      return `<section id="${section.id}" class="section">
  <div class="container">
    <h2>${escapeHtml(section.title)}</h2>
    <p>${escapeHtml(section.body)}</p>
    <ul class="feature-list">
      ${section.items.map(renderListItem).join('')}
    </ul>
  </div>
</section>`;
    case 'contact':
      return `<section id="${section.id}" class="section contact">
  <div class="container">
    <h2>${escapeHtml(section.title)}</h2>
    <p>${escapeHtml(section.body)}</p>
    <div class="contact-grid">
      ${section.details.map(renderDetail).join('')}
    </div>
  </div>
</section>`;
    default:
      return `<section id="${section.id}" class="section">
  <div class="container">
    <h2>${escapeHtml(section.title)}</h2>
    <p>${escapeHtml(section.body)}</p>
  </div>
</section>`;
  }
}

function renderCard(item) {
  return `<article class="card">
  <h3>${escapeHtml(item.title)}</h3>
  <p>${escapeHtml(item.description)}</p>
</article>`;
}

function renderListItem(item) {
  return `<li>
  <strong>${escapeHtml(item.title)}</strong>
  <span>${escapeHtml(item.description)}</span>
</li>`;
}

function renderDetail(detail) {
  return `<div class="contact-item">
  <span class="label">${escapeHtml(detail.label)}</span>
  <span>${escapeHtml(detail.value)}</span>
</div>`;
}

function renderCss(spec) {
  return `:root {
  --primary: ${spec.meta.primaryColor};
  --secondary: ${spec.meta.secondaryColor};
  --text: #0f172a;
  --muted: #64748b;
  --bg: #f8fafc;
  --card: #ffffff;
  --border: #e2e8f0;
  --shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
  font-family: "Inter", "Segoe UI", system-ui, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}

a {
  color: inherit;
  text-decoration: none;
}

.container {
  width: min(1100px, 92%);
  margin: 0 auto;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(248, 250, 252, 0.95);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(8px);
}

.nav-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  gap: 1rem;
}

.brand {
  font-weight: 700;
  letter-spacing: 0.02em;
}

.nav {
  display: flex;
  gap: 1.5rem;
  font-size: 0.95rem;
}

.nav-toggle {
  display: none;
  border: 1px solid var(--border);
  background: white;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
}

.section {
  padding: 4.5rem 0;
}

.hero {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(249, 115, 22, 0.1));
}

.hero-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 2rem;
  align-items: center;
}

.hero-card {
  background: var(--card);
  padding: 2rem;
  border-radius: 1.5rem;
  box-shadow: var(--shadow);
}

.hero-card-title {
  font-weight: 600;
  margin-top: 0;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.8rem;
  color: var(--muted);
}

button.primary {
  margin-top: 1rem;
  padding: 0.85rem 1.8rem;
  border: none;
  border-radius: 999px;
  background: var(--primary);
  color: white;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow);
}

.card-grid {
  margin-top: 2rem;
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.card {
  padding: 1.5rem;
  background: var(--card);
  border-radius: 1.2rem;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 2rem 0 0;
  display: grid;
  gap: 1.2rem;
}

.feature-list li {
  background: var(--card);
  padding: 1rem 1.2rem;
  border-radius: 1rem;
  border: 1px solid var(--border);
  display: grid;
  gap: 0.4rem;
}

.contact-grid {
  margin-top: 1.5rem;
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.contact-item {
  padding: 1rem 1.2rem;
  background: var(--card);
  border-radius: 1rem;
  border: 1px solid var(--border);
}

.label {
  display: block;
  font-size: 0.8rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 0.25rem;
}

.site-footer {
  border-top: 1px solid var(--border);
  padding: 2.5rem 0;
  background: white;
}

.muted {
  color: var(--muted);
  font-size: 0.9rem;
}

@media (max-width: 720px) {
  .nav {
    display: none;
    flex-direction: column;
    padding: 1rem;
    background: white;
    position: absolute;
    right: 1rem;
    top: 4rem;
    border-radius: 1rem;
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
  }

  .nav.open {
    display: flex;
  }

  .nav-toggle {
    display: inline-flex;
  }
}`;
}

function renderJs() {
  return `const navToggle = document.querySelector('[data-nav-toggle]');\nconst nav = document.querySelector('[data-nav]');\nif (navToggle && nav) {\n  navToggle.addEventListener('click', () => {\n    nav.classList.toggle('open');\n  });\n}\nconst year = document.querySelector('[data-year]');\nif (year) {\n  year.textContent = new Date().getFullYear();\n}\n`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function titleCase(value) {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  buildSite,
  createSpec
};
