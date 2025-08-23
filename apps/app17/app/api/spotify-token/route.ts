import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const TOKEN_URL = 'https://accounts.spotify.com/api/token';

export async function POST(req: Request) {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID || '';
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Missing SPOTIFY_CLIENT_ID/SECRET' }, { status: 500 });
    }
    const body = await req.json();
    const { grant_type } = body || {};
    if (grant_type === 'authorization_code') {
      const { code, redirect_uri, code_verifier } = body || {};
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        client_id: clientId,
        code_verifier,
      });
      const res2 = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        },
        body: params,
      });
      const data = await res2.json();
      if (!res2.ok) return NextResponse.json(data, { status: res2.status });
      return NextResponse.json(data);
    }
    if (grant_type === 'refresh_token') {
      const { refresh_token } = body || {};
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
        client_id: clientId,
      });
      const res2 = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        },
        body: params,
      });
      const data = await res2.json();
      if (!res2.ok) return NextResponse.json(data, { status: res2.status });
      return NextResponse.json(data);
    }
    return NextResponse.json({ error: 'Unsupported grant_type' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}


