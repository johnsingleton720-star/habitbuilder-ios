
// Run this after Codemagic build finishes and appears in TestFlight.
// Usage: node attach-and-submit.mjs
import { SignJWT, importPKCS8 } from 'jose';
import { readFileSync } from 'fs';

const KEY_ID = 'N238N8X29X';
const ISSUER_ID = 'ac384630-827f-47ff-8406-3abc1dc90b6c';
const APP_ID = '6759849704';
const VERSION_ID = 'c4d6a202-026d-4fdc-9287-ca04db0029a3'; // v1.2.6 draft
const keyPem = readFileSync('/tmp/asc-key.p8', 'utf8');

const WHATS_NEW = `• Improved app stability and performance
• Enhanced AI coaching responses
• Better habit tracking experience
• Bug fixes and improvements`;

async function makeToken() {
  const pk = await importPKCS8(keyPem, 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })
    .setIssuedAt().setIssuer(ISSUER_ID).setAudience('appstoreconnect-v1').setExpirationTime('20m')
    .sign(pk);
}
async function req(method, path, body, token) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (method === 'DELETE' && r.status === 204) return null;
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

const token = await makeToken();

// 1. Find the newest VALID build for app version 1.2.6
console.log('Looking for a valid build for app version 1.2.6...');
const builds = await req('GET', `/v1/apps/${APP_ID}/builds?limit=20&fields[builds]=version,processingState,uploadedDate&include=preReleaseVersion`, null, token);

let targetBuild = null;
let newestDate = null;
for (const b of builds.data || []) {
  const preRelId = b.relationships?.preReleaseVersion?.data?.id;
  const appVer = builds.included?.find(i => i.id === preRelId)?.attributes?.version;
  const uploaded = new Date(b.attributes.uploadedDate);
  console.log(`  Build #${b.attributes.version} | appVer: ${appVer} | state: ${b.attributes.processingState} | uploaded: ${b.attributes.uploadedDate}`);
  if (appVer === '1.2.6' && b.attributes.processingState === 'VALID') {
    if (!newestDate || uploaded > newestDate) {
      targetBuild = b;
      newestDate = uploaded;
    }
  }
}

if (!targetBuild) {
  console.log('\n⚠️  No valid 1.2.6 build found yet.');
  console.log('Please wait for Codemagic to finish and run this script again.');
  process.exit(1);
}
console.log(`\n✓ Found build #${targetBuild.attributes.version} (${targetBuild.id})`);

// 2. Add What's New text
console.log("Adding What's New text...");
const locs = await req('GET', `/v1/appStoreVersions/${VERSION_ID}/appStoreVersionLocalizations`, null, token);
const locId = locs.data?.[0]?.id;
if (locId) {
  await req('PATCH', `/v1/appStoreVersionLocalizations/${locId}`, {
    data: { id: locId, type: 'appStoreVersionLocalizations', attributes: { whatsNew: WHATS_NEW } }
  }, token);
  console.log("✓ What's New saved");
}

// 3. Attach build to v1.2.6 draft
console.log(`Attaching build #${targetBuild.attributes.version} to v1.2.6...`);
await req('PATCH', `/v1/appStoreVersions/${VERSION_ID}`, {
  data: { id: VERSION_ID, type: 'appStoreVersions',
    relationships: { build: { data: { id: targetBuild.id, type: 'builds' } } } }
}, token);
console.log('✓ Build attached');

await new Promise(r => setTimeout(r, 3000));

// 4. Create review submission
console.log('Creating review submission...');
const sub = await req('POST', '/v1/reviewSubmissions', {
  data: {
    type: 'reviewSubmissions',
    attributes: { platform: 'IOS' },
    relationships: { app: { data: { id: APP_ID, type: 'apps' } } }
  }
}, token);
const subId = sub.data.id;
console.log(`✓ Submission created: ${subId}`);

// 5. Add version item to submission
console.log('Adding version to submission...');
await req('POST', '/v1/reviewSubmissionItems', {
  data: {
    type: 'reviewSubmissionItems',
    relationships: {
      reviewSubmission: { data: { id: subId, type: 'reviewSubmissions' } },
      appStoreVersion: { data: { id: VERSION_ID, type: 'appStoreVersions' } }
    }
  }
}, token);
console.log('✓ Version added');

await new Promise(r => setTimeout(r, 2000));

// 6. Submit for review
console.log('Submitting for review...');
await req('PATCH', `/v1/reviewSubmissions/${subId}`, {
  data: { id: subId, type: 'reviewSubmissions', attributes: { submitted: true } }
}, token);

console.log('\n✅ v1.2.6 submitted for App Store review!');
console.log('Track at: https://appstoreconnect.apple.com/apps/6759849704/appstore');
console.log('Apple typically reviews within 24-48 hours.');
