const fs = require('fs');
const path = require('path');

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (['node_modules', '.git', 'dist'].some(x => p.includes(x))) continue;
    
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('package.json')) {
      const c = fs.readFileSync(p, 'utf8');
      if (c.includes('"name": "@cracky-ai/"') || c.includes('"name": "@cracky-ai"')) {
        // Construct the correct name from the path!
        // path is something like: packages/infrastructure/storage/memory/package.json
        // or apps/cli/package.json
        const parts = p.split(path.sep);
        // remove 'package.json'
        parts.pop();
        let correctName = "";
        if (parts[0] === 'apps') {
          correctName = `@cracky-ai/${parts.slice(1).join('-')}`;
        } else if (parts[0] === 'packages') {
          correctName = `@cracky-ai/${parts.slice(1).join('-')}`;
        } else if (parts[0] === 'plugins') {
          correctName = `@cracky-ai/plugin-${parts.slice(1).join('-')}`;
        } else if (parts[0] === 'tools') {
          correctName = `@cracky-ai/tool-${parts.slice(1).join('-')}`;
        }
        
        if (correctName) {
          const n = c.replace(/"name": "@cracky-ai\/?([^\"]*)"/, `"name": "${correctName}"`);
          fs.writeFileSync(p, n);
          console.log(`Fixed ${p} -> ${correctName}`);
        }
      }
    }
  }
}

walk('.');
