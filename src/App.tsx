import "./App.css";
import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
import PlayerCountSelect from "./components/PlayerCountSelect.tsx";
import GamePage from "./pages/GamePage.tsx";
import PlayerPage from "./pages/PlayerPage.tsx";
import MafiaRevealPage from "./pages/MafiaRevealPage.tsx";
import Navbar from "./components/Navbar.tsx";
import HomePage from "./pages/HomePage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import SignUpPage from "./pages/SignUpPage.tsx";
import CreateRoomPage from "./pages/CreateRoomPage.tsx";
import JoinRoomPage from "./pages/JoinRoomPage.tsx";
import WaitingRoomPage from "./pages/WaitingRoomPage.tsx";
import RoomGamePage from "./pages/RoomGamePage.tsx";
import RoomPlayerPage from "./pages/RoomPlayerPage.tsx";
import RoomRevealPage from "./pages/RoomRevealPage.tsx";
import { ROUTES } from "./constants/strings";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.SIGNUP} element={<SignUpPage />} />
        <Route path={ROUTES.CREATE_ROOM} element={<CreateRoomPage />} />
        <Route path={ROUTES.JOIN_ROOM} element={<JoinRoomPage />} />
        <Route path={`${ROUTES.ROOM}/:roomCode`} element={<WaitingRoomPage />} />
        <Route path={`${ROUTES.ROOM}/:roomCode/game`} element={<RoomGamePage />} />
        <Route path={`${ROUTES.ROOM}/:roomCode/player/:playerId`} element={<RoomPlayerPage />} />
        <Route path={`${ROUTES.ROOM}/:roomCode/reveal`} element={<RoomRevealPage />} />
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
