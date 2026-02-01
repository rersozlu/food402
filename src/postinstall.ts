#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Find project root (where npm install was run)
const projectRoot = process.env.INIT_CWD || process.cwd();
const mcpJsonPath = join(projectRoot, '.mcp.json');
const codexConfigPath = join(projectRoot, '.codex', 'config.toml');

const food402Config = {
  command: "node",
  args: ["./node_modules/food402/dist/src/index.js"],
  env: {
    TGO_EMAIL: "your-email@example.com",
    TGO_PASSWORD: "your-password"
  }
};

const codexConfigBlock = [
  '[mcp_servers.food402]',
  'command = "node"',
  'args = ["./node_modules/food402/dist/src/index.js"]',
  '',
  '[mcp_servers.food402.env]',
  'TGO_EMAIL = "your-email@example.com"',
  'TGO_PASSWORD = "your-password"'
].join('\n');

let config: { mcpServers: Record<string, unknown> } = { mcpServers: {} };

if (existsSync(mcpJsonPath)) {
  try {
    config = JSON.parse(readFileSync(mcpJsonPath, 'utf-8'));
    if (!config.mcpServers) config.mcpServers = {};
  } catch {
    // Invalid JSON, start fresh
  }
}

if (config.mcpServers.food402) {
  console.log('✓ food402 already present in .mcp.json');
} else {
  config.mcpServers.food402 = food402Config;
  writeFileSync(mcpJsonPath, JSON.stringify(config, null, 2) + '\n');
  console.log('✓ Added food402 to .mcp.json');
  console.log('→ Update TGO_EMAIL and TGO_PASSWORD in .mcp.json with your credentials');
}

let codexConfig = '';
if (existsSync(codexConfigPath)) {
  try {
    codexConfig = readFileSync(codexConfigPath, 'utf-8');
  } catch {
    codexConfig = '';
  }
}

if (codexConfig.includes('[mcp_servers.food402]')) {
  console.log('✓ food402 already present in .codex/config.toml');
} else {
  mkdirSync(join(projectRoot, '.codex'), { recursive: true });
  let nextCodexConfig = codexConfig;
  if (nextCodexConfig.length && !nextCodexConfig.endsWith('\n')) {
    nextCodexConfig += '\n';
  }
  if (nextCodexConfig.length) {
    nextCodexConfig += '\n';
  }
  nextCodexConfig += codexConfigBlock + '\n';
  writeFileSync(codexConfigPath, nextCodexConfig);
  console.log('✓ Added food402 to .codex/config.toml');
  console.log('→ Update TGO_EMAIL and TGO_PASSWORD in .codex/config.toml with your credentials');
}
