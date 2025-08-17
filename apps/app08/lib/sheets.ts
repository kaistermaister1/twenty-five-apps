import 'server-only';
import { google } from 'googleapis';

type SheetsClient = {
	sheets: ReturnType<typeof google.sheets>;
	sheetId: string;
	sheetName: string;
};

function getEnv(name: string, optional = false): string {
	const value = process.env[name];
	if (!value && !optional) {
		throw new Error(`Missing required env var: ${name}`);
	}
	return value || '';
}

let cachedClient: SheetsClient | null = null;

export function getSheetsClient(): SheetsClient {
	if (cachedClient) return cachedClient;

	const clientEmail = getEnv('GOOGLE_SHEETS_CLIENT_EMAIL');
	const rawKey = getEnv('GOOGLE_SHEETS_PRIVATE_KEY');
	const privateKey = rawKey.includes('BEGIN PRIVATE KEY') ? rawKey.replace(/\\n/g, '\n') : rawKey;
	const sheetId = getEnv('GOOGLE_SHEET_ID');
	const sheetName = getEnv('GOOGLE_SHEET_NAME', true) || 'Sheet1';

	const auth = new google.auth.JWT({
		email: clientEmail,
		key: privateKey,
		scopes: ['https://www.googleapis.com/auth/spreadsheets'],
	});

	const sheets = google.sheets({ version: 'v4', auth });

	cachedClient = { sheets, sheetId, sheetName };
	return cachedClient;
}

export async function readChatState() {
	const { sheets, sheetId, sheetName } = getSheetsClient();

	const [colA, colB] = await Promise.all([
		sheets.spreadsheets.values.get({
			spreadsheetId: sheetId,
			range: `${sheetName}!A:A`,
		}),
		sheets.spreadsheets.values.get({
			spreadsheetId: sheetId,
			range: `${sheetName}!B:B`,
		}),
	]);

	const aValues = (colA.data.values || []).map((row) => (row ? (row[0] as string) : ''));
	const bValues = (colB.data.values || []).map((row) => (row ? (row[0] as string) : ''));

	const maxLen = Math.max(aValues.length, bValues.length);
	const pairs = Array.from({ length: maxLen }, (_, idx) => ({
		user: aValues[idx] || '',
		assistant: bValues[idx] || '',
	}));

	return { messages: pairs } as const;
}

export async function appendUserMessage(userMessage: string) {
	const { sheets, sheetId, sheetName } = getSheetsClient();
	if (!userMessage.trim()) return;

	await sheets.spreadsheets.values.append({
		spreadsheetId: sheetId,
		range: `${sheetName}!A:B`,
		valueInputOption: 'USER_ENTERED',
		requestBody: {
			values: [[userMessage, '']],
		},
	});
}

export async function setTyping(value: string) {
	const { sheets, sheetId, sheetName } = getSheetsClient();
	await sheets.spreadsheets.values.update({
		spreadsheetId: sheetId,
		range: `${sheetName}!C1`,
		valueInputOption: 'RAW',
		requestBody: { values: [[value]] },
	});
}

export async function updateLastAssistantMessage(text: string) {
	const { sheets, sheetId, sheetName } = getSheetsClient();
	const [colA, colB] = await Promise.all([
		sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${sheetName}!A:A` }),
		sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${sheetName}!B:B` }),
	]);

	const aValues = (colA.data.values || []).map((row) => row[0] as string);
	const bValues = (colB.data.values || []).map((row) => row[0] as string | undefined);

	let targetRow = -1;
	for (let i = aValues.length - 1; i >= 0; i--) {
		const hasUser = !!(aValues[i] && aValues[i].trim());
		const hasAssistant = !!(bValues[i] && bValues[i]!.trim());
		if (hasUser) {
			targetRow = hasAssistant ? -1 : i + 1; // Sheets rows are 1-based
			if (targetRow !== -1) break;
		}
	}

	if (targetRow === -1) {
		throw new Error('No pending user message row found to update.');
	}

	await sheets.spreadsheets.values.update({
		spreadsheetId: sheetId,
		range: `${sheetName}!B${targetRow}`,
		valueInputOption: 'USER_ENTERED',
		requestBody: { values: [[text]] },
	});

	// typing state removed — UI infers from empty assistant cell
}

export async function clearChat() {
	const { sheets, sheetId, sheetName } = getSheetsClient();
	await Promise.all([
		sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: `${sheetName}!A:B` }),
		sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: `${sheetName}!C1` }),
	]);
}


