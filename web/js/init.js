// ── Event listeners ───────────────────────────────────────

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChat();
});

btnSend.addEventListener('click', sendChat);
btnDisruption.addEventListener('click', createDisruption);
btnConfirm.addEventListener('click', confirmSelection);
btnEscalate.addEventListener('click', escalate);
btnVoiceAgent.addEventListener('click', startVoiceConversation);
btnVoiceTab.addEventListener('click', () => {
  showScreen('screenChat');
  startVoiceConversation();
});


