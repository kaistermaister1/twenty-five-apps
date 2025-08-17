import 'server-only';
import { NextResponse } from 'next/server';
import { updateLastAssistantMessage } from '@/lib/sheets';

export async function POST(req: Request) {
	try {
		const { text } = await req.json();
		if (typeof text !== 'string') {
			return NextResponse.json({ error: 'Invalid text' }, { status: 400 });
		}
		await updateLastAssistantMessage(text);
		return NextResponse.json({ ok: true });
	} catch (error) {
		return NextResponse.json({ error: 'Failed to set assistant message' }, { status: 500 });
	}
}


