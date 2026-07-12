// Thermal receipt printing over Web Bluetooth (Android / desktop Chrome) or
// WebUSB (desktop). ESC/POS byte stream. Cheap 58/80mm printers vary wildly, so
// everything here is best-effort and heavily guarded — a print failure must never
// throw into the sale flow (Receipt catches and falls back to the on-screen struk).
//
// Apple note: iOS/iPadOS have NO Web Bluetooth. `bluetoothSupported()` returns
// false there and the UI shows a warning instead of a dead scan button.

export type PrinterConn = "bluetooth" | "usb";
export interface PrinterConfig { type: PrinterConn; paper: 58 | 80; name: string }

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
let btChar: AnyChar | null = null;
let btName = "";
let usbDev: { transferOut: (ep: number, data: BufferSource) => Promise<unknown>; opened?: boolean } | null = null;
let usbEndpoint = 1;
let usbName = "";

export function isConnected(): boolean { return !!btChar || !!usbDev; }
export function connectedName(): string { return btName || usbName || ""; }

async function findWritableChar(server: { getPrimaryServices: () => Promise<Array<{ getCharacteristics: () => Promise<Array<{ properties: { write: boolean; writeWithoutResponse: boolean } } & AnyChar>> }>> }): Promise<AnyChar | null> {
  const services = await server.getPrimaryServices();
  for (const svc of services) {
    let chars;
    try { chars = await svc.getCharacteristics(); } catch { continue; }
    for (const ch of chars) {
      if (ch.properties?.write || ch.properties?.writeWithoutResponse) return ch;
    }
  }
  return null;
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
  btName = device.name || "Printer Bluetooth";
  usbDev = null;
  return btName;
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
  const CHUNK = 128;
  if (btChar) {
    for (let i = 0; i < bytes.length; i += CHUNK) {
      const slice = bytes.slice(i, i + CHUNK);
      if (btChar.writeValueWithoutResponse) await btChar.writeValueWithoutResponse(slice);
      else await btChar.writeValue(slice);
      await new Promise(r => setTimeout(r, 18));
    }
  } else if (usbDev) {
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
  hutangName?: string; footer?: string;
}

const rp = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");
// Strip to printable latin1 so cheap printers don't garble.
const clean = (s: string) => s.replace(/[×✕]/g, "x").replace(/[–—]/g, "-").replace(/[^\x20-\x7E]/g, "");

function encode(parts: (Uint8Array | string)[]): Uint8Array {
  const chunks: Uint8Array[] = parts.map(p => {
    if (typeof p !== "string") return p;
    const s = clean(p);
    const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
    return b;
  });
  const len = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(len);
  let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

export function buildReceipt(d: ReceiptData, paper: 58 | 80): Uint8Array {
  const W = paper === 80 ? 48 : 32;
  const ESC = 0x1b, GS = 0x1d;
  const cmd = (...b: number[]) => new Uint8Array(b);
  const line = (l: string, r: string) => {
    l = clean(l); r = clean(r);
    if (l.length + r.length + 1 > W) l = l.slice(0, W - r.length - 1);
    const gap = Math.max(1, W - l.length - r.length);
    return l + " ".repeat(gap) + r + "\n";
  };
  const center = (s: string) => { s = clean(s); const pad = Math.max(0, Math.floor((W - s.length) / 2)); return " ".repeat(pad) + s + "\n"; };
  const rule = "-".repeat(W) + "\n";

  const parts: (Uint8Array | string)[] = [];
  parts.push(cmd(ESC, 0x40));                 // init
  parts.push(cmd(ESC, 0x61, 0x01));           // center
  parts.push(cmd(ESC, 0x21, 0x30));           // double width+height
  parts.push(clean(d.storeName) + "\n");
  parts.push(cmd(ESC, 0x21, 0x00));           // normal
  if (d.storeAddress) parts.push(center(d.storeAddress));
  if (d.storePhone) parts.push(center(d.storePhone));
  parts.push(cmd(ESC, 0x61, 0x00));           // left
  parts.push("\n");
  parts.push(line(d.trxId, d.dateStr + " " + d.timeStr));
  parts.push("Kasir: " + clean(d.cashierName) + "\n");
  parts.push(rule);
  for (const it of d.items) {
    parts.push(clean(it.name) + "\n");
    parts.push(line(`  ${it.qty} x ${rp(it.price)}`, rp(it.qty * it.price)));
  }
  parts.push(rule);
  parts.push(cmd(ESC, 0x21, 0x08));           // emphasized
  parts.push(line("TOTAL", rp(d.total)));
  parts.push(cmd(ESC, 0x21, 0x00));
  if (d.method === "hutang") {
    parts.push(line("HUTANG / BON", "BELUM DIBAYAR"));
    if (d.hutangName) parts.push("a.n. " + clean(d.hutangName) + "\n");
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
  await writeChunks(buildReceipt(d, paper));
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
