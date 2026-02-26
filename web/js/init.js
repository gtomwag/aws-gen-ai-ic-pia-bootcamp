// ── Event listeners ───────────────────────────────────────

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChat();
});

btnSend.addEventListener('click', sendChat);
btnDisruption.addEventListener('click', createDisruption);
btnConfirm.addEventListener('click', confirmSelection);
btnEscalate.addEventListener('click', escalate);

// Hidden ops view toggle (Ctrl+Shift+D / Cmd+Shift+D)
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    window.location.href = 'dashboard.html';
  }
});
