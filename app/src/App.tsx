import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Calculator from "./pages/Calculator";
import Chain from "./pages/Chain";
import ChainSymbol from "./pages/ChainSymbol";
import Strategies from "./pages/Strategies";
import StrategyDetail from "./pages/StrategyDetail";
import OptionFinder from "./pages/OptionFinder";
import ToolPage from "./pages/ToolPage";
import {
  Changelog,
  Methodology,
  NotFound,
  Privacy,
  Terms,
  ToolsHub,
  Trades,
  Watchlist,
} from "./pages/Static";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/options-chain" element={<Chain />} />
        <Route path="/options-chain/:symbol" element={<ChainSymbol />} />
        <Route path="/strategies" element={<Strategies />} />
        <Route path="/strategies/:slug" element={<StrategyDetail />} />
        <Route path="/tools" element={<ToolsHub />} />
        <Route path="/tools/option-finder" element={<OptionFinder />} />
        <Route path="/scan" element={<OptionFinder />} />
        <Route path="/tools/black-scholes" element={<ToolPage mode="bs" />} />
        <Route path="/tools/greeks-calculator" element={<ToolPage mode="greeks" />} />
        <Route path="/tools/iv-calculator" element={<ToolPage mode="iv" />} />
        <Route path="/tools/breakeven-calculator" element={<ToolPage mode="breakeven" />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="/trades" element={<Trades />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
