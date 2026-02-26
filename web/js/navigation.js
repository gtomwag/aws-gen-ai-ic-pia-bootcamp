// ── Lock screen clock ─────────────────────────────────────
function updateLockClock() {
  const now = new Date();
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('lockTime').textContent = `${h}:${m}`;
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('lockDate').textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}
updateLockClock();
setInterval(updateLockClock, 30000);

// ── Screen Navigation ─────────────────────────────────────
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');

  // Show tab bar on tab screens only
  const tabScreens = ['screenOptions', 'screenChat', 'screenDetail'];
  if (tabScreens.includes(screenId)) {
    tabBar.classList.add('visible');
  } else {
    tabBar.classList.remove('visible');
  }

  // Update active tab
  const tabMap = { screenDetail: 'notifications', screenChat: 'chat', screenOptions: 'options' };
  if (tabMap[screenId]) {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    const tabBtn = document.querySelector(`.tab-item[data-tab="${tabMap[screenId]}"]`);
    if (tabBtn) tabBtn.classList.add('active');
  }

  refreshIcons();
}

function slideIntoChat() {
  showScreen('screenChat');
  screenChat.classList.add('auto-slide-in');
  setTimeout(() => {
    screenChat.classList.remove('auto-slide-in');
  }, 360);
}

function setHomeSkeletonState(active) {
  const appHome = document.getElementById('appHome');
  if (!appHome) return;
  appHome.classList.toggle('loading', active);
}

const LAUNCH_SPLASH_MS = 1050;
const HOME_SKELETON_MS = 1650;

function launchLoadingThenHome({ autoOpenChat = true } = {}) {
  setHomeSkeletonState(false);
  showScreen('screenLoading');
  setTimeout(() => {
    showScreen('screenHome');
    setHomeSkeletonState(true);
    if (autoOpenChat) {
      setTimeout(() => {
        setHomeSkeletonState(false);
        slideIntoChat();
      }, HOME_SKELETON_MS);
    } else {
      setTimeout(() => {
        setHomeSkeletonState(false);
      }, HOME_SKELETON_MS);
    }
  }, LAUNCH_SPLASH_MS);
}

// Tab bar click
document.querySelectorAll('.tab-item').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    const screenMap = { notifications: 'screenDetail', chat: 'screenChat', options: 'screenOptions' };
    if (screenMap[tabName]) showScreen(screenMap[tabName]);
  });
});

// Back button on detail
document.getElementById('detailBack').addEventListener('click', () => {
  if (sessionId) {
    showScreen('screenHome');
  } else {
    showScreen('screenLock');
  }
});

// CTA buttons on detail screen
document.getElementById('ctaViewOptions').addEventListener('click', () => {
  showScreen('screenOptions');
  // Automatically show rebooking section
  if (typeof showRebookingOptions === 'function') showRebookingOptions();
});
document.getElementById('ctaChatAssistant').addEventListener('click', () => slideIntoChat());

// Lock screen notification card tap
document.getElementById('lockNotifCard').addEventListener('click', () => {
  launchLoadingThenHome({ autoOpenChat: true });
});

homeViewUpdate.addEventListener('click', () => showScreen('screenDetail'));
homeOpenChat.addEventListener('click', () => slideIntoChat());

// Done button on booking
document.getElementById('btnDone').addEventListener('click', () => {
  // Update trip card with confirmed booking
  if (storedConfirmedBooking) {
    updateTripCardWithConfirmedBooking(storedConfirmedBooking);
  }
  
  // Update notification to show resolved status
  updateNotificationToResolved();
  
  // Go back to detail screen
  showScreen('screenDetail');
  tabBar.classList.add('visible');
});

// Dismiss escalation
document.getElementById('btnDismissEscalation').addEventListener('click', () => {
  escalationOverlay.classList.remove('visible');
});

// Close escalation overlay on background click
escalationOverlay.addEventListener('click', (e) => {
  if (e.target === escalationOverlay) escalationOverlay.classList.remove('visible');
});

// Close metrics overlay on background click
metricsOverlay.addEventListener('click', (e) => {
  if (e.target === metricsOverlay) metricsOverlay.classList.remove('visible');
});

// ── Triple-tap to toggle metrics drawer ───────────────────
let tripleTapCount = 0;
let tripleTapTimer = null;
document.querySelectorAll('.nav-title').forEach(title => {
  title.addEventListener('click', () => {
    tripleTapCount++;
    clearTimeout(tripleTapTimer);
    if (tripleTapCount >= 3) {
      tripleTapCount = 0;
      metricsOverlay.classList.toggle('visible');
    } else {
      tripleTapTimer = setTimeout(() => { tripleTapCount = 0; }, 600);
    }
  });
});
