import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID || '';
    if (!clientId) return NextResponse.json({ error: 'Missing SPOTIFY_CLIENT_ID' }, { status: 500 });
    const body = await req.json().catch(() => ({} as any));
    const { code_challenge, code_verifier, redirect_uri, scope } = body || {};
    if ((!code_challenge && !code_verifier) || !redirect_uri) {
      return NextResponse.json({ error: 'Provide code_challenge or code_verifier and a redirect_uri' }, { status: 400 });
    }
    let challenge = code_challenge as string | undefined;
    if (!challenge && code_verifier) {
      const hash = crypto.createHash('sha256').update(code_verifier).digest();
      challenge = hash.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri,
      code_challenge_method: 'S256',
      code_challenge: challenge!,
      scope: scope || 'user-read-email',
    });
    const url = 'https://accounts.spotify.com/authorize?' + params.toString();
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}


