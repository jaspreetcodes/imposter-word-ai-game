# Mafia's Word 🎭

A modern, multiplayer social deduction word game where players must identify the "Mafia" among them through strategic clue-giving and voting. Built with React, TypeScript, and designed for seamless cross-device gameplay.

## 🎮 How It Works

- **Setup**: Choose 2-25 players and optionally select word categories
- **Gameplay**: All players receive the same secret word except one randomly assigned "Mafia" player
- **Objective**: Players give clues about the word without revealing it, then vote to identify the Mafia
- **Victory**: The Mafia wins if they survive; the group wins if they catch the Mafia

## ✨ Features

- **Multiplayer Support**: Accommodates 2-25 players with dynamic game state management
- **Category Selection**: Filter words by categories for customized gameplay
- **Dark/Light Mode**: Theme toggle with persistent user preferences
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Card Flip Animations**: Smooth 3D card reveal effects for player interactions
- **Session Persistence**: Game state saved in session storage for seamless navigation
- **One-Time Reveal**: Cards lock after being revealed to prevent cheating
- **Type-Safe**: Built with TypeScript for robust type checking
- **Centralized Strings**: Maintainable codebase with centralized UI text management

## 🛠️ Tech Stack

- **Frontend Framework**: React 19 with TypeScript
- **Routing**: React Router DOM v7
- **State Management**: React Context API with custom hooks
- **Styling**: CSS Modules with CSS Variables for theming
- **Build Tool**: Vite with Rolldown
- **Storage**: Session Storage & Local Storage for game state and preferences

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd imposter-word-ai-game

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.tsx     # Navigation bar with theme toggle
│   └── PlayerCountSelect.tsx  # Game setup component
├── contexts/          # React Context providers
│   ├── GameContext.tsx    # Game state management
│   └── ThemeContext.tsx   # Theme management
├── pages/             # Route components
│   ├── HomePage.tsx       # Landing page with game rules
│   ├── GamePage.tsx      # Main game board with player cards
│   ├── PlayerPage.tsx    # Individual player word reveal
│   └── MafiaRevealPage.tsx  # Mafia identity reveal
├── constants/         # Centralized constants
│   └── strings.ts        # UI strings, routes, storage keys
└── assets/           # Static assets
    └── words.ts          # Word database by category
```

## 🎨 Design Features

- **Modern UI**: Clean, minimalist design with smooth transitions
- **Accessibility**: Semantic HTML and ARIA labels
- **Theme System**: CSS variables for easy theme customization
- **Responsive Breakpoints**: Optimized layouts for various screen sizes

## 🔧 Development

### Code Style

- TypeScript strict mode enabled
- ESLint for code quality
- CSS Modules for scoped styling

### Key Implementation Details

- **Game State**: Managed through React Context with session storage persistence
- **Card Locking**: One-time reveal system prevents re-accessing player cards
- **Randomization**: Secure random selection for Mafia assignment and word picking
- **Navigation Guards**: Automatic redirects to maintain game flow integrity

## 📝 License

This project is private and not licensed for public use.

## 👤 Author

Built as a proof of concept and portfolio project demonstrating modern React development practices, TypeScript proficiency, UI/UX design skills and integration of AI.