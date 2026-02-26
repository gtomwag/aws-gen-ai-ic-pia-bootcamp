// ── Configuration ──────────────────────────────────────────
const API_BASE_URL = (() => {
	const { protocol, hostname, origin, port } = window.location;

	// Local full-stack dev server where UI + API share origin
	if (
		protocol === 'http:' &&
		(hostname === '127.0.0.1' || hostname === 'localhost') &&
		port === '3000'
	) {
		return origin;
	}

	// If opened directly as file://, default to local backend
	if (protocol === 'file:') {
		return 'http://127.0.0.1:3000';
	}

	// Deployed fallback
	return 'https://njbbl68078.execute-api.us-east-1.amazonaws.com/Prod';
})();
