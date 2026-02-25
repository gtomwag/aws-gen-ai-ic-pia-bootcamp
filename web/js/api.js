// ── Helpers ───────────────────────────────────────────────

function setStatus(text) {
  statusText.textContent = text;
}

async function apiCall(path, body) {
  setStatus(`Calling ${path}...`);
  try {
    const isGet = !body && (path.includes('?') || path === '/health' || path.startsWith('/notification') || (path === '/disruption' && !body));
    const res = await fetch(`${API_BASE_URL}${path}`, {
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
    setStatus(`Error: ${err.message}`);
    addMessage('system', `⚠ Error: ${err.message}`);
    throw err;
  }
}
