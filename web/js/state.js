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
let isVoiceCallActive = false;
let isVoiceTurnInFlight = false;

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
const screenLoading = document.getElementById('screenLoading');
const screenHome = document.getElementById('screenHome');
const screenDetail = document.getElementById('screenDetail');
const screenOptions = document.getElementById('screenOptions');
const screenChat = document.getElementById('screenChat');
const screenBooking = document.getElementById('screenBooking');
const tabBar = document.getElementById('tabBar');
const metricsOverlay = document.getElementById('metricsOverlay');
const escalationOverlay = document.getElementById('escalationOverlay');

// Home landing refs
const homePassengerName = document.getElementById('homePassengerName');
const homePassengerTier = document.getElementById('homePassengerTier');
const homeTripFlight = document.getElementById('homeTripFlight');
const homeTripStatus = document.getElementById('homeTripStatus');
const homeTripTime = document.getElementById('homeTripTime');
const homeTripRoute = document.getElementById('homeTripRoute');
const homeTripDeparts = document.getElementById('homeTripDeparts');
const homeTripGate = document.getElementById('homeTripGate');
const homeTripTerminal = document.getElementById('homeTripTerminal');
const homeTripSeat = document.getElementById('homeTripSeat');
const homeTripCause = document.getElementById('homeTripCause');
const homeViewUpdate = document.getElementById('homeViewUpdate');
const homeOpenChat = document.getElementById('homeOpenChat');
