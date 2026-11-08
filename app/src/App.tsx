import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./desktop/AppLayout";
import Calculator from "./pages/Calculator";
import Chain from "./pages/Chain";
import Changelog from "./pages/Changelog";
import Events from "./pages/Events";
import Gex from "./pages/Gex";
import { Privacy, Terms } from "./pages/Legal";
import Methodology from "./pages/Methodology";
import NotFound from "./pages/NotFound";
import OptionFinder from "./pages/OptionFinder";
import Overview from "./pages/Overview";
import Scenario from "./pages/Scenario";
import Settings from "./pages/Settings";
import Strategies from "./pages/Strategies";
import Tools from "./pages/Tools";
import Trades from "./pages/Trades";
import Vol from "./pages/Vol";
import Watchlist from "./pages/Watchlist";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/scenario" element={<Scenario />} />
        <Route path="/chain" element={<Chain />} />
        <Route path="/chain/:symbol" element={<Chain />} />
        <Route path="/gex" element={<Gex />} />
        <Route path="/gex/:symbol" element={<Gex />} />
        <Route path="/vol" element={<Vol />} />
        <Route path="/vol/:symbol" element={<Vol />} />
        <Route path="/strategies" element={<Strategies />} />
        <Route path="/strategies/:slug" element={<Strategies />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/watchlist/:symbol" element={<Watchlist />} />
        <Route path="/trades" element={<Trades />} />
        <Route path="/trades/:id" element={<Trades />} />
        <Route path="/events" element={<Events />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/tools/option-finder" element={<OptionFinder />} />
        <Route path="/tools/:mode" element={<Tools />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/options-chain/*" element={<Navigate to="/chain" replace />} />
        <Route path="/scan" element={<Navigate to="/tools/option-finder" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
