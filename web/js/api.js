// ── Helpers ───────────────────────────────────────────────

function setStatus(text) {
  statusText.textContent = text;
}

async function apiCall(path, body) {
  setStatus(`Calling ${path}...`);
  try {
    const isGet = !body && (path.includes('?') || path === '/health' || path.startsWith('/notification') || (path === '/disruption' && !body));
    const fullUrl = `${API_BASE_URL}${path}`;
    console.log(`[API] ${isGet ? 'GET' : 'POST'} ${fullUrl}`, body ? { body } : '');
    const res = await fetch(fullUrl, {
      method: isGet ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    setStatus('Ready');
    return data;
  } catch (err) {
    const isNetworkError = err && (err.name === 'TypeError' || String(err.message || '').includes('Failed to fetch'));
    const hint = isNetworkError
      ? ` Network issue reaching ${API_BASE_URL}. Ensure backend is running and reachable.`
      : '';
    const message = `${err.message || 'Request failed.'}${hint}`;

    setStatus(`Error: ${message}`);
    addMessage('system', `Error: ${message}`);
    throw err;
  }
}
