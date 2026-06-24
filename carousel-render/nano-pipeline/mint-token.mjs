// Mints a fresh Vertex access token from a Google OAuth refresh credential (adc.json).
// adc.json = the contents of ~/.config/gcloud/application_default_credentials.json
// (fields: client_id, client_secret, refresh_token). Writes token to gcp_token.txt.
import fs from 'node:fs';
const adc = JSON.parse(fs.readFileSync('adc.json', 'utf8'));
const body = new URLSearchParams({
  client_id: adc.client_id,
  client_secret: adc.client_secret,
  refresh_token: adc.refresh_token,
  grant_type: 'refresh_token',
});
const r = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body,
});
const j = await r.json().catch(() => ({}));
if (!j.access_token) { console.error('MINT FAIL', JSON.stringify(j).slice(0, 300)); process.exit(1); }
fs.writeFileSync('gcp_token.txt', j.access_token);
console.log('minted ok, expires_in', j.expires_in);
