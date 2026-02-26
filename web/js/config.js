// ── Configuration ──────────────────────────────────────────
const API_BASE_URL = (() => {
	const { protocol, hostname, origin } = window.location;

	// Local dev server (http://127.0.0.1:3000) serves both UI and API
	if (protocol === 'http:' && (hostname === '127.0.0.1' || hostname === 'localhost')) {
		return origin;
	}

	// If opened directly as file://, default to local backend
	if (protocol === 'file:') {
		return 'http://127.0.0.1:3000';
	}

	// Deployed fallback
	return 'https://njbbl68078.execute-api.us-east-1.amazonaws.com/Prod';
})();
