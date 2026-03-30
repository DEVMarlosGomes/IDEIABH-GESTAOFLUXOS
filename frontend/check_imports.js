const fs = require('fs');
const path = require('path');

function checkImports(dir, srcDir) {
  const files = fs.readdirSync(dir);
  const errors = [];

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (file === 'node_modules') continue;
      errors.push(...checkImports(fullPath, srcDir));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const importRegex = /from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.')) {
          const base = path.resolve(path.dirname(fullPath), importPath);
          const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '.css', '/index.js', '/index.jsx'];
          let exists = false;
          for (const ext of extensions) {
            try {
              fs.accessSync(base + ext);
              exists = true;
              break;
            } catch {}
          }
          if (!exists) {
            errors.push(fullPath.replace(srcDir, '') + ' -> ' + importPath);
          }
        }
      }
    }
  }
  return errors;
}

const srcDir = path.join(__dirname, 'src');
const errors = checkImports(srcDir, srcDir);
if (errors.length > 0) {
  console.log('BROKEN IMPORTS:');
  errors.forEach(e => console.log(e));
} else {
  console.log('All imports OK');
}
