import "./App.css";
import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
import PlayerCountSelect from "./components/PlayerCountSelect.tsx";
import GamePage from "./pages/GamePage.tsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlayerCountSelect />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
