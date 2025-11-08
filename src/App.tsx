import "./App.css";
import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
import PlayerCountSelect from "./components/PlayerCountSelect.tsx";
import GamePage from "./pages/GamePage.tsx";
import PlayerPage from "./pages/PlayerPage.tsx";
import MafiaRevealPage from "./pages/MafiaRevealPage.tsx";
import Navbar from "./components/Navbar.tsx";
import HomePage from "./pages/HomePage.tsx";
import { ROUTES } from "./constants/strings";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.SETUP} element={<PlayerCountSelect />} />
        <Route path={ROUTES.GAME} element={<GamePage />} />
        <Route path={`${ROUTES.PLAYER}/:playerId`} element={<PlayerPage />} />
        <Route path={ROUTES.REVEAL_MAFIA} element={<MafiaRevealPage />} />
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
