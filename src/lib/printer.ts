// Thermal receipt printing over Web Bluetooth (Android / desktop Chrome) or
// WebUSB (desktop). ESC/POS byte stream. Cheap 58/80mm printers vary wildly, so
// everything here is best-effort and heavily guarded — a print failure must never
// throw into the sale flow (Receipt catches and falls back to the on-screen struk).
//
// Apple note: iOS/iPadOS have NO Web Bluetooth. `bluetoothSupported()` returns
// false there and the UI shows a warning instead of a dead scan button.

export type PrinterConn = "bluetooth" | "usb";
export type Density = "ringan" | "normal" | "tebal";
export interface PrinterConfig { type: PrinterConn; paper: 58 | 80; name: string; density?: Density }

// Print darkness. Several commands per level, because no single one is honoured
// across these printers:
//
//   ESC 7 n1 n2 n3  max dots, heating TIME, heating interval. Heating time is the
//                   real control — the head stays hot longer per dot so more of
//                   the paper reacts. Capped at 180; far higher cooks the head.
//   DC2 # n         vendor density on the Zjiang/POS58 family.
//   ESC E 1         emphasized.
//   ESC G 1         double-strike — prints every line twice. Core ESC/POS, so it
//                   works even where the density commands are ignored, at the
//                   cost of halving print speed.
//
// Default is NORMAL, which stops short of double-strike. A faint struk is far
// more often old or cheap thermal paper than a printer setting: an RPP02N here
// printed faint through every density level and came out perfectly the moment the
// roll was changed. Tebal is one tap away for customers stuck with poor paper,
// but nobody should pay double print time by default for a paper problem.
const DENSITY_BYTES: Record<Density, number[]> = {
  ringan: [0x1b, 0x37, 7, 60, 2,
           0x1b, 0x45, 0, 0x1b, 0x47, 0],                  // no emphasis
  normal: [0x1b, 0x37, 7, 110, 2, 0x12, 0x23, 8,
           0x1b, 0x45, 1, 0x1b, 0x47, 0],                  // emphasized only
  tebal:  [0x1b, 0x37, 7, 180, 2, 0x12, 0x23, 15,
           0x1b, 0x45, 1, 0x1b, 0x47, 1],                  // + double-strike
};

const LS_KEY = "sterith_printer";

export function loadPrinterConfig(): PrinterConfig | null {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) as PrinterConfig : null; }
  catch { return null; }
}
export function savePrinterConfig(c: PrinterConfig) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}
export function clearPrinterConfig() {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

// ── Capability detection ──
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOSUA = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Mac; detect touch Macs too.
  const iPadOS = navigator.platform === "MacIntel" && (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints! > 1;
  return iOSUA || iPadOS;
}
export function bluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && !!(navigator as unknown as { bluetooth?: unknown }).bluetooth;
}
export function usbSupported(): boolean {
  return typeof navigator !== "undefined" && !!(navigator as unknown as { usb?: unknown }).usb;
}
export function isDesktop(): boolean {
  return typeof window !== "undefined" && window.innerWidth >= 1024;
}

// Candidate BLE services exposed by common ESC/POS printers. requestDevice needs
// them declared as optionalServices before their characteristics are reachable.
const PRINTER_SERVICES = [
  0x18f0,                                    // generic printer service (many 58mm)
  0xff00, 0xff10, 0xffe0, 0xfff0,            // vendor serial-style services
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",    // Microchip/ISSC transparent UART
  "0000ff00-0000-1000-8000-00805f9b34fb",
];

// Live connection handles (module-scoped; one printer per till device).
type AnyChar = { writeValueWithoutResponse?: (b: BufferSource) => Promise<void>; writeValue: (b: BufferSource) => Promise<void> };
type GattServer = { getPrimaryServices: () => Promise<Array<{ uuid?: string; getCharacteristics: () => Promise<Array<{ uuid?: string; properties?: Record<string, boolean> }>> }>> };
let btChar: AnyChar | null = null;
let btServer: GattServer | null = null;   // kept for the dev service dump
let btCandidates: AnyChar[] = [];         // every writable char, best guess first
let btCharUuid = "";                 // which pipe we picked — surfaced on dev builds
let btName = "";
let usbDev: { transferOut: (ep: number, data: BufferSource) => Promise<unknown>; opened?: boolean } | null = null;
let usbEndpoint = 1;
let usbName = "";

export function isConnected(): boolean { return !!btChar || !!usbDev; }
export function connectedName(): string { return btName || usbName || ""; }
// Which characteristic we chose to print through. Shown on dev builds only —
// when a printer connects but no paper moves, this is the first thing to check.
export function connectedCharUuid(): string { return btCharUuid; }

// Characteristics that are actually the print pipe on common ESC/POS printers.
// 2af1 belongs to the standard 18f0 printer service; the rest are vendor serial
// bridges (ff02 on the MPT/POS58 family, ffe1 on HM-10 style modules).
const WRITE_CHARS = ["2af1", "ff02", "ff01", "ffe1", "fff1", "fff2"];
const ISSC_WRITE = "49535343-8841-43f4-a8d4-ecbe34729bb3";

// "0000ff02-0000-1000-8000-00805f9b34fb" -> "ff02"; leaves custom UUIDs alone.
const shortUuid = (u: string) =>
  /^0000[0-9a-f]{4}-0000-1000-8000-00805f9b34fb$/i.test(u) ? u.slice(4, 8).toLowerCase() : u.toLowerCase();

type Candidate = { ch: AnyChar; score: number };

/**
 * Pick the characteristic that actually drives the paper.
 *
 * This used to return the FIRST writable characteristic in the first service the
 * browser happened to list. Printers commonly expose several — config, status,
 * data — and writing ESC/POS to the wrong one succeeds silently: the app reports
 * "struk terkirim" and nothing comes out. So candidates are scored instead, by
 * how strongly the UUIDs say "this is the printer's data pipe".
 */
async function findWritableChar(server: { getPrimaryServices: () => Promise<Array<{ uuid?: string; getCharacteristics: () => Promise<Array<{ uuid?: string; properties: { write: boolean; writeWithoutResponse: boolean } } & AnyChar>> }>> }): Promise<AnyChar | null> {
  const services = await server.getPrimaryServices();
  const found: Candidate[] = [];

  for (const svc of services) {
    let chars;
    try { chars = await svc.getCharacteristics(); } catch { continue; }
    const svcShort = shortUuid(svc.uuid ?? "");
    for (const ch of chars) {
      if (!ch.properties?.write && !ch.properties?.writeWithoutResponse) continue;
      const chShort = shortUuid(ch.uuid ?? "");
      let score = 0;
      // The ISSC transparent UART outranks everything. It is a dedicated
      // serial-over-BLE bridge, so when a printer exposes it that IS the data
      // path — the short vendor UUIDs beside it (ff00/ff02) are usually a
      // control channel that swallows ESC/POS without printing. Learned from an
      // MPT-III-BQ that paired, accepted every byte, and produced no paper.
      if (chShort === ISSC_WRITE) score += 8;
      if (WRITE_CHARS.includes(chShort)) score += 4;          // known data pipe
      if (["18f0", "ff00", "ffe0", "fff0", "ff10"].includes(svcShort)) score += 2;
      if (ch.properties?.writeWithoutResponse) score += 1;    // what printers expect
      found.push({ ch, score });
    }
  }
  if (!found.length) return null;
  found.sort((a, b) => b.score - a.score);
  btCandidates = found.map(f => f.ch);
  btCharUuid = (found[0].ch as unknown as { uuid?: string }).uuid ?? "";
  return found[0].ch;
}

/** Every writable characteristic, best guess first. Dev builds let you try each. */
export function listPipes(): string[] {
  return btCandidates.map(c => (c as unknown as { uuid?: string }).uuid ?? "?");
}

/** Point printing at a specific characteristic — used to find the real pipe. */
export function setPipe(uuid: string): void {
  const hit = btCandidates.find(c => (c as unknown as { uuid?: string }).uuid === uuid);
  if (hit) { btChar = hit; btCharUuid = uuid; }
}

export async function connectBluetooth(): Promise<string> {
  const bt = (navigator as unknown as { bluetooth: { requestDevice: (o: unknown) => Promise<{ name?: string; gatt?: { connect: () => Promise<{ getPrimaryServices: () => Promise<unknown> }> } }> } }).bluetooth;
  const device = await bt.requestDevice({ acceptAllDevices: true, optionalServices: PRINTER_SERVICES });
  if (!device.gatt) throw new Error("Printer tidak mendukung koneksi.");
  const server = await device.gatt.connect();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ch = await findWritableChar(server as any);
  if (!ch) throw new Error("Karakteristik cetak tidak ditemukan di printer ini.");
  btChar = ch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  btServer = server as any;
  btName = device.name || "Printer Bluetooth";
  usbDev = null;
  return btName;
}

/**
 * Dev-only: list every service and characteristic the printer exposes.
 *
 * When a printer pairs, accepts the bytes and prints nothing, the question is
 * always "did we write to the right pipe, or does this device even have one over
 * BLE?" — dual-mode printers often expose GATT for configuration while printing
 * lives on Bluetooth Classic, which the web platform cannot reach at all. This
 * answers that in one screenshot instead of a round trip per guess.
 */
export interface DumpChar { uuid: string; short: string; flags: string }
export interface DumpSvc { short: string; chars: DumpChar[] }

export async function dumpServices(): Promise<DumpSvc[]> {
  if (!btServer) throw new Error("Belum terhubung ke printer.");
  const out: DumpSvc[] = [];
  const services = await btServer.getPrimaryServices();
  for (const svc of services) {
    const entry: DumpSvc = { short: shortUuid(svc.uuid ?? "?"), chars: [] };
    let chars;
    try { chars = await svc.getCharacteristics(); } catch { out.push(entry); continue; }
    for (const ch of chars) {
      const p = ch.properties ?? ({} as Record<string, boolean>);
      const uuid = (ch as unknown as { uuid?: string }).uuid ?? "?";
      entry.chars.push({
        uuid,
        short: shortUuid(uuid),
        flags: [p.write && "write", p.writeWithoutResponse && "wnr", p.read && "read", p.notify && "notify"]
          .filter(Boolean).join(",") || "none",
      });
    }
    out.push(entry);
  }
  return out;
}

export async function connectUsb(): Promise<string> {
  const usb = (navigator as unknown as { usb: { requestDevice: (o: unknown) => Promise<{ productName?: string; open: () => Promise<void>; selectConfiguration: (n: number) => Promise<void>; claimInterface: (n: number) => Promise<void>; configuration?: { interfaces: Array<{ interfaceNumber: number; alternate: { endpoints: Array<{ direction: string; endpointNumber: number }> } }> } } & typeof usbDev> } }).usb;
  const dev = await usb.requestDevice({ filters: [{ classCode: 7 }] }); // 7 = printer class
  await dev.open();
  if (!dev.configuration) await dev.selectConfiguration(1);
  const iface = dev.configuration!.interfaces.find(i => i.alternate.endpoints.some(e => e.direction === "out"));
  if (!iface) throw new Error("Endpoint printer tidak ditemukan.");
  await dev.claimInterface(iface.interfaceNumber);
  usbEndpoint = iface.alternate.endpoints.find(e => e.direction === "out")!.endpointNumber;
  usbDev = dev;
  usbName = dev.productName || "Printer USB";
  btChar = null;
  return usbName;
}

async function writeChunks(bytes: Uint8Array) {
  if (btChar) {
    // BLE's default MTU is 23 bytes, leaving 20 for payload. Chrome will not
    // fragment for you, and a cheap printer given 128 bytes usually drops the
    // write without complaining — the app then reports success and no paper
    // moves. 20 is the size every BLE peripheral is required to accept.
    const CHUNK = 20;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      const slice = bytes.slice(i, i + CHUNK);
      if (btChar.writeValueWithoutResponse) await btChar.writeValueWithoutResponse(slice);
      else await btChar.writeValue(slice);
      await new Promise(r => setTimeout(r, 20));   // give the buffer time to drain
    }
  } else if (usbDev) {
    const CHUNK = 128;                              // bulk transfer handles this fine
    for (let i = 0; i < bytes.length; i += CHUNK) {
      await usbDev.transferOut(usbEndpoint, bytes.slice(i, i + CHUNK));
    }
  } else {
    throw new Error("Printer belum terhubung.");
  }
}

// ── ESC/POS receipt builder ──
export interface PrintLine { name: string; qty: number; price: number }
export interface ReceiptData {
  storeName: string; storeAddress?: string; storePhone?: string;
  trxId: string; dateStr: string; timeStr: string; cashierName: string;
  items: PrintLine[]; total: number; method: string;
  cashReceived?: number; change?: number;
  hutangName?: string; hutangPhone?: string; customerName?: string; footer?: string;
}

const rp = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");
// Strip to printable latin1 so cheap printers don't garble.
const clean = (s: string) => s.replace(/[×✕]/g, "x").replace(/[–—]/g, "-").replace(/[^\x20-\x7E]/g, "");

function encode(parts: (Uint8Array | string)[]): Uint8Array {
  const chunks: Uint8Array[] = parts.map(p => {
    if (typeof p !== "string") return p;
    // clean() strips everything outside \x20-\x7E so cheap printers don't garble,
    // but LF is \x0A — running it over an assembled block deleted every line
    // break, so the whole receipt arrived as one run of text and only looked
    // like lines because the printer wrapped it at 32 columns. Clean each line,
    // keep the breaks between them.
    const s = p.split("\n").map(clean).join("\n");
    const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
    return b;
  });
  const len = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(len);
  let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/**
 * Text helpers for a fixed-width roll. 58mm paper is 32 characters at Font A and
 * 80mm is 48; anything longer does not clip, it WRAPS — so an untrimmed line
 * silently pushes the rest of the receipt out of alignment. Everything here
 * guarantees its output fits.
 */
function formatters(W: number) {
  const fit = (s: string, n = W) => { s = clean(s); return s.length > n ? s.slice(0, n) : s; };

  const line = (l: string, r: string) => {
    r = fit(r);                                  // the number always wins
    const room = Math.max(1, W - r.length - 1);  // at least one char of label
    l = fit(l, room);
    return l + " ".repeat(Math.max(1, W - l.length - r.length)) + r + "\n";
  };

  const center = (s: string) => {
    s = fit(s);
    return " ".repeat(Math.max(0, Math.floor((W - s.length) / 2))) + s + "\n";
  };

  // Long product names get folded rather than truncated — the cashier needs to
  // read what was sold, and a receipt has all the vertical space in the world.
  const wrap = (s: string): string => {
    s = clean(s);
    if (s.length <= W) return s + "\n";
    const out: string[] = [];
    let cur = "";
    for (const word of s.split(" ")) {
      if (!cur.length) cur = word.slice(0, W);
      else if (cur.length + 1 + word.length <= W) cur += " " + word;
      else { out.push(cur); cur = word.slice(0, W); }
    }
    if (cur) out.push(cur);
    return out.join("\n") + "\n";
  };

  // Label + value, but a value too long to sit beside its label drops onto its own
  // wrapped line rather than being cut. Names on a bon must be complete — half a
  // name on a debt record is worse than an extra line of paper.
  const field = (label: string, value: string) => {
    const v = clean(value);
    return (label.length + v.length + 1 <= W) ? line(label, v) : label + ":\n" + wrap("  " + v);
  };

  return { fit, line, center, wrap, field, rule: "-".repeat(W) + "\n" };
}

export function buildReceipt(d: ReceiptData, paper: 58 | 80, density: Density = "normal"): Uint8Array {
  const W = paper === 80 ? 48 : 32;
  const ESC = 0x1b, GS = 0x1d;
  const cmd = (...b: number[]) => new Uint8Array(b);
  const { fit, line, center, wrap, field, rule } = formatters(W);

  const parts: (Uint8Array | string)[] = [];
  parts.push(cmd(ESC, 0x40));                 // init
  parts.push(new Uint8Array(DENSITY_BYTES[density] ?? DENSITY_BYTES.normal));   // darkness
  parts.push(cmd(ESC, 0x61, 0x01));           // center
  // Double WIDTH halves the usable columns — 16 on a 58mm roll — so a longer
  // store name wrapped mid-word. Wide only while it fits, tall otherwise.
  const wide = clean(d.storeName).length <= Math.floor(W / 2);
  parts.push(cmd(ESC, 0x21, wide ? 0x30 : 0x10));
  parts.push(fit(d.storeName, wide ? Math.floor(W / 2) : W) + "\n");
  parts.push(cmd(ESC, 0x21, 0x00));           // normal
  if (d.storeAddress) parts.push(center(d.storeAddress));
  if (d.storePhone) parts.push(center(d.storePhone));
  parts.push(cmd(ESC, 0x61, 0x00));           // left
  parts.push("\n");
  parts.push(line(d.trxId, d.dateStr + " " + d.timeStr));
  parts.push(wrap("Kasir: " + d.cashierName));
  if (d.customerName) parts.push(wrap("Pelanggan: " + d.customerName));
  parts.push(rule);
  for (const it of d.items) {
    parts.push(wrap(it.name));
    parts.push(line(`  ${it.qty} x ${rp(it.price)}`, rp(it.qty * it.price)));
  }
  parts.push(rule);
  parts.push(cmd(ESC, 0x21, 0x08));           // emphasized
  parts.push(line("TOTAL", rp(d.total)));
  parts.push(cmd(ESC, 0x21, 0x00));
  if (d.method === "hutang") {
    // A bon is the customer's own record of a debt, so it carries who owes it,
    // how much, and how to reach them — and a line to sign. It used to print
    // only a name, which is not something you can act on weeks later.
    parts.push(rule);
    parts.push(cmd(ESC, 0x61, 0x01));
    parts.push(cmd(ESC, 0x21, 0x08));
    parts.push("BELUM DIBAYAR\n");
    parts.push(cmd(ESC, 0x21, 0x00));
    parts.push(cmd(ESC, 0x61, 0x00));
    if (d.hutangName) parts.push(field("Nama", d.hutangName));
    if (d.hutangPhone) parts.push(field("WhatsApp", d.hutangPhone));
    parts.push(line("Jumlah hutang", rp(d.total)));
    parts.push("\nTanda tangan,\n\n\n");
    parts.push("(............................)\n");
  } else if (d.method === "tunai") {
    parts.push(line("Tunai", rp(d.cashReceived ?? d.total)));
    parts.push(line("Kembalian", rp(d.change ?? 0)));
  } else {
    parts.push(line("Metode", d.method.toUpperCase() + " - LUNAS"));
  }
  parts.push(rule);
  parts.push(cmd(ESC, 0x61, 0x01));           // center
  parts.push(center(d.footer || "Terima kasih"));
  parts.push("\n\n\n\n");
  parts.push(cmd(GS, 0x56, 0x42, 0x00));      // partial cut (ignored if unsupported)
  return encode(parts);
}

export async function printReceipt(d: ReceiptData, paper: 58 | 80): Promise<void> {
  await writeChunks(buildReceipt(d, paper, loadPrinterConfig()?.density ?? "normal"));
}

// ── Nota Tutup Shift ──
export interface ShiftClosingPrint {
  storeName: string; dateStr: string; closedTime: string;
  cashierName: string; shiftCount: number;
  omzet: number; trx: number; breakdown: Record<string, number>; piutangBaru: number;
  modalAwal: number; cash: number; hutangSettle: number; kasMasuk: number; kasKeluar: number;
  expected: number; counted: number | null; selisih: number | null; reconciled: boolean;
  autoClosed: boolean;
}

const CLOSING_METHOD: Record<string, string> = {
  tunai: "Tunai", qris: "QRIS", transfer: "Transfer",
  debit: "Debit", ewallet: "E-Wallet", hutang: "Hutang/Bon",
};

/**
 * The closing nota on paper. Deliberately mirrors the on-screen version line for
 * line, including the drawer working — the whole point is that the owner can
 * check the arithmetic without the app, sign it, and file it.
 */
export function buildShiftClosing(d: ShiftClosingPrint, paper: 58 | 80, density: Density = "normal"): Uint8Array {
  const W = paper === 80 ? 48 : 32;
  const ESC = 0x1b, GS = 0x1d;
  const cmd = (...b: number[]) => new Uint8Array(b);
  const { line, center, rule } = formatters(W);

  const p: (Uint8Array | string)[] = [];
  p.push(cmd(ESC, 0x40));
  p.push(new Uint8Array(DENSITY_BYTES[density] ?? DENSITY_BYTES.normal));
  p.push(cmd(ESC, 0x61, 0x01));                    // centre
  p.push(cmd(ESC, 0x21, 0x10));                    // double height, single width
  p.push(center(d.storeName));
  p.push(cmd(ESC, 0x21, 0x00));
  p.push(center("NOTA TUTUP SHIFT"));
  // The full date ("Selasa, 5 Agustus 2026") is 22 chars and fits 58mm; longer
  // locales get trimmed by center() rather than wrapping onto a second line.
  p.push(center(d.dateStr));
  p.push(cmd(ESC, 0x61, 0x00));                    // left
  p.push(rule);
  p.push(line("Kasir", d.cashierName || "-"));
  p.push(line("Shift", String(d.shiftCount)));
  p.push(line("Ditutup", d.closedTime + (d.autoClosed ? " (otomatis)" : "")));
  p.push(rule);
  p.push("PENJUALAN PER METODE\n");
  for (const m of ["tunai", "qris", "transfer", "debit", "ewallet", "hutang"]) {
    if ((d.breakdown[m] ?? 0) > 0) p.push(line(CLOSING_METHOD[m] ?? m, rp(d.breakdown[m])));
  }
  p.push(line("Transaksi", String(d.trx)));
  p.push(rule);
  p.push(cmd(ESC, 0x45, 1));
  p.push(line("TOTAL OMSET", rp(d.omzet)));
  p.push(cmd(ESC, 0x45, 0));
  if (d.piutangBaru > 0) p.push(line("Belum diterima*", rp(d.piutangBaru)));
  p.push(rule);
  p.push("KAS / LACI\n");
  p.push(line("Modal awal", rp(d.modalAwal)));
  if (d.cash > 0) p.push(line("Tunai", "+" + rp(d.cash)));
  if (d.hutangSettle > 0) p.push(line("Pelunasan hutang", "+" + rp(d.hutangSettle)));
  if (d.kasMasuk > 0) p.push(line("Kas masuk", "+" + rp(d.kasMasuk)));
  if (d.kasKeluar > 0) p.push(line("Kas keluar", "-" + rp(d.kasKeluar)));
  p.push(cmd(ESC, 0x45, 1));
  p.push(line("SEHARUSNYA DI LACI", rp(d.expected)));
  p.push(cmd(ESC, 0x45, 0));
  if (d.reconciled) {
    p.push(line("Dihitung", rp(d.counted ?? 0)));
    const s = d.selisih ?? 0;
    p.push(line("Selisih", (s > 0 ? "+" : s < 0 ? "-" : "") + rp(Math.abs(s))));
  } else {
    p.push("Ditutup tanpa hitung kas.\n");
  }
  if (d.piutangBaru > 0) { p.push(rule); p.push("*sudah termasuk di omset\n"); }
  p.push(rule);
  // Space for a signature: this is the document an owner files, and a shift
  // handover is worth having signed by whoever counted the drawer.
  p.push("\nDihitung oleh,\n\n\n");
  p.push("(............................)\n");
  p.push("\n\n\n");
  p.push(cmd(GS, 0x56, 0x42, 0x00));
  return encode(p);
}

export async function printShiftClosing(d: ShiftClosingPrint, paper: 58 | 80): Promise<void> {
  await writeChunks(buildShiftClosing(d, paper, loadPrinterConfig()?.density ?? "normal"));
}

// ── Tanda Lunas ──
export interface LunasPrint {
  storeName: string; storePhone?: string;
  customerName: string; customerPhone?: string;
  amount: number; method: string;
  trxId?: string | null;          // the sale the bon came from
  bonDateStr?: string;            // when the debt was incurred
  settledDateStr: string; settledTimeStr: string;
  cashierName?: string;
}

/**
 * Proof a debt was cleared. This is the customer's protection more than the
 * shop's: without it, the only record that a bon was paid lives in the shop's
 * app, and a warung's bon book is exactly where disputes start.
 */
export function buildLunas(d: LunasPrint, paper: 58 | 80, density: Density = "normal"): Uint8Array {
  const W = paper === 80 ? 48 : 32;
  const ESC = 0x1b, GS = 0x1d;
  const cmd = (...b: number[]) => new Uint8Array(b);
  const { fit, center, field, line, rule } = formatters(W);

  const p: (Uint8Array | string)[] = [];
  p.push(cmd(ESC, 0x40));
  p.push(new Uint8Array(DENSITY_BYTES[density] ?? DENSITY_BYTES.normal));
  p.push(cmd(ESC, 0x61, 0x01));
  const wide = clean(d.storeName).length <= Math.floor(W / 2);
  p.push(cmd(ESC, 0x21, wide ? 0x30 : 0x10));
  p.push(fit(d.storeName, wide ? Math.floor(W / 2) : W) + "\n");
  p.push(cmd(ESC, 0x21, 0x00));
  if (d.storePhone) p.push(center(d.storePhone));
  p.push("\n");
  p.push(cmd(ESC, 0x21, 0x08));
  p.push(center("TANDA LUNAS"));
  p.push(cmd(ESC, 0x21, 0x00));
  p.push(cmd(ESC, 0x61, 0x00));
  p.push(rule);
  p.push(field("Nama", d.customerName));
  if (d.customerPhone) p.push(field("WhatsApp", d.customerPhone));
  if (d.trxId) p.push(field("No. transaksi", d.trxId));
  if (d.bonDateStr) p.push(field("Tanggal bon", d.bonDateStr));
  p.push(rule);
  p.push(cmd(ESC, 0x21, 0x08));
  p.push(line("DIBAYAR", rp(d.amount)));
  p.push(cmd(ESC, 0x21, 0x00));
  p.push(line("Metode", d.method.toUpperCase()));
  p.push(line("Tanggal lunas", d.settledDateStr));
  p.push(line("Jam", d.settledTimeStr));
  if (d.cashierName) p.push(field("Diterima oleh", d.cashierName));
  p.push(rule);
  p.push(cmd(ESC, 0x61, 0x01));
  p.push(center("Hutang LUNAS. Terima kasih."));
  p.push(cmd(ESC, 0x61, 0x00));
  p.push("\nTanda tangan,\n\n\n");
  p.push("(............................)\n");
  p.push("\n\n\n");
  p.push(cmd(GS, 0x56, 0x42, 0x00));
  return encode(p);
}

export async function printLunas(d: LunasPrint, paper: 58 | 80): Promise<void> {
  await writeChunks(buildLunas(d, paper, loadPrinterConfig()?.density ?? "normal"));
}

// Small sample so owners can confirm the printer works before going live.
export async function testPrint(paper: 58 | 80): Promise<void> {
  await printReceipt({
    storeName: "STERITH POS", storeAddress: "Tes Printer", trxId: "#TEST-0001",
    dateStr: new Date().toLocaleDateString("id-ID"), timeStr: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    cashierName: "Tes", items: [{ name: "Contoh Barang A", qty: 2, price: 5000 }, { name: "Contoh Barang B", qty: 1, price: 12000 }],
    total: 22000, method: "tunai", cashReceived: 25000, change: 3000, footer: "Printer siap dipakai!",
  }, paper);
}
