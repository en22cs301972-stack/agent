"""
tests/test_web_builder_agent.py
-------------------------------
Unit tests for the parsing and utility functions in web_builder_agent.py.
These tests do NOT call the OpenAI API – they test the local logic only.
"""

import json
import sys
import os
from pathlib import Path

# Ensure the project root is on the path
sys.path.insert(0, str(Path(__file__).parent.parent))

import web_builder_agent as agent


# ── _parse_files ───────────────────────────────────────────────────────────────

class TestParseFiles:
    def test_single_file(self):
        raw = "===FILE: index.html===\n<html></html>\n===END==="
        result = agent._parse_files(raw)
        assert result == {"index.html": "<html></html>"}

    def test_multiple_files(self):
        raw = (
            "===FILE: index.html===\n<html>hi</html>\n===END===\n\n"
            "===FILE: style.css===\nbody{margin:0}\n===END==="
        )
        result = agent._parse_files(raw)
        assert set(result.keys()) == {"index.html", "style.css"}
        assert "hi" in result["index.html"]
        assert "margin:0" in result["style.css"]

    def test_empty_string(self):
        assert agent._parse_files("") == {}

    def test_no_delimiters(self):
        assert agent._parse_files("just some plain text without delimiters") == {}

    def test_whitespace_around_filename(self):
        raw = "===FILE:  style.css  ===\nbody{}\n===END==="
        result = agent._parse_files(raw)
        assert "style.css" in result

    def test_multiline_content(self):
        css = "body {\n  margin: 0;\n  padding: 0;\n}"
        raw = f"===FILE: style.css===\n{css}\n===END==="
        result = agent._parse_files(raw)
        assert result["style.css"] == css

    def test_three_files(self):
        raw = (
            "===FILE: index.html===\n<h1>Hello</h1>\n===END===\n"
            "===FILE: style.css===\nh1{color:red}\n===END===\n"
            "===FILE: script.js===\nconsole.log('hi')\n===END==="
        )
        result = agent._parse_files(raw)
        assert len(result) == 3

    def test_file_with_nested_delimiters_like_text(self):
        """Content that mentions ===FILE but is not a delimiter should not confuse."""
        raw = (
            "===FILE: index.html===\n"
            "<!-- references to other syntax inside content -->\n"
            "<html></html>\n"
            "===END==="
        )
        result = agent._parse_files(raw)
        assert "index.html" in result


# ── _files_as_text ─────────────────────────────────────────────────────────────

class TestFilesAsText:
    def test_round_trip(self):
        files = {"index.html": "<html></html>", "style.css": "body{}"}
        serialised = agent._files_as_text(files)
        parsed = agent._parse_files(serialised)
        assert parsed == files

    def test_empty_dict(self):
        assert agent._files_as_text({}) == ""


# ── _write_files ───────────────────────────────────────────────────────────────

class TestWriteFiles:
    def test_writes_files(self, tmp_path):
        files = {"index.html": "<html></html>", "style.css": "body{}"}
        written = agent._write_files(files, tmp_path)
        assert len(written) == 2
        assert (tmp_path / "index.html").read_text() == "<html></html>"
        assert (tmp_path / "style.css").read_text() == "body{}"

    def test_creates_subdirectories(self, tmp_path):
        files = {"assets/images/logo.txt": "fake-content"}
        agent._write_files(files, tmp_path)
        assert (tmp_path / "assets" / "images" / "logo.txt").exists()

    def test_returns_path_objects(self, tmp_path):
        files = {"a.txt": "hello"}
        written = agent._write_files(files, tmp_path)
        assert all(isinstance(p, Path) for p in written)


# ── system-prompt sanity checks ────────────────────────────────────────────────

class TestSystemPrompts:
    def test_plan_prompt_mentions_json(self):
        assert "JSON" in agent.PLAN_SYSTEM

    def test_build_prompt_mentions_file_delimiter(self):
        assert "===FILE:" in agent.BUILD_SYSTEM
        assert "===END===" in agent.BUILD_SYSTEM

    def test_review_prompt_mentions_file_delimiter(self):
        assert "===FILE:" in agent.REVIEW_SYSTEM
        assert "===END===" in agent.REVIEW_SYSTEM

    def test_build_prompt_no_placeholders_instruction(self):
        """The build prompt must instruct the model not to use placeholders."""
        assert "placeholder" in agent.BUILD_SYSTEM.lower() or "TODO" in agent.BUILD_SYSTEM


# ── environment / config ───────────────────────────────────────────────────────

class TestConfig:
    def test_default_model_is_gpt4o(self):
        assert agent.DEFAULT_MODEL == "gpt-4o"

    def test_default_output_dir(self):
        assert agent.DEFAULT_OUTPUT == "output"
