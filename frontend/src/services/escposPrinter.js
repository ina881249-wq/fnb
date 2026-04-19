/**
 * ESC/POS Printer Service
 * - Uses Web Serial API (Chrome/Edge 89+) when available
 * - Falls back to browser print dialog for unsupported browsers or when no printer is connected
 * - Cash drawer kick-out via ESC p 0 25 250 sequence
 *
 * Usage:
 *   await escpos.connect();                 // pair printer once (user gesture required)
 *   await escpos.printReceipt(receiptData); // print formatted receipt
 *   await escpos.openCashDrawer();          // trigger cash drawer
 *   escpos.disconnect();
 */

const ESC = 0x1b;
const GS = 0x1d;

// Control sequences
const CMD = {
  INIT: [ESC, 0x40],               // Initialize printer
  ALIGN_LEFT: [ESC, 0x61, 0],
  ALIGN_CENTER: [ESC, 0x61, 1],
  ALIGN_RIGHT: [ESC, 0x61, 2],
  BOLD_ON: [ESC, 0x45, 1],
  BOLD_OFF: [ESC, 0x45, 0],
  SIZE_NORMAL: [GS, 0x21, 0],
  SIZE_DOUBLE: [GS, 0x21, 0x11],   // 2x width + 2x height
  FEED: [0x0a],
  CUT: [GS, 0x56, 0x00],           // Full cut
  CUT_PARTIAL: [GS, 0x56, 0x01],
  DRAWER_KICK: [ESC, 0x70, 0, 25, 250], // Kick-out pin 2, 25ms on, 250ms off
};

const PAPER_WIDTH = 32; // chars for 58mm printer, use 42 for 80mm

class ESCPOSPrinter {
  constructor() {
    this.port = null;
    this.writer = null;
    this.paperWidth = parseInt(localStorage.getItem('lp_printer_width') || '32', 10);
    this.outletHeader = null;
  }

  get isConnected() { return !!this.port; }
  get isSupported() { return typeof navigator !== 'undefined' && 'serial' in navigator; }

  async connect({ baudRate = 9600 } = {}) {
    if (!this.isSupported) throw new Error('Web Serial API tidak didukung browser ini. Gunakan Chrome/Edge terbaru.');
    // Request port — user must approve
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate });
    this.port = port;
    this.writer = port.writable.getWriter();
    localStorage.setItem('lp_printer_paired', '1');
    return true;
  }

  async tryAutoConnect({ baudRate = 9600 } = {}) {
    if (!this.isSupported) return false;
    try {
      const ports = await navigator.serial.getPorts();
      if (ports.length === 0) return false;
      const port = ports[0];
      if (!port.readable) await port.open({ baudRate });
      this.port = port;
      this.writer = port.writable.getWriter();
      return true;
    } catch (e) { return false; }
  }

  async disconnect() {
    try { if (this.writer) { await this.writer.close(); this.writer = null; } } catch (e) {}
    try { if (this.port) { await this.port.close(); this.port = null; } } catch (e) {}
  }

  async _write(bytes) {
    if (!this.writer) throw new Error('Printer not connected');
    await this.writer.write(new Uint8Array(bytes));
  }

  async _writeText(text) {
    const encoder = new TextEncoder();
    await this._write(Array.from(encoder.encode(text)));
  }

  async openCashDrawer() {
    if (!this.writer) {
      // Best-effort: attempt auto-connect first
      const ok = await this.tryAutoConnect();
      if (!ok) throw new Error('Cash drawer requires paired printer');
    }
    await this._write(CMD.DRAWER_KICK);
  }

  /**
   * Prints a formatted receipt.
   * receipt: { outlet, order_number, paid_at, order_type, table_number, customer_name, lines, total, payment_method, amount_tendered, change }
   */
  async printReceipt(receipt) {
    if (!this.writer) {
      const ok = await this.tryAutoConnect();
      if (!ok) throw new Error('Printer not connected');
    }
    const W = this.paperWidth;
    const pad = (left, right) => {
      const l = String(left || '');
      const r = String(right || '');
      const spaces = Math.max(1, W - l.length - r.length);
      return l + ' '.repeat(spaces) + r;
    };
    const center = (s) => {
      const pad = Math.max(0, Math.floor((W - s.length) / 2));
      return ' '.repeat(pad) + s;
    };
    const fmtIDR = (n) => 'Rp' + Math.round(n).toLocaleString('id-ID');

    // Header
    await this._write(CMD.INIT);
    await this._write(CMD.ALIGN_CENTER);
    await this._write(CMD.SIZE_DOUBLE);
    await this._writeText((receipt.outlet?.name || 'Lusi & Pakan') + '\n');
    await this._write(CMD.SIZE_NORMAL);
    if (receipt.outlet?.address) await this._writeText(receipt.outlet.address + '\n');
    if (receipt.outlet?.phone) await this._writeText(receipt.outlet.phone + '\n');
    await this._writeText('-'.repeat(W) + '\n');

    // Order meta
    await this._write(CMD.ALIGN_LEFT);
    await this._writeText(pad(receipt.order_number || '-', (receipt.order_type || '').toUpperCase()) + '\n');
    const paidAt = receipt.paid_at ? new Date(receipt.paid_at).toLocaleString('id-ID') : new Date().toLocaleString('id-ID');
    await this._writeText(paidAt + '\n');
    if (receipt.table_number) await this._writeText('Meja: ' + receipt.table_number + '\n');
    if (receipt.customer_name) await this._writeText('Nama: ' + receipt.customer_name + '\n');
    if (receipt.cashier_name) await this._writeText('Kasir: ' + receipt.cashier_name + '\n');
    await this._writeText('-'.repeat(W) + '\n');

    // Lines
    for (const l of (receipt.lines || [])) {
      await this._writeText(l.name + '\n');
      await this._writeText(pad('  ' + l.qty + ' x ' + fmtIDR(l.price), fmtIDR(l.qty * l.price)) + '\n');
    }
    await this._writeText('-'.repeat(W) + '\n');

    // Totals
    await this._write(CMD.BOLD_ON);
    await this._writeText(pad('TOTAL', fmtIDR(receipt.total || 0)) + '\n');
    await this._write(CMD.BOLD_OFF);
    await this._writeText(pad('Pembayaran', (receipt.payment_method || '').toUpperCase()) + '\n');
    if (receipt.payment_method === 'cash') {
      await this._writeText(pad('Tunai', fmtIDR(receipt.amount_tendered || 0)) + '\n');
      await this._writeText(pad('Kembali', fmtIDR(receipt.change || 0)) + '\n');
    }
    await this._writeText('-'.repeat(W) + '\n');

    // Footer
    await this._write(CMD.ALIGN_CENTER);
    await this._writeText('Terima kasih\n');
    await this._writeText('atas kunjungan Anda!\n');
    await this._write(CMD.FEED);
    await this._write(CMD.FEED);
    await this._write(CMD.FEED);

    // Cut + kick drawer (if cash)
    await this._write(CMD.CUT_PARTIAL);
    if (receipt.payment_method === 'cash') {
      await this._write(CMD.DRAWER_KICK);
    }
  }

  /**
   * Browser print fallback — opens a hidden iframe with styled HTML receipt and triggers print dialog.
   */
  browserPrintFallback(receipt) {
    const fmtIDR = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
    const outletName = receipt.outlet?.name || 'Lusi & Pakan';
    const paidAt = receipt.paid_at ? new Date(receipt.paid_at).toLocaleString('id-ID') : new Date().toLocaleString('id-ID');
    const linesHtml = (receipt.lines || []).map(l => `
      <tr><td>${l.name}</td></tr>
      <tr><td style="padding-left:8px">${l.qty} x ${fmtIDR(l.price)}</td><td style="text-align:right">${fmtIDR(l.qty * l.price)}</td></tr>
    `).join('');

    const html = `<!doctype html><html><head><title>Receipt</title><style>
      @page { size: 80mm auto; margin: 2mm; }
      body { font-family: 'Courier New', monospace; font-size: 11px; color: #000; width: 72mm; }
      h1 { text-align:center; font-size: 14px; margin: 0 0 2px 0; }
      .sub { text-align:center; font-size: 10px; margin: 0; }
      table { width:100%; border-collapse: collapse; }
      hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
      .row { display:flex; justify-content:space-between; }
      .bold { font-weight: bold; }
    </style></head><body>
      <h1>${outletName}</h1>
      ${receipt.outlet?.address ? `<p class="sub">${receipt.outlet.address}</p>` : ''}
      ${receipt.outlet?.phone ? `<p class="sub">${receipt.outlet.phone}</p>` : ''}
      <hr>
      <div class="row"><span>${receipt.order_number || '-'}</span><span>${(receipt.order_type || '').toUpperCase()}</span></div>
      <div>${paidAt}</div>
      ${receipt.table_number ? `<div>Meja: ${receipt.table_number}</div>` : ''}
      ${receipt.customer_name ? `<div>Nama: ${receipt.customer_name}</div>` : ''}
      ${receipt.cashier_name ? `<div>Kasir: ${receipt.cashier_name}</div>` : ''}
      <hr>
      <table>${linesHtml}</table>
      <hr>
      <div class="row bold"><span>TOTAL</span><span>${fmtIDR(receipt.total)}</span></div>
      <div class="row"><span>Pembayaran</span><span>${(receipt.payment_method || '').toUpperCase()}</span></div>
      ${receipt.payment_method === 'cash' ? `
        <div class="row"><span>Tunai</span><span>${fmtIDR(receipt.amount_tendered)}</span></div>
        <div class="row"><span>Kembali</span><span>${fmtIDR(receipt.change)}</span></div>` : ''}
      <hr>
      <p class="sub">Terima kasih atas kunjungan Anda!</p>
    </body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
      try { iframe.contentWindow.print(); } catch (e) { console.error(e); }
      setTimeout(() => { document.body.removeChild(iframe); }, 1000);
    }, 250);
  }

  /**
   * Smart print — use ESC/POS if connected, else browser print fallback.
   */
  async smartPrint(receipt) {
    try {
      if (this.writer || await this.tryAutoConnect()) {
        await this.printReceipt(receipt);
        return 'thermal';
      }
    } catch (e) {
      console.warn('ESC/POS print failed, falling back to browser print:', e);
    }
    this.browserPrintFallback(receipt);
    return 'browser';
  }
}

const escpos = new ESCPOSPrinter();
export default escpos;
