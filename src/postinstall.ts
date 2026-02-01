#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Find project root (where npm install was run)
const projectRoot = process.env.INIT_CWD || process.cwd();
const mcpJsonPath = join(projectRoot, '.mcp.json');

const food402Config = {
  command: "node",
  args: ["./node_modules/food402/dist/src/index.js"],
  env: {
    TGO_EMAIL: "your-email@example.com",
    TGO_PASSWORD: "your-password"
  }
};

let config: { mcpServers: Record<string, unknown> } = { mcpServers: {} };

if (existsSync(mcpJsonPath)) {
  try {
    config = JSON.parse(readFileSync(mcpJsonPath, 'utf-8'));
    if (!config.mcpServers) config.mcpServers = {};
  } catch {
    // Invalid JSON, start fresh
  }
}

config.mcpServers.food402 = food402Config;

writeFileSync(mcpJsonPath, JSON.stringify(config, null, 2) + '\n');
console.log('✓ Added food402 to .mcp.json');
console.log('→ Update TGO_EMAIL and TGO_PASSWORD in .mcp.json with your credentials');
