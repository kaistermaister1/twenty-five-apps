import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
	const id = process.env.SPOTIFY_CLIENT_ID || '';
	res.setHeader('Cache-Control', 'public, s-maxage=3600, max-age=60');
	res.status(200).json({ clientId: id });
}


