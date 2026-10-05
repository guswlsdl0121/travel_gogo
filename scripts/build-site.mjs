import { cpSync, mkdirSync, writeFileSync } from 'node:fs';

const apiKey = process.env.GOOGLE_MAPS_API_KEY;
if (!apiKey) {
  throw new Error('GOOGLE_MAPS_API_KEY 환경 변수가 필요합니다.');
}

mkdirSync('dist', { recursive: true });
cpSync('index.html', 'dist/index.html');
cpSync('src', 'dist/src', { recursive: true });
writeFileSync(
  'dist/config.local.js',
  `window.TRIP_CONFIG = { googleMapsApiKey: ${JSON.stringify(apiKey)} };\n`,
  'utf8'
);
console.log('Static site prepared in dist/.');
