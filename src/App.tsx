import { useEffect, useState } from "react";
import { useStore } from "./store";
import { supabase } from "./lib/supabase";
import OwnerLogin from "./screens/OwnerLogin";
import ResetPassword from "./screens/ResetPassword";
import UpdateBanner from "./components/UpdateBanner";
import { DemoControls } from "./components/DemoControls";
import { RenewBanner } from "./components/RenewBanner";
import { initSync } from "./lib/sync";
import LogAktivitas from "./screens/LogAktivitas";
import TutupShiftRiwayat from "./screens/TutupShiftRiwayat";
import BackofficeDemo from "./screens/BackofficeDemo";
import SplashScreen from "./components/SplashScreen";
import PinLogin from "./screens/PinLogin";
import Sales from "./screens/Sales";
import Payment from "./screens/Payment";
import Receipt from "./screens/Receipt";
import Riwayat from "./screens/Riwayat";
import Produk from "./screens/Produk";
import Kas from "./screens/Kas";
import Hutang from "./screens/Hutang";
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
  return has("code") || has("token_hash") || has("setup_token") || isSetPassword || has("error_code") || has("error");
})();

export default function App() {
  const screen = useStore(s => s.screen);
  const setScreen = useStore(s => s.setScreen);
  const startDemo = useStore(s => s.startDemo);
  const isDemoMode = useStore(s => s.isDemoMode);
  const demoView = useStore(s => s.demoView);
  const subscriptionExpired = useStore(s => s.subscriptionExpired);
  const storeId = useStore(s => s.storeId);
  const signOut = useStore(s => s.signOut);
  const [isMobile, setIsMobile] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const calc = () => setIsMobile(window.innerWidth < 768);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => { initSync(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true") {
      startDemo();
      // Optional demo deep-link: jump straight to a screen / tier (QA + demos).
      const scr = params.get("screen");
      if (scr) setScreen(scr as Parameters<typeof setScreen>[0]);
      const tier = params.get("tier");
      if (tier) useStore.getState().setStoreTier(tier);
    }
  }, []);

  // Auto-logout when the store is suspended from Masteroffice (checked while the
  // session is still valid, so it kicks in before the banned token even expires).
  useEffect(() => {
    if (!storeId || isDemoMode) return;
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase.from("stores").select("status").eq("id", storeId).maybeSingle();
      if (!cancelled && data && data.status && data.status !== "active") {
        await supabase.auth.signOut();
        signOut();
      }
    };
    check();
    const t = setInterval(check, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, [storeId, isDemoMode, signOut]);

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
  if (isDemoMode && demoView === "back") return <BackofficeDemo />;

  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-cream-bg overflow-hidden flex flex-col">
        <UpdateBanner />
        {isDemoMode && <div className="shrink-0 flex justify-center py-1.5 bg-cream-deep"><DemoControls /></div>}
        {!isDemoMode && subscriptionExpired && <div className="shrink-0 flex justify-center py-1.5 bg-cream-deep"><RenewBanner /></div>}
        <div className="flex-1 min-h-0 relative">
          {screen === "login"        && <PinLogin />}
          {screen === "sales"        && <Sales />}
          {screen === "payment"      && <Payment />}
          {screen === "receipt"      && <Receipt />}
          {screen === "riwayat"      && <Riwayat />}
          {screen === "produk"       && <Produk />}
          {screen === "kas"          && <Kas />}
          {screen === "hutang"       && <Hutang />}
          {screen === "laporan"      && <Laporan />}
          {screen === "pindah-shift" && <PindahShift />}
          {screen === "tutup-toko"   && <TutupToko />}
          {screen === "log"          && <LogAktivitas />}
          {screen === "shift-riwayat" && <TutupShiftRiwayat />}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-cream-bg overflow-hidden flex flex-col">
      <UpdateBanner />
      {isDemoMode && <div className="shrink-0 flex justify-center py-1.5 bg-cream-deep"><DemoControls /></div>}
      {!isDemoMode && subscriptionExpired && <div className="shrink-0 flex justify-center py-1.5 bg-cream-deep"><RenewBanner /></div>}
      <div className="flex-1 min-h-0 relative">
        {screen === "login"        && <PinLogin />}
        {screen === "sales"        && <Sales />}
        {screen === "payment"      && <Payment />}
        {screen === "receipt"      && <Receipt />}
        {screen === "riwayat"      && <Riwayat />}
        {screen === "produk"       && <Produk />}
        {screen === "kas"          && <Kas />}
        {screen === "hutang"       && <Hutang />}
        {screen === "laporan"      && <Laporan />}
        {screen === "pindah-shift" && <PindahShift />}
        {screen === "tutup-toko"   && <TutupToko />}
        {screen === "log"          && <LogAktivitas />}
          {screen === "shift-riwayat" && <TutupShiftRiwayat />}
      </div>
    </div>
  );
}
