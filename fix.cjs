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
      const n = c.replace(/"@cracky-ai-([^"]*)"/g, '"@cracky-ai/$1"');
      if (c !== n) fs.writeFileSync(p, n);
    } else if (/\.(ts|js|tsx|mts|cts)$/.test(p)) {
      const c = fs.readFileSync(p, 'utf8');
      const n = c.replace(/@cracky-ai-([^"'\`\s]+)/g, '@cracky-ai/$1');
      if (c !== n) fs.writeFileSync(p, n);
    }
  }
}

walk('.');
