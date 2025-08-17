import 'server-only';
import { NextResponse } from 'next/server';
import { appendUserMessage, readChatState, clearChat } from '@/lib/sheets';

export async function GET() {
	try {
		const state = await readChatState();
		return NextResponse.json(state, { status: 200 });
	} catch (error) {
		return NextResponse.json({ error: 'Failed to read chat state' }, { status: 500 });
	}
}

export async function POST(req: Request) {
	try {
		const { message, action } = await req.json();
		if (action === 'clear') {
			await clearChat();
			return NextResponse.json({ ok: true }, { status: 200 });
		}
		if (typeof message !== 'string' || !message.trim()) {
			return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
		}

		await appendUserMessage(message.trim());

		return NextResponse.json({ ok: true }, { status: 200 });
	} catch (error) {
		return NextResponse.json({ error: 'Failed to post message' }, { status: 500 });
	}
}


