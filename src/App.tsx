import { useEffect, useState } from "react";
import { useStore } from "./store";
import OwnerLogin from "./screens/OwnerLogin";
import PinLogin from "./screens/PinLogin";
import Sales from "./screens/Sales";
import Payment from "./screens/Payment";
import Receipt from "./screens/Receipt";
import Riwayat from "./screens/Riwayat";
import Produk from "./screens/Produk";
import Kas from "./screens/Kas";
import Laporan from "./screens/Laporan";

const DEMO_CASHIER = {
  id: "ae",
  store_id: "demo",
  name: "Aerith Djiady",
  initials: "AE",
  role: "cashier",
  pin: "000000",
  active: true,
};

export default function App() {
  const screen = useStore(s => s.screen);
  const setScreen = useStore(s => s.setScreen);
  const setStoreData = useStore(s => s.setStoreData);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calc = () => {
      const s = Math.min(
        (window.innerWidth * 0.96) / 1366,
        (window.innerHeight - 32) / 900,
        1
      );
      setScale(s);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true") {
      setStoreData("demo", "Toko Sembako Maju", "Jl. Diponegoro No. 24, Palu Timur", [DEMO_CASHIER]);
      setScreen("sales");
    }
  }, []);

  if (screen === "owner-login") {
    return <OwnerLogin />;
  }

  return (
    <div className="fixed inset-0 bg-cream-deep flex items-center justify-center overflow-hidden">
      <div
        className="rounded-card shadow-tablet overflow-hidden bg-cream-bg"
        style={{ width: Math.round(1366 * scale), height: Math.round(900 * scale) }}
      >
        <div style={{ width: 1366, height: 900, transformOrigin: "top left", transform: `scale(${scale})` }}>
          {screen === "login"   && <PinLogin />}
          {screen === "sales"   && <Sales />}
          {screen === "payment" && <Payment />}
          {screen === "receipt" && <Receipt />}
          {screen === "riwayat" && <Riwayat />}
          {screen === "produk"  && <Produk />}
          {screen === "kas"     && <Kas />}
          {screen === "laporan" && <Laporan />}
        </div>
      </div>
    </div>
  );
}
