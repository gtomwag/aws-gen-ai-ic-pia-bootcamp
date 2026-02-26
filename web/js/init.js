// ── Event listeners ───────────────────────────────────────

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChat();
});

btnSend.addEventListener('click', sendChat);
btnDisruption.addEventListener('click', createDisruption);
btnConfirm.addEventListener('click', confirmSelection);
btnEscalate.addEventListener('click', escalate);

// Trip card event listeners
const btnViewRebookingOptions = document.getElementById('btnViewRebookingOptions');
const btnCloseRebooking = document.getElementById('btnCloseRebooking');

if (btnViewRebookingOptions) {
  btnViewRebookingOptions.addEventListener('click', showRebookingOptions);
}

if (btnCloseRebooking) {
  btnCloseRebooking.addEventListener('click', hideRebookingOptions);
}
