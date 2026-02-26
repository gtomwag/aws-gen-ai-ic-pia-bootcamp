// ── State ─────────────────────────────────────────────────
let sessionId = null;
let selectedOptionId = null;
let currentOptions = [];
let allOptions = []; // unfiltered copy
let showRecommendedOnly = false;
let currentSort = 'time';
let metricsEntries = [];
let currentSentimentText = '';
let storedPassenger = null;
let storedNotification = null;
let storedDisruptionType = '';
let storedDisruptionCause = '';
let voiceSessionId = null;
let voiceTurnSequence = 1;
let isVoiceListening = false;
let activeSpeechRecognition = null;
let voiceTransferRequestId = null;

// ── DOM refs ──────────────────────────────────────────────
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const btnSend = document.getElementById('btnSend');
const btnDisruption = document.getElementById('btnDisruption');
const btnConfirm = document.getElementById('btnConfirm');
const btnEscalate = document.getElementById('btnEscalate');
const btnVoiceAgent = document.getElementById('btnVoiceAgent');
const btnVoiceTab = document.getElementById('btnVoiceTab');
const optionsList = document.getElementById('optionsList');
const pnrCode = document.getElementById('pnrCode');
const offlineNote = document.getElementById('offlineNote');
const statusText = document.getElementById('statusText');
const metricsLog = document.getElementById('metricsLog');
const autoEscalationAlert = document.getElementById('autoEscalationAlert');
const autoEscalationDetail = document.getElementById('autoEscalationDetail');
const sentimentDot = document.getElementById('sentimentDot');

// Screens
const screenLock = document.getElementById('screenLock');
const screenDetail = document.getElementById('screenDetail');
const screenOptions = document.getElementById('screenOptions');
const screenChat = document.getElementById('screenChat');
const screenBooking = document.getElementById('screenBooking');
const tabBar = document.getElementById('tabBar');
const metricsOverlay = document.getElementById('metricsOverlay');
const escalationOverlay = document.getElementById('escalationOverlay');
