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
  HOME_SUBTITLE: "A multilingual mafia word game powered by AI.",
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

  // PlayerPage
  PLAYER_CATEGORY_LABEL: "Category:",
  PLAYER_MAFIA_MESSAGE: "You are the Mafia!",
  PLAYER_WORD_HIDDEN: "Word hidden",
  PLAYER_HIDE_BUTTON: "Hide Word & Pass",

  // RevealPage
  REVEAL_TITLE: "The Mafia Is...",
  REVEAL_NEW_GAME: "Start a New Game",

  // PlayerCountSelect
  SETUP_TITLE: "Start Game",
  SETUP_SELECT_PLAYERS: "Select number of players",
  SETUP_ENTER_BUTTON: "Enter",
  SETUP_CATEGORIES_BUTTON: "Categories",
  SETUP_SELECT_CATEGORIES: "Select Categories",
  SETUP_CATEGORIES_DESCRIPTION: "Choose one or more categories. Words will be selected from selected categories only.",
  SETUP_CANCEL: "Cancel",
  SETUP_SAVE_START: "Save & Start Game",
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
} as const;

