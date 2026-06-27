import { useEffect } from "react";
import { useStore } from "./store";
import OwnerLogin from "./screens/OwnerLogin";
import PinLogin from "./screens/PinLogin";
import Sales from "./screens/Sales";
import Payment from "./screens/Payment";
import Receipt from "./screens/Receipt";

const DEMO_CASHIER = {
  id: "demo-cashier",
  store_id: "demo",
  name: "Demo Cashier",
  initials: "DC",
  role: "cashier",
  pin: "000000",
  active: true,
};

export default function App() {
  const screen = useStore(s => s.screen);
  const setScreen = useStore(s => s.setScreen);
  const setStoreData = useStore(s => s.setStoreData);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true") {
      setStoreData("demo", "Prospera Demo Store", "Palu, Sulawesi Tengah", [DEMO_CASHIER]);
      setScreen("sales");
    }
  }, []);

  if (screen === "owner-login") {
    return <OwnerLogin />;
  }

  return (
    <div className="fixed inset-0 bg-cream-deep flex items-center justify-center">
      <div
        className="bg-cream-bg rounded-card shadow-tablet overflow-hidden"
        style={{ width: 1366, height: 900, maxWidth: "96vw", maxHeight: "calc(100vh - 40px)" }}
      >
        {screen === "login" && <PinLogin />}
        {screen === "sales" && <Sales />}
        {screen === "payment" && <Payment />}
        {screen === "receipt" && <Receipt />}
      </div>
    </div>
  );
}
