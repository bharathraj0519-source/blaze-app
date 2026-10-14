const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('--- BLAZEBYTE VERCEL UNIVERSAL BUILD ---');
console.log('Current working directory:', process.cwd());

if (fs.existsSync(path.join(process.cwd(), 'client', 'package.json'))) {
  console.log('Detected project root. Building inside client folder...');
  execSync('npm --prefix client run build', { stdio: 'inherit' });
  
  const clientDist = path.join(process.cwd(), 'client', 'dist');
  const rootDist = path.join(process.cwd(), 'dist');
  if (fs.existsSync(clientDist)) {
    fs.cpSync(clientDist, rootDist, { recursive: true });
    console.log('Synced dist to root directory successfully.');
  }
} else {
  console.log('Detected client directory. Building directly with vite...');
  execSync('npx vite build', { stdio: 'inherit' });
}
console.log('--- BUILD COMPLETE ---');
