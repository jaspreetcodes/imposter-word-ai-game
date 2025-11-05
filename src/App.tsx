import "./App.css";
import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
import PlayerCountSelect from "./components/PlayerCountSelect.tsx";
import GamePage from "./pages/GamePage.tsx";
import PlayerPage from "./pages/PlayerPage.tsx";
import Navbar from "./components/Navbar.tsx";
import HomePage from "./pages/HomePage.tsx";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/setup" element={<PlayerCountSelect />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/player/:playerId" element={<PlayerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
