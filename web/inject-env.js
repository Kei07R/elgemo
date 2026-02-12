// Build script: injects SIGNALING_URL env var into the HTML at deploy time.
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
fs.mkdirSync(distDir, { recursive: true });

let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

const signalingUrl = process.env.SIGNALING_URL || '';

// Inject env config before the closing </head> tag
const envScript = `<script>window.__ENV = { SIGNALING_URL: "${signalingUrl}" };</script>`;
html = html.replace('</head>', envScript + '\n</head>');

fs.writeFileSync(path.join(distDir, 'index.html'), html);
console.log(`Built with SIGNALING_URL = "${signalingUrl}"`);
