import { useEffect, useState } from "react";
import { useStore } from "./store";
import { supabase } from "./lib/supabase";
import OwnerLogin from "./screens/OwnerLogin";
import ResetPassword from "./screens/ResetPassword";
import UpdateBanner from "./components/UpdateBanner";
import { DemoTierSwitcher } from "./components/DemoTierSwitcher";
import SplashScreen from "./components/SplashScreen";
import PinLogin from "./screens/PinLogin";
import Sales from "./screens/Sales";
import Payment from "./screens/Payment";
import Receipt from "./screens/Receipt";
import Riwayat from "./screens/Riwayat";
import Produk from "./screens/Produk";
import Kas from "./screens/Kas";
import Laporan from "./screens/Laporan";
import PindahShift from "./screens/PindahShift";
import TutupToko from "./screens/TutupToko";
import CheckIn from "./screens/CheckIn";

// Read synchronously at module load — before Supabase's async detectSessionInUrl strips the token.
// Covers every reset-link shape: implicit (#...type=recovery), PKCE (?code=),
// token_hash (?token_hash=...&type=recovery), and error hashes (#error_code=otp_expired).
const urlHasResetCode = (() => {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search);
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const has = (k: string) => q.has(k) || h.has(k);
  const type = q.get("type") || h.get("type");
  const isSetPassword = type === "recovery" || type === "invite";
  return has("code") || has("token_hash") || isSetPassword || has("error_code") || has("error");
})();

const DEMO_STORE_ID = "42dea26b-82a2-4b1b-b5fd-c573687df422";

const DEMO_CASHIER = {
  id: "ae",
  store_id: DEMO_STORE_ID,
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
  const setDemoMode = useStore(s => s.setDemoMode);
  const isDemoMode = useStore(s => s.isDemoMode);
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      const mobile = w < 768;
      setIsMobile(mobile);
      if (!mobile) {
        const s = Math.min(
          (w * 0.96) / 1366,
          (window.innerHeight - 32) / 900,
          1
        );
        setScale(s);
      }
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true") {
      setDemoMode(true);
      setStoreData(DEMO_STORE_ID, "Demo Toko", "Jl. Diponegoro No. 24, Palu Timur", [DEMO_CASHIER], "0812-3456-7890", "", "", "premium");
      setScreen("sales");
    }
  }, []);

  useEffect(() => {
    // If ?code= was in the URL when the page loaded, this is a password reset flow
    if (urlHasResetCode) {
      setScreen("reset-password");
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setScreen("reset-password");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />;
  if (screen === "reset-password") return <ResetPassword />;
  if (screen === "owner-login") return <><OwnerLogin /><UpdateBanner /></>;
  if (screen === "checkin")     return <CheckIn />;

  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-cream-bg overflow-hidden">
        <UpdateBanner />
        {isDemoMode && <DemoTierSwitcher />}
        {screen === "login"        && <PinLogin />}
        {screen === "sales"        && <Sales />}
        {screen === "payment"      && <Payment />}
        {screen === "receipt"      && <Receipt />}
        {screen === "riwayat"      && <Riwayat />}
        {screen === "produk"       && <Produk />}
        {screen === "kas"          && <Kas />}
        {screen === "laporan"      && <Laporan />}
        {screen === "pindah-shift" && <PindahShift />}
        {screen === "tutup-toko"   && <TutupToko />}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-cream-deep flex items-center justify-center overflow-hidden">
      <UpdateBanner />
      {isDemoMode && <DemoTierSwitcher />}
      <div
        className="rounded-card shadow-tablet overflow-hidden bg-cream-bg"
        style={{ width: Math.round(1366 * scale), height: Math.round(900 * scale) }}
      >
        <div style={{ width: 1366, height: 900, transformOrigin: "top left", transform: `scale(${scale})` }}>
          {screen === "login"        && <PinLogin />}
          {screen === "sales"        && <Sales />}
          {screen === "payment"      && <Payment />}
          {screen === "receipt"      && <Receipt />}
          {screen === "riwayat"      && <Riwayat />}
          {screen === "produk"       && <Produk />}
          {screen === "kas"          && <Kas />}
          {screen === "laporan"      && <Laporan />}
          {screen === "pindah-shift" && <PindahShift />}
          {screen === "tutup-toko"   && <TutupToko />}
        </div>
      </div>
    </div>
  );
}
