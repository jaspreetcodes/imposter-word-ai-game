// Game branding and constants
export const GAME_NAME = "Mafia's Word";
export const GAME_NAME_SHORT = "MafiaWord";

// Game terms
export const TERMS = {
  MAFIA: "Mafia",
  MAFIA_LOWER: "mafia",
  MAFIA_PLURAL: "Mafias",
  PLAYER: "Player",
  PLAYERS: "Players",
  CATEGORY: "Category",
  CATEGORIES: "Categories",
  WORD: "Word",
  WORD_LOWER: "word",
} as const;

// UI Strings
export const UI_STRINGS = {
  // HomePage
  HOME_SUBTITLE: "A multilingual mafia/imposter word game powered by AI.",
  HOME_HOW_TO_PLAY: "How to Play",
  HOME_PICK_PLAYERS: "Pick the number of players and start a round.",
  HOME_SECRET_WORD: "Everyone gets the same secret word—except one Mafia.",
  HOME_GIVE_CLUES: "Taking turns, give short hints/clues (no saying the word or obvious rhymes).",
  HOME_VOTE: "After each round of clues, discuss and vote who you think is the Mafia.",
  HOME_WIN_CONDITION: "If the Mafia survives to the end, they win. If caught, the group wins.",
  HOME_TIPS: "Tips",
  HOME_TIP_1: "Keep clues subtle—help teammates, but don't hand the word to the Mafia.",
  HOME_TIP_2: "Play region or category modes for cultural twists.",
  HOME_TIP_3: "Rounds are quick: 1–2 clues each, then vote.",
  HOME_PLAY_BUTTON: "▶ Play",

  // GamePage
  GAME_CHANGE_PLAYERS: "← Change Players",
  GAME_PLAYERS_LABEL: "Players:",
  GAME_REVEAL_MAFIA: "Reveal the Mafia",
  GAME_CONFIRM_TITLE: "Are you sure?",
  GAME_CONFIRM_MESSAGE: "Going back will start a new game and select a new word.",
  GAME_CONFIRM_CANCEL: "Cancel",
  GAME_CONFIRM_YES: "Yes, go back",
  GAME_START_SUGGESTION_TITLE: "Ready to Start!",
  GAME_START_SUGGESTION_MESSAGE: "All players have checked their cards.",
  GAME_START_PLAYER_SUGGESTION: "Suggested starting player:",
  GAME_START_DIRECTION: "Direction:",
  GAME_START_CLOCKWISE: "Clockwise",
  GAME_START_COUNTER_CLOCKWISE: "Counter-clockwise",
  GAME_START_CONTINUE: "Continue",

  // PlayerPage
  PLAYER_CATEGORY_LABEL: "Category:",
  PLAYER_MAFIA_MESSAGE: "You are the Mafia!",
  PLAYER_WORD_HIDDEN: "Word hidden",
  PLAYER_HIDE_BUTTON: "Hide Word & Pass",

  // RevealPage
  REVEAL_TITLE: "The Mafia Is...",
  REVEAL_NEW_GAME: "Start a New Game",

  // PlayerCountSelect / game lobby
  SETUP_TITLE: "Start Game",
  SETUP_BADGE: "Local party · Pass the device",
  SETUP_SUBTITLE:
    "Pick players, then choose Random, Topics, or AI to build your word pool.",
  SETUP_SELECT_PLAYERS: "Players",
  SETUP_PLAYERS_SHORT: "players",
  SETUP_MODE_RANDOM: "Random",
  SETUP_MODE_CUSTOM: "Topics",
  SETUP_MODE_AI: "New language & region",
  SETUP_RANDOM_TITLE: "Random round",
  SETUP_RANDOM_DESC:
    "Pick a language & region below. We choose a surprise category and secret word from your word pool.",
  SETUP_AI_TITLE: "Add words for a new locale",
  SETUP_AI_DESC:
    "Pick a supported language & region. Non-English locales get culture-rich topics (food, films, music…). Unsupported languages are refused so you never get a bad word pool.",
  SETUP_AI_PRESET_TITLE: "Existing presets",
  SETUP_AI_PRESET_HINT: "Tap a flag to fill language & region, or type a supported language below.",
  SETUP_AI_OR_NEW: "Or enter a supported language & region",
  SETUP_AI_LANGUAGE_LABEL: "Language",
  SETUP_AI_REGION_LABEL: "Region",
  SETUP_AI_LANGUAGE_PLACEHOLDER: "e.g. Punjabi, Hindi, French…",
  SETUP_AI_REGION_PLACEHOLDER: "e.g. Punjab, Toronto, France…",
  SETUP_AI_NOTE:
    "Requires the local word-gen server (npm run word-gen-server) and Ollama. Supported languages: English, French, Hindi, Punjabi, Urdu, Spanish.",
  SETUP_AI_LANG_UNSUPPORTED:
    "AI generation supports: {langs}. Other languages are not enabled yet.",
  SETUP_AI_GENERATE: "Generate words with AI",
  SETUP_AI_GENERATING: "Generating words…",
  SETUP_AI_FIELDS_REQUIRED: "Enter both language and region, or tap a preset flag.",
  SETUP_AI_SUCCESS_QUICK:
    "Mini batch ready (culture-rich topics). Open Topics to pick categories and start.",
  SETUP_AI_SUCCESS_FULL:
    "{count} words saved for this language & region. Ready to play!",
  SETUP_AI_PLAY_RANDOM: "Start random game with this locale",
  SETUP_AI_TAB_LOCALE: "Locale words",
  SETUP_AI_TAB_NICHE: "English niche topic",
  SETUP_AI_NICHE_DESC:
    "Create a custom English-only topic (e.g. football jargon, old comedians). Words are saved under that category name.",
  SETUP_AI_NICHE_LABEL: "Niche category name",
  SETUP_AI_NICHE_PLACEHOLDER: "e.g. Football jargon, Silent film stars…",
  SETUP_AI_NICHE_REGION_LABEL: "Region flavor (optional)",
  SETUP_AI_NICHE_GENERATE: "Generate niche words",
  SETUP_AI_NICHE_INVALID:
    "Enter a custom category name (2–48 characters). Reserved game topics cannot be reused.",
  SETUP_AI_NICHE_SUCCESS: "{count} English words saved for “{category}”. Open Topics to play.",
  SETUP_CUSTOM_TITLE: "Choose your topics",
  SETUP_CUSTOM_DESC:
    "Select one or more categories. For non-English locales, only culture-rich topics are offered.",
  SETUP_START_RANDOM: "Start random round",
  SETUP_START_CUSTOM: "Start with selected topics",
  SETUP_PICK_CATEGORIES: "Choose categories",
  SETUP_STARTING: "Dealing secrets…",
  SETUP_LOCALE_REQUIRED: "Choose a language and region (or tap a preset).",
  SETUP_CATEGORIES_REQUIRED: "Select at least one category, or use Random mode.",
  SETUP_ENTER_BUTTON: "Enter",
  SETUP_CATEGORIES_BUTTON: "Categories",
  SETUP_SELECT_CATEGORIES: "Word topics",
  SETUP_WORD_THEME: "Word theme",
  SETUP_LANGUAGE_REGION: "Language & region",
  SETUP_CATEGORIES_DESCRIPTION:
    "Only topics with words for your language and region are shown. Tap to select.",
  SETUP_SCROLL_CAROUSEL_HINT: "Scroll sideways to see more.",
  SETUP_RANDOM_LOCALE_HINT:
    "Picks a surprise topic from words ready for this language and region.",
  SETUP_LOCALE_FIRST_HINT: "Pick a language and region first.",
  SETUP_LOADING_CATEGORIES: "Loading available topics…",
  SETUP_NO_CATEGORIES:
    "No words for this locale yet. Use New language & region to generate a mini batch, then come back here.",
  SETUP_AI_PREVIEW_WORDS: "Words from last generation (this session)",
  SETUP_AI_PREVIEW_NOTE:
    "Words stay available for this session; more are added in the background.",
  SETUP_AI_GO_TOPICS: "Switch to Topics to play with ready categories.",
  SETUP_CANCEL: "Cancel",
  SETUP_SAVE_START: "Start game",

  // Auth
  AUTH_SIGN_IN: "Sign In",
  AUTH_SIGN_UP: "Sign Up",
  AUTH_SIGN_OUT: "Sign Out",
  AUTH_EMAIL: "Email",
  AUTH_PASSWORD: "Password",
  AUTH_DISPLAY_NAME: "Display Name",
  AUTH_GOOGLE_SIGN_IN: "Sign in with Google",
  AUTH_GOOGLE_SIGN_UP: "Sign up with Google",
  AUTH_NO_ACCOUNT: "Don't have an account?",
  AUTH_HAVE_ACCOUNT: "Already have an account?",
  AUTH_SIGN_UP_LINK: "Sign up",
  AUTH_SIGN_IN_LINK: "Sign in",
  AUTH_FORGOT_PASSWORD: "Forgot password?",
  AUTH_ERROR_INVALID_EMAIL: "Invalid email address",
  AUTH_ERROR_WEAK_PASSWORD: "Password should be at least 6 characters",
  AUTH_ERROR_WRONG_PASSWORD: "Wrong password",
  AUTH_ERROR_USER_NOT_FOUND: "User not found",
  AUTH_ERROR_EMAIL_IN_USE: "Email already in use",
  AUTH_ERROR_NETWORK: "Network error. Please try again.",
  AUTH_USER_NOT_FOUND_MESSAGE: "This email is not registered. Please sign up first.",
  AUTH_EMAIL_INVALID: "Please enter a valid email address",

  // Multiplayer
  MULTI_CREATE_ROOM: "Create Room",
  MULTI_JOIN_ROOM: "Join Room",
  MULTI_ROOM_CODE: "Room Code",
  MULTI_ROOM_CODE_PLACEHOLDER: "Enter 6-digit code",
  MULTI_ROOM_CODE_INVALID: "Invalid room code",
  MULTI_ROOM_FULL: "Room is full",
  MULTI_ROOM_NOT_FOUND: "Room not found",
  MULTI_WAITING_FOR_PLAYERS: "Waiting for players...",
  MULTI_START_GAME: "Start Game",
  MULTI_LEAVE_ROOM: "Leave Room",
  MULTI_PLAYERS_IN_ROOM: "Players in room",
  MULTI_HOST: "Host",
  MULTI_YOU: "You",
  MULTI_COPY_CODE: "Copy Code",
  MULTI_CODE_COPIED: "Code copied!",
  MULTI_ROOM_CODE_DISPLAY: "Room Code",
  MULTI_SHARE_CODE: "Share this code with other players",

  // Room chat & turn
  CHAT_TITLE: "Game Chat",
  CHAT_PLACEHOLDER: "Type your message...",
  CHAT_SEND: "Send",
  CHAT_EMPTY: "No messages yet. Start the conversation!",
  CHAT_TURN_PROMPT: "It's {name}'s turn to give a clue.",
  CHAT_TURN_YOUR_TURN: "Your turn to give a clue!",
  CHAT_NEXT_TURN: "Next turn",
} as const;

// Storage keys
export const STORAGE_KEYS = {
  GAME_STATE: "mafiasword_game_state",
  THEME: "theme",
} as const;

// Routes
export const ROUTES = {
  HOME: "/",
  SETUP: "/setup",
  GAME: "/game",
  PLAYER: "/player",
  REVEAL_MAFIA: "/reveal-mafia",
  LOGIN: "/login",
  SIGNUP: "/signup",
  CREATE_ROOM: "/create-room",
  JOIN_ROOM: "/join-room",
  ROOM: "/room",
} as const;

