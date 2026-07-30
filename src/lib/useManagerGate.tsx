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
  const isPremium = isAtLeast(storeId ? storeTier : "premium", "premium");
  const currentRole = (dbCashiers.find(c => c.id === selectedCashier)?.role ?? "").toLowerCase();
  const [g, setG] = useState<{ action: string; run: () => void } | null>(null);

  function gate(action: string, fn: () => void) {
    if (isPremium && !isDemoMode && (currentRole === "manajer" || currentRole === "kasir")) { setG({ action, run: fn }); return; }
    fn();
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
