# 🌐 Personal Web Builder Agent

> **Give one prompt → get a complete, production-ready website.**  
> No back-and-forth. No re-prompting. Just describe what you want and the agent handles the rest.

---

## ✨ How it works

The agent runs a **three-stage internal pipeline** — you only ever type your description once:

```
Your Prompt
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 1 — PLAN                                             │
│  Architect pages, sections, colours, fonts & file list      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 2 — BUILD                                            │
│  Generate every HTML / CSS / JS file in full                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 3 — REVIEW & FIX                                     │
│  Self-critique, patch bugs, improve design quality          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
              📁 output/site_<timestamp>/
                  index.html  style.css  script.js …
```

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Set your OpenAI API key

```bash
cp .env.example .env
# Edit .env and add your key
nano .env
```

Or export it inline:

```bash
export OPENAI_API_KEY="sk-..."
```

### 3. Build your website

```bash
# Pass your description as a command-line argument
python web_builder_agent.py "A modern portfolio for a data scientist named Arjun with dark theme"

# Or run interactively (the agent will ask you once)
python web_builder_agent.py
```

### 4. Preview it

```bash
# Automatically opens the latest generated site in your browser
python preview_server.py

# Or point to a specific output folder
python preview_server.py output/site_20240101_120000

# Custom port
python preview_server.py --port 8080
```

---

## 💡 Example prompts

```
"A landing page for a coffee shop called 'Bean & Brew' with warm earthy tones,
a menu section, gallery and a contact form"

"A personal blog for a travel photographer with a grid of photo cards,
a hero banner and an about page"

"A SaaS product page for a project management tool with a pricing table,
feature highlights, testimonials and a call-to-action"

"A simple resume / CV site for a software engineer with skills, experience
and project sections — dark mode, minimalist style"

"An e-commerce homepage for a handmade jewellery store with product grid,
newsletter signup and Instagram feed placeholder"
```

---

## 📁 Output structure

```
output/
└── site_20240428_152301/   ← timestamped folder per run
    ├── plan.json           ← the architect's plan (for reference)
    ├── index.html
    ├── style.css
    ├── script.js
    └── ... (any additional pages / assets the agent decides to create)
```

---

## ⚙️ Configuration

All settings can be provided via `.env` or environment variables:

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | *(required)* | Your OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o` | Model to use (`gpt-4o` gives the best results) |
| `OUTPUT_DIR` | `output` | Directory where generated sites are saved |
| `PREVIEW_PORT` | `8000` | Port used by `preview_server.py` |

---

## 🛠️ Requirements

- Python 3.10+
- OpenAI API key (paid account recommended for `gpt-4o`)

```
openai>=1.0.0
rich>=13.0.0    # beautiful terminal output (optional but recommended)
```

---

## 📝 Notes

- The generated site uses only **HTML5, CSS3 and Vanilla JavaScript** by default — no build step required.
- Placeholder images are served from [picsum.photos](https://picsum.photos) and icons from [Font Awesome 6](https://fontawesome.com).
- Fonts are loaded from [Google Fonts](https://fonts.google.com).
- Each run creates a new timestamped folder so you never lose a previous generation.
- If a run fails partway through, partial output is still saved so you can inspect what was generated.