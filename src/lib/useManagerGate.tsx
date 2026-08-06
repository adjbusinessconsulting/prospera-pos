import { useState } from "react";
import { useStore, isAtLeast } from "../store";
import { ManagerApproval } from "../components/ManagerApproval";

// Manager-override gate (Phase 2), reusable across screens. On Premium, a
// manager/cashier at the register must get owner-or-authorized-manager approval
// for a gated action; the owner acts freely, and Free/Standard have no manager
// roles so they pass straight through. Returns `gate(action, fn)` and the modal
// element to drop into the screen's JSX.
export function useManagerGate() {
  const storeTier = useStore(s => s.storeTier);
  const storeId = useStore(s => s.storeId);
  const isDemoMode = useStore(s => s.isDemoMode);
  const dbCashiers = useStore(s => s.dbCashiers);
  const selectedCashier = useStore(s => s.selectedCashier);
  const settings = useStore(s => s.settings);
  const isPremium = isAtLeast(storeId ? storeTier : "premium", "premium");
  const currentRole = (dbCashiers.find(c => c.id === selectedCashier)?.role ?? "").toLowerCase();
  const [g, setG] = useState<{ action: string; run: () => void } | null>(null);

  function gate(action: string, fn: () => void) {
    if (!isPremium || isDemoMode) { fn(); return; }
    // The owner always passes.
    if (currentRole !== "manajer" && currentRole !== "kasir") { fn(); return; }
    // "Semua" in Back Office: nobody is asked, kasir included. Set per action by
    // the owner, because a one-person warung should not have to authorise itself
    // to look at its own Laporan.
    if ((settings.openPerms ?? {})[action]) { fn(); return; }
    // "Manajer": a manager the owner has trusted acts alone; a kasir still asks.
    if (currentRole === "manajer" && (settings.managerPerms ?? {})[action]) { fn(); return; }
    setG({ action, run: fn });
  }

  const gateModal = (
    <ManagerApproval
      open={!!g}
      action={g?.action ?? ""}
      onClose={() => setG(null)}
      onApproved={() => { const r = g?.run; setG(null); r?.(); }}
    />
  );

  return { gate, gateModal };
}
