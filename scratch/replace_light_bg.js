const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace exact occurrences
  content = content.replace(/#F2F2F7/g, '#F4F4F6');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.expo') {
        walkDir(fullPath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      replaceInFile(fullPath);
    }
  }
}

const rootDir = path.resolve(__dirname, '..');
console.log(`Starting replacement in: ${rootDir}`);
walkDir(path.join(rootDir, 'app'));
walkDir(path.join(rootDir, 'components'));
walkDir(path.join(rootDir, 'constants'));
console.log('Replacement complete!');
