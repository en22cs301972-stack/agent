#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { buildSite } = require('../src/builder');

const args = process.argv.slice(2);
const flags = new Map();

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    const key = arg.replace(/^--/, '');
    const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
    flags.set(key, value);
    if (value !== true) {
      i += 1;
    }
  } else if (arg.startsWith('-')) {
    const key = arg.replace(/^-/, '');
    const value = args[i + 1] && !args[i + 1].startsWith('-') ? args[i + 1] : true;
    flags.set(key, value);
    if (value !== true) {
      i += 1;
    }
  }
}

if (flags.has('help') || flags.has('h')) {
  process.stdout.write(
    [
      'web-builder-agent',
      '',
      'Usage:',
      '  web-builder-agent --prompt "your prompt" --out ./site',
      '  web-builder-agent --prompt-file ./prompt.txt --out ./site',
      '',
      'Options:',
      '  --prompt         Single prompt text describing the website',
      '  --prompt-file    Path to a text file containing the prompt',
      '  --out            Output directory (default: ./site)',
      '  --dry-run        Print the generated site spec as JSON',
      '  --help           Show this help text',
      ''
    ].join('\n')
  );
  process.exit(0);
}

const promptArg = flags.get('prompt') || flags.get('p');
const promptFile = flags.get('prompt-file');
const outputDir = path.resolve(process.cwd(), flags.get('out') || 'site');
const dryRun = Boolean(flags.get('dry-run'));

let prompt = '';
if (promptFile) {
  prompt = fs.readFileSync(path.resolve(process.cwd(), promptFile), 'utf8');
} else if (promptArg && typeof promptArg === 'string') {
  prompt = promptArg;
}

if (!prompt || !prompt.trim()) {
  process.stderr.write('A prompt is required. Use --prompt or --prompt-file.\n');
  process.exit(1);
}

const result = buildSite(prompt, { outputDir, dryRun });

if (dryRun) {
  process.stdout.write(`${JSON.stringify(result.spec, null, 2)}\n`);
} else {
  process.stdout.write(
    [
      `Site generated in ${result.outputDir}`,
      `Files: ${result.files.join(', ')}`
    ].join('\n') + '\n'
  );
}
