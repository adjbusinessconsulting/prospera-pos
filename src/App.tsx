import { useStore } from "./store";
import OwnerLogin from "./screens/OwnerLogin";
import PinLogin from "./screens/PinLogin";
import Sales from "./screens/Sales";
import Payment from "./screens/Payment";
import Receipt from "./screens/Receipt";

export default function App() {
  const screen = useStore(s => s.screen);

  return (
    <div className="fixed inset-0 bg-cream-deep flex items-center justify-center">
      <div
        className="bg-cream-bg rounded-card shadow-tablet overflow-hidden"
        style={{ width: 1366, height: 900, maxWidth: "96vw", maxHeight: "calc(100vh - 40px)" }}
      >
        {screen === "owner-login" && <OwnerLogin />}
        {screen === "login" && <PinLogin />}
        {screen === "sales" && <Sales />}
        {screen === "payment" && <Payment />}
        {screen === "receipt" && <Receipt />}
      </div>
    </div>
  );
}
