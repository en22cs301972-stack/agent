# Personal Web Builder Agent

Single-prompt website builder that generates a polished, static one-page site (HTML/CSS/JS) and self-refines internally so you do not have to re-prompt for corrections.

## Scope

**Target users:** founders, freelancers, agencies, restaurants, and ecommerce brands that need a fast, personal marketing site.  
**Page types:** single-page marketing/portfolio sites with anchored sections.  
**Sections available:** hero, features, process, testimonials, pricing, faq, menu, projects, services, contact, and more (selected by industry).  
**Templates:** curated section templates for restaurant, portfolio, SaaS, agency, ecommerce, and general business.  
**Output:** static `index.html`, `styles.css`, `app.js` in a chosen output directory.

## Prompt format

You can pass a free-form paragraph or a structured prompt with `Key: Value` lines.

**Supported keys:** `Site name`, `Audience`, `Tone`, `Primary color`, `Secondary color`, `CTA`, `Tagline`, `Description`, `Location`, `Email`, `Phone`.

Example:

```
Site name: OrbitOps
Audience: operations teams
Tone: bold
Primary color: teal
CTA: Start a Trial
Design a SaaS landing page for workflow automation with clear value propositions.
```

## Agent workflow (single prompt, internal refinement)

1. Accept a single prompt and parse it into structured inputs.
2. Generate an initial site specification and content draft.
3. Run evaluation rules to detect missing sections or fields.
4. Auto-fix any issues (up to two refinement passes).
5. Render HTML/CSS/JS once the spec is valid.

## Prompt-to-site pipeline

1. **Prompt parsing** → detect brand name, audience, tone, and colors.  
2. **Content generation** → fill section copy and CTA.  
3. **Layout selection** → choose a stacked or split hero layout.  
4. **Component assembly** → build the ordered section list.  
5. **Styling** → inject a consistent theme and responsive layout.  

## Evaluation rules

The agent self-corrects until:

- A hero and contact section exist.
- At least four sections are present.
- All sections have unique IDs and titles.
- Brand name and CTA are non-empty.

If any rule fails, defaults are applied and sections are added automatically.

## CLI usage

```
npm install
npm start -- --prompt "Build a modern portfolio for a designer" --out ./site
```

Or use a prompt file:

```
npm start -- --prompt-file ./examples/prompt.txt --out ./site
```

Dry run (print the spec as JSON):

```
npm start -- --prompt "Modern SaaS site" --dry-run
```

## Validation and sample prompts

- Run the self-test:

```
npm test
```

- Use the curated examples in `examples/sample-prompts.md`.
