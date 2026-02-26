// ── Configuration ──────────────────────────────────────────
const API_BASE_URL = (() => {
	const { protocol, hostname, origin } = window.location;

	// TEMPORARY: Always use deployed API to test AgentCore Runtime
	console.log('[CONFIG] Using deployed API: https://njbbl68078.execute-api.us-east-1.amazonaws.com/Prod');
	return 'https://njbbl68078.execute-api.us-east-1.amazonaws.com/Prod';

	// Local dev server (http://127.0.0.1:3000) serves both UI and API
	// if (protocol === 'http:' && (hostname === '127.0.0.1' || hostname === 'localhost')) {
	// 	console.log('[CONFIG] Using local API:', origin);
	// 	return origin;
	// }

	// If opened directly as file://, default to local backend
	// if (protocol === 'file:') {
	// 	console.log('[CONFIG] Using local API (file protocol): http://127.0.0.1:3000');
	// 	return 'http://127.0.0.1:3000';
	// }

	// Deployed fallback
	// console.log('[CONFIG] Using deployed API: https://njbbl68078.execute-api.us-east-1.amazonaws.com/Prod');
	// return 'https://njbbl68078.execute-api.us-east-1.amazonaws.com/Prod';
})();

console.log('[CONFIG] API_BASE_URL set to:', API_BASE_URL);
