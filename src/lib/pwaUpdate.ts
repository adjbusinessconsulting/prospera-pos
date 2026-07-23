// Holds the service-worker registration (captured by UpdateBanner's useRegisterSW)
// so a "Cek pembaruan" button anywhere in the app can force an update check.

let _reg: ServiceWorkerRegistration | undefined;

export function setRegistration(r?: ServiceWorkerRegistration) { _reg = r; }

// Force the browser to re-fetch the service worker now. Resolves true if a new
// version is installing/waiting afterwards — in which case UpdateBanner's
// needRefresh flips and its "Update Tersedia" prompt appears on its own.
export async function checkForUpdate(): Promise<boolean> {
  if (!_reg) return false;
  try { await _reg.update(); } catch { return false; }
  await new Promise((res) => setTimeout(res, 900));   // give an installing worker a moment
  return !!(_reg.waiting || _reg.installing);
}
