// Assemble la version en ligne : une seule page HTML, React et Recharts chargés depuis un CDN.
// Usage : npm run build:single && node scripts/build-online.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const js = readFileSync('dist-single/app.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync('dist-single/app.css', 'utf8');
const html = `<title>Luffy Performance</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:ital,wght@0,600;0,700;1,700&display=swap">
<style>${css}</style>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prop-types@15.8.1/prop-types.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/recharts@2.12.7/umd/Recharts.js"></script>
<script type="module">${js}</script>
`;
mkdirSync('online', { recursive: true });
writeFileSync('online/luffy-performance.html', html);
console.log('online/luffy-performance.html', (html.length / 1024).toFixed(0) + ' Ko');
