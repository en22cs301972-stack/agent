#!/usr/bin/env python3
"""
Personal Web Builder Agent
===========================
Give one prompt → get a complete, production-ready website.

The agent runs an internal three-step pipeline so you never have to iterate:
  1. PLAN   – Architect the pages, sections and tech choices
  2. BUILD  – Generate all HTML / CSS / JS files in full
  3. REVIEW – Self-critique, patch bugs, improve quality

Usage
-----
  python web_builder_agent.py "A portfolio site for a data-scientist named Arjun"

  # or interactively
  python web_builder_agent.py

Environment variables
---------------------
  OPENAI_API_KEY   – Required  (OpenAI)
  OPENAI_MODEL     – Optional, defaults to gpt-4o
  OUTPUT_DIR       – Optional, defaults to ./output
"""

import os
import sys
import re
import json
import shutil
import textwrap
from pathlib import Path
from datetime import datetime

# ── optional rich terminal output ──────────────────────────────────────────────
try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich.syntax import Syntax
    from rich import print as rprint
    RICH = True
    console = Console()
except ImportError:
    RICH = False
    console = None

try:
    from openai import OpenAI
except ImportError:
    print("openai package not found. Install dependencies first:\n  pip install -r requirements.txt")
    sys.exit(1)

# ── constants ──────────────────────────────────────────────────────────────────
DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
DEFAULT_OUTPUT = os.getenv("OUTPUT_DIR", "output")

# ══════════════════════════════════════════════════════════════════════════════
# System prompts for each pipeline stage
# ══════════════════════════════════════════════════════════════════════════════

PLAN_SYSTEM = textwrap.dedent("""
You are a senior web architect.
Your job is to create a detailed PLAN for a website given a brief description.

Return ONLY valid JSON in this exact schema – no markdown fences, no extra text:
{
  "site_title": "...",
  "description": "...",
  "pages": [
    {
      "filename": "index.html",
      "title": "...",
      "sections": ["hero", "about", "..."]
    }
  ],
  "color_palette": {
    "primary": "#...",
    "secondary": "#...",
    "accent": "#...",
    "background": "#...",
    "text": "#..."
  },
  "fonts": {
    "heading": "...",
    "body": "..."
  },
  "features": ["responsive design", "smooth scrolling", "..."],
  "tech_stack": ["HTML5", "CSS3", "Vanilla JS"],
  "file_list": ["index.html", "style.css", "script.js", "..."]
}
""").strip()

BUILD_SYSTEM = textwrap.dedent("""
You are an expert full-stack web developer.
You will be given a website PLAN (JSON) and a user description.
Your job is to generate EVERY file in the file_list completely — no placeholders,
no "TODO" comments, no omissions.

Rules:
- Output ONLY the file contents, delimited exactly like this:

===FILE: filename.ext===
<complete file content here>
===END===

- Repeat the FILE/END block for each file.
- HTML must be valid HTML5 with semantic tags.
- CSS must use the exact colors and fonts from the plan; include responsive
  media queries (mobile-first).
- JS must be vanilla (no frameworks unless the plan specifies one).
- All internal links, script and stylesheet references must be correct.
- Images: use high-quality placeholder images from https://picsum.photos
  (e.g. <img src="https://picsum.photos/seed/hero/1200/600" alt="...">).
- Icons: use Font Awesome 6 Free CDN.
- Fonts: use Google Fonts CDN.
- The design must look professional, modern and polished.
- DO NOT truncate or shorten any file.
""").strip()

REVIEW_SYSTEM = textwrap.dedent("""
You are a meticulous web QA engineer and senior developer.
You will be given all generated website files and the original user description.

Your tasks:
1. Check for broken links, missing references, and JS errors.
2. Verify the design matches the user description.
3. Ensure mobile responsiveness.
4. Fix ANY issues you find.

Output the CORRECTED version of ALL files using the same delimiter format:

===FILE: filename.ext===
<complete corrected file content>
===END===

If a file is already perfect, output it unchanged inside the delimiters.
DO NOT omit any file. DO NOT truncate.
""").strip()


# ══════════════════════════════════════════════════════════════════════════════
# Helper utilities
# ══════════════════════════════════════════════════════════════════════════════

def _info(msg: str):
    if RICH:
        console.print(f"[cyan]ℹ[/cyan]  {msg}")
    else:
        print(f"[INFO] {msg}")

def _success(msg: str):
    if RICH:
        console.print(f"[green]✔[/green]  {msg}")
    else:
        print(f"[OK]   {msg}")

def _warn(msg: str):
    if RICH:
        console.print(f"[yellow]⚠[/yellow]  {msg}")
    else:
        print(f"[WARN] {msg}")

def _error(msg: str):
    if RICH:
        console.print(f"[red]✖[/red]  {msg}")
    else:
        print(f"[ERR]  {msg}")

def _heading(msg: str):
    if RICH:
        console.rule(f"[bold blue]{msg}[/bold blue]")
    else:
        print(f"\n{'─'*60}\n  {msg}\n{'─'*60}")


def _chat(client: OpenAI, system: str, user: str, *, model: str, label: str) -> str:
    """Call the OpenAI Chat API with a spinner."""
    if RICH:
        with Progress(
            SpinnerColumn(),
            TextColumn(f"[bold green]{label}…"),
            transient=True,
            console=console,
        ) as progress:
            progress.add_task("", total=None)
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user",   "content": user},
                ],
                temperature=0.4,
                max_tokens=16000,
            )
    else:
        print(f"  → {label}…")
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            temperature=0.4,
            max_tokens=16000,
        )
    return response.choices[0].message.content or ""


def _parse_files(raw: str) -> dict[str, str]:
    """
    Parse the FILE/END delimited output into {filename: content}.
    Handles slight variations (e.g. triple backtick fences inside).
    """
    pattern = re.compile(
        r"===FILE:\s*(.+?)\s*===\s*(.*?)\s*===END===",
        re.DOTALL,
    )
    files: dict[str, str] = {}
    for match in pattern.finditer(raw):
        fname = match.group(1).strip()
        content = match.group(2).strip()
        files[fname] = content
    return files


def _write_files(files: dict[str, str], output_dir: Path) -> list[Path]:
    """Write parsed files to disk, creating subdirectories as needed."""
    written: list[Path] = []
    for fname, content in files.items():
        dest = output_dir / fname
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(content, encoding="utf-8")
        written.append(dest)
    return written


def _files_as_text(files: dict[str, str]) -> str:
    """Serialize a file dict back to the FILE/END format for the review prompt."""
    parts = []
    for fname, content in files.items():
        parts.append(f"===FILE: {fname}===\n{content}\n===END===")
    return "\n\n".join(parts)


# ══════════════════════════════════════════════════════════════════════════════
# Main pipeline
# ══════════════════════════════════════════════════════════════════════════════

def build_website(user_prompt: str, *, model: str, output_dir: Path) -> Path:
    """
    Run the full 3-stage pipeline and return the output directory path.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        _error("OPENAI_API_KEY environment variable is not set.")
        _info("Copy .env.example → .env and add your key, then:\n  source .env")
        sys.exit(1)

    client = OpenAI(api_key=api_key)

    # ── prepare output directory ───────────────────────────────────────────
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    site_dir = output_dir / f"site_{timestamp}"
    site_dir.mkdir(parents=True, exist_ok=True)

    # ── STAGE 1: PLAN ──────────────────────────────────────────────────────
    _heading("Stage 1 — Planning")
    plan_raw = _chat(
        client, PLAN_SYSTEM,
        f"Website description:\n{user_prompt}",
        model=model,
        label="Architecting your website",
    )

    # Strip markdown fences if the model added them
    plan_raw = re.sub(r"^```(?:json)?\s*", "", plan_raw, flags=re.MULTILINE)
    plan_raw = re.sub(r"\s*```$", "", plan_raw, flags=re.MULTILINE)

    try:
        plan = json.loads(plan_raw)
        _success(f"Plan created — {len(plan.get('file_list', []))} files, "
                 f"{len(plan.get('pages', []))} page(s)")
        if RICH:
            console.print(Panel(
                json.dumps(plan, indent=2),
                title="[bold]Website Plan[/bold]",
                border_style="blue",
                expand=False,
            ))
        # Save the plan for reference
        (site_dir / "plan.json").write_text(json.dumps(plan, indent=2), encoding="utf-8")
    except json.JSONDecodeError as exc:
        _warn(f"Could not parse plan JSON ({exc}). Proceeding with raw plan.")
        plan = {"raw": plan_raw}
        (site_dir / "plan.txt").write_text(plan_raw, encoding="utf-8")

    # ── STAGE 2: BUILD ─────────────────────────────────────────────────────
    _heading("Stage 2 — Building")
    build_prompt = (
        f"User description:\n{user_prompt}\n\n"
        f"Website Plan (JSON):\n{json.dumps(plan, indent=2)}"
    )
    build_raw = _chat(
        client, BUILD_SYSTEM, build_prompt,
        model=model,
        label="Generating all website files",
    )

    files = _parse_files(build_raw)
    if not files:
        _warn("Could not parse file delimiters. Saving raw build output.")
        (site_dir / "build_raw.txt").write_text(build_raw, encoding="utf-8")
    else:
        _success(f"Generated {len(files)} file(s): {', '.join(files.keys())}")

    # ── STAGE 3: REVIEW & FIX ──────────────────────────────────────────────
    _heading("Stage 3 — Review & Fix")
    review_prompt = (
        f"Original user description:\n{user_prompt}\n\n"
        f"Generated files:\n\n{_files_as_text(files)}"
    )
    review_raw = _chat(
        client, REVIEW_SYSTEM, review_prompt,
        model=model,
        label="Reviewing and polishing",
    )

    reviewed_files = _parse_files(review_raw)
    if not reviewed_files:
        _warn("Review stage returned no parseable files. Using build output as-is.")
        reviewed_files = files

    _success(f"Review complete — {len(reviewed_files)} file(s) finalised")

    # ── WRITE TO DISK ──────────────────────────────────────────────────────
    _heading("Saving Files")
    written = _write_files(reviewed_files, site_dir)
    for p in written:
        _success(f"Saved: {p.relative_to(output_dir.parent)}")

    return site_dir


# ══════════════════════════════════════════════════════════════════════════════
# Entry point
# ══════════════════════════════════════════════════════════════════════════════

def main():
    # ── resolve prompt ─────────────────────────────────────────────────────
    if len(sys.argv) >= 2:
        user_prompt = " ".join(sys.argv[1:])
    else:
        if RICH:
            console.print(Panel(
                "[bold green]Personal Web Builder Agent[/bold green]\n"
                "Describe your website in plain English.\n"
                "The agent will plan, build and review it automatically.",
                border_style="green",
            ))
        else:
            print("=" * 60)
            print("  Personal Web Builder Agent")
            print("  Describe your website in plain English.")
            print("=" * 60)
        user_prompt = input("\n🌐  What website do you want to build?\n> ").strip()
        if not user_prompt:
            _error("No description provided. Exiting.")
            sys.exit(1)

    # ── load .env if present ───────────────────────────────────────────────
    env_file = Path(".env")
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())

    model = os.getenv("OPENAI_MODEL", DEFAULT_MODEL)
    output_dir = Path(os.getenv("OUTPUT_DIR", DEFAULT_OUTPUT))

    if RICH:
        console.print(Panel(
            f"[bold]{user_prompt}[/bold]",
            title="[green]Your Prompt[/green]",
            border_style="green",
        ))

    _info(f"Model : {model}")
    _info(f"Output: {output_dir.resolve()}")

    # ── run pipeline ───────────────────────────────────────────────────────
    site_dir = build_website(user_prompt, model=model, output_dir=output_dir)

    # ── final message ──────────────────────────────────────────────────────
    _heading("Done! 🎉")
    index = site_dir / "index.html"
    if index.exists():
        if RICH:
            console.print(Panel(
                f"[bold green]Your website is ready![/bold green]\n\n"
                f"📁  Folder : [cyan]{site_dir}[/cyan]\n"
                f"🌐  Open  : [cyan]{index}[/cyan]\n\n"
                f"Or run the preview server:\n"
                f"  [yellow]python preview_server.py {site_dir}[/yellow]",
                border_style="green",
            ))
        else:
            print(f"\n✔  Your website is ready!")
            print(f"   Folder : {site_dir}")
            print(f"   Open   : {index}")
            print(f"\n   Or run: python preview_server.py {site_dir}")
    else:
        _warn(f"index.html not found in {site_dir}. Check the output folder.")


if __name__ == "__main__":
    main()
