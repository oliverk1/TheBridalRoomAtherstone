// src/lib/googleAuth.ts
import * as jose from 'jose';

export async function getGoogleAccessToken(clientEmail: string, privateKeyRaw: string): Promise<string> {
  const formattedKey = privateKeyRaw.replace(/\\n/g, '\n');
  const privateKey = await jose.importPKCS8(formattedKey, 'RS256');

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new jose.SignJWT({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .sign(privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google OAuth failure: ${errorText}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}