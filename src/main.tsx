import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { RoomProvider } from './contexts/RoomContext'
import { GameProvider } from './contexts/GameContext'
import { seedFirestoreIfNeeded } from './services/seedFirestore'

// Optional one-time Firestore seed (guarded by env + marker doc)
seedFirestoreIfNeeded().catch((err) => {
  // Don't break the app if seeding fails
  console.warn("Firestore seed skipped/failed:", err);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <RoomProvider>
          <GameProvider>
            <App />
          </GameProvider>
        </RoomProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
