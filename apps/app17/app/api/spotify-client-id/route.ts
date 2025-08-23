import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  const id = process.env.SPOTIFY_CLIENT_ID || '';
  return new NextResponse(JSON.stringify({ clientId: id }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=3600, max-age=60',
    },
  });
}


