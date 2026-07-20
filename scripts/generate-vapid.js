#!/usr/bin/env node
// Generates a VAPID key pair for Web Push and prints the env vars to set.
// Run once:  npm install  &&  npm run generate-vapid
// Then paste the three values into Vercel → Project → Settings → Environment
// Variables (and into a local .env for `vercel dev`).

const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();

console.log('\nVAPID keys generated. Add these to your environment:\n');
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('VAPID_SUBJECT=mailto:you@example.com   # your contact email');
console.log('\nKeep VAPID_PRIVATE_KEY secret — never commit it.\n');
