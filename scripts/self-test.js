'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSite } = require('../src/builder');

const prompt = `Site name: Northwind Studio
Audience: fast-moving startups
Tone: modern
Primary color: indigo
CTA: Book a Demo
Create a sleek agency homepage that feels confident and clear.`;

const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'web-builder-agent-'));
const result = buildSite(prompt, { outputDir });

const requiredFiles = ['index.html', 'styles.css', 'app.js'];
for (const file of requiredFiles) {
  const fullPath = path.join(outputDir, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing output file: ${file}`);
  }
}

const html = fs.readFileSync(path.join(outputDir, 'index.html'), 'utf8');
if (!html.includes('id="hero"') || !html.includes('id="contact"')) {
  throw new Error('Expected hero and contact sections to be present.');
}

if (!result.spec.meta.cta || !result.spec.meta.name) {
  throw new Error('Spec missing required meta fields.');
}

process.stdout.write('Self-test passed.\n');
