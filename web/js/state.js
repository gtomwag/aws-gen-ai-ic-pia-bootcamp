// ── Severance Character Pool ──────────────────────────────
const SEVERANCE_PASSENGERS = [
  { firstName: 'Mark',    lastName: 'Scout',      tier: 'Gold',     origin: 'FRA', destination: 'JFK', flightNumber: 'UA891',  constraints: ['arrive_before_21_00'], seat: '14A', disruptionType: 'CANCELLATION', disruptionCause: 'Severe weather \u2013 thunderstorm at FRA, runway closure' },
  { firstName: 'Helly',   lastName: 'Riggs',      tier: 'Platinum', origin: 'FRA', destination: 'JFK', flightNumber: 'UA891',  constraints: ['direct_only'],         seat: '3A',  disruptionType: 'CANCELLATION', disruptionCause: 'Severe weather \u2013 thunderstorm at FRA, runway closure' },
  { firstName: 'Irving',  lastName: 'Bailiff',    tier: 'Gold',     origin: 'LHR', destination: 'LAX', flightNumber: 'BA447',  constraints: ['arrive_before_21_00'], seat: '8C',  disruptionType: 'DELAY',        disruptionCause: 'Aircraft maintenance \u2013 engine inspection required' },
  { firstName: 'Dylan',   lastName: 'George',     tier: 'Silver',   origin: 'CDG', destination: 'ORD', flightNumber: 'AF198',  constraints: [],                      seat: '22F', disruptionType: 'CANCELLATION', disruptionCause: 'Crew unavailability \u2013 scheduling conflict' },
  { firstName: 'Burt',    lastName: 'Goodman',    tier: 'General',  origin: 'AMS', destination: 'MIA', flightNumber: 'KL645',  constraints: [],                      seat: '31B', disruptionType: 'DELAY',        disruptionCause: 'Air traffic control delay \u2013 congestion at origin' },
  { firstName: 'Seth',    lastName: 'Milchick',   tier: 'Platinum', origin: 'LHR', destination: 'SFO', flightNumber: 'LH203',  constraints: ['direct_only'],         seat: '2D',  disruptionType: 'CANCELLATION', disruptionCause: 'Mechanical issue \u2013 engine inspection required' },
  { firstName: 'Harmony', lastName: 'Cobel',      tier: 'Gold',     origin: 'FRA', destination: 'ORD', flightNumber: 'DL512',  constraints: ['arrive_before_21_00'], seat: '9A',  disruptionType: 'DELAY',        disruptionCause: 'Crew rest requirements exceeded' },
  { firstName: 'Ricken',  lastName: 'Hale',       tier: 'Silver',   origin: 'CDG', destination: 'MIA', flightNumber: 'AA330',  constraints: [],                      seat: '18E', disruptionType: 'CANCELLATION', disruptionCause: 'Volcanic ash advisory \u2013 airspace closure' },
  { firstName: 'Devon',   lastName: 'Scout-Hale', tier: 'General',  origin: 'AMS', destination: 'SFO', flightNumber: 'SW718',  constraints: [],                      seat: '27A', disruptionType: 'DELAY',        disruptionCause: 'De-icing operations \u2013 winter storm' },
  { firstName: 'Gemma',   lastName: 'Scout',      tier: 'Platinum', origin: 'LHR', destination: 'JFK', flightNumber: 'UA445',  constraints: ['direct_only'],         seat: '1F',  disruptionType: 'CANCELLATION', disruptionCause: 'Bird strike damage \u2013 safety inspection' },
  { firstName: 'Petey',   lastName: 'Kilmer',     tier: 'Gold',     origin: 'FRA', destination: 'LAX', flightNumber: 'UA891',  constraints: ['arrive_before_21_00'], seat: '11C', disruptionType: 'CANCELLATION', disruptionCause: 'Severe weather \u2013 thunderstorm at FRA, runway closure' },
  { firstName: 'Ms.',     lastName: 'Casey',      tier: 'Silver',   origin: 'LHR', destination: 'ORD', flightNumber: 'BA447',  constraints: [],                      seat: '20D', disruptionType: 'DELAY',        disruptionCause: 'Aircraft maintenance \u2013 safety check required' },
  { firstName: 'Gabby',   lastName: 'Arteta',     tier: 'General',  origin: 'CDG', destination: 'JFK', flightNumber: 'AF198',  constraints: [],                      seat: '34A', disruptionType: 'CANCELLATION', disruptionCause: 'Crew unavailability \u2013 scheduling conflict' },
  { firstName: 'Alexa',   lastName: 'Huang',      tier: 'Gold',     origin: 'AMS', destination: 'SFO', flightNumber: 'KL645',  constraints: ['arrive_before_21_00'], seat: '7B',  disruptionType: 'DELAY',        disruptionCause: 'Air traffic control delay \u2013 congestion at origin' },
];

function pickRandomPassenger() {
  return SEVERANCE_PASSENGERS[Math.floor(Math.random() * SEVERANCE_PASSENGERS.length)];
}

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
let storedConfirmedBooking = null;
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
