import React, { useEffect, useState } from 'react';
import escpos from '../../services/escposPrinter';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Printer, Plug, Unplug, TestTube2, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PrinterSettingsPage() {
  const { lang } = useLang();
  const { outlets, currentOutlet } = useAuth();
  const [connected, setConnected] = useState(false);
  const [paperWidth, setPaperWidth] = useState(parseInt(localStorage.getItem('lp_printer_width') || '32', 10));
  const [supported, setSupported] = useState(false);
  const [tryingAuto, setTryingAuto] = useState(false);

  useEffect(() => {
    setSupported(escpos.isSupported);
    (async () => {
      setTryingAuto(true);
      const ok = await escpos.tryAutoConnect();
      setConnected(ok);
      setTryingAuto(false);
    })();
  }, []);

  const handleConnect = async () => {
    try {
      await escpos.connect();
      setConnected(true);
      toast.success(lang === 'id' ? 'Printer terhubung' : 'Printer connected');
    } catch (e) {
      toast.error(e.message || 'Failed to connect');
    }
  };

  const handleDisconnect = async () => {
    await escpos.disconnect();
    setConnected(false);
    toast.success(lang === 'id' ? 'Printer diputus' : 'Disconnected');
  };

  const handleTestPrint = async () => {
    const outlet = outlets.find(o => o.id === currentOutlet) || outlets[0] || { name: 'Lusi & Pakan Test', address: '-' };
    const testReceipt = {
      outlet,
      order_number: 'TEST-001',
      paid_at: new Date().toISOString(),
      order_type: 'dine_in',
      table_number: 'T01',
      cashier_name: 'Test Cashier',
      lines: [
        { name: 'Nasi Goreng Seafood', qty: 2, price: 68000 },
        { name: 'Iced Lemon Tea', qty: 2, price: 28000 },
      ],
      total: 192000,
      payment_method: 'cash',
      amount_tendered: 200000,
      change: 8000,
    };
    try {
      const mode = await escpos.smartPrint(testReceipt);
      toast.success(mode === 'thermal' ? 'Test print sent to thermal printer' : 'Opened browser print dialog (fallback)');
    } catch (e) { toast.error(e.message); }
  };

  const handleOpenDrawer = async () => {
    try {
      await escpos.openCashDrawer();
      toast.success(lang === 'id' ? 'Laci kas dibuka' : 'Cash drawer opened');
    } catch (e) { toast.error(e.message); }
  };

  const saveWidth = (w) => {
    const n = parseInt(w, 10);
    setPaperWidth(n);
    escpos.paperWidth = n;
    localStorage.setItem('lp_printer_width', String(n));
    toast.success(lang === 'id' ? 'Lebar kertas tersimpan' : 'Paper width saved');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
          {lang === 'id' ? 'Pengaturan Printer' : 'Printer Settings'}
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {lang === 'id' ? 'Hubungkan thermal printer ESC/POS & cash drawer' : 'Connect ESC/POS thermal printer & cash drawer'}
        </p>
      </div>

      {!supported && (
        <Card className="bg-amber-500/5 border-amber-500/30">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-400">{lang === 'id' ? 'Browser tidak mendukung Web Serial' : 'Browser does not support Web Serial'}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                {lang === 'id'
                  ? 'Gunakan Chrome/Edge (versi 89+) di komputer/laptop. Fallback: dialog print browser akan tetap jalan untuk cetak struk ke printer standar.'
                  : 'Use Chrome/Edge (89+). Fallback: browser print dialog will still work for standard printers.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base" style={{ fontFamily: 'Space Grotesk' }}>
            <Printer className="w-5 h-5 text-[hsl(var(--primary))]" />
            {lang === 'id' ? 'Status Koneksi' : 'Connection Status'}
            {tryingAuto ? <Badge variant="outline" className="text-[10px]">Mencoba...</Badge>
              : connected ? <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">Connected</Badge>
              : <Badge variant="outline" className="text-[10px] border-[hsl(var(--muted-foreground))]/30">Disconnected</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {!connected ? (
              <Button onClick={handleConnect} disabled={!supported} className="gap-2" data-testid="printer-connect">
                <Plug className="w-4 h-4" /> {lang === 'id' ? 'Hubungkan Printer' : 'Connect Printer'}
              </Button>
            ) : (
              <Button onClick={handleDisconnect} variant="outline" className="gap-2" data-testid="printer-disconnect">
                <Unplug className="w-4 h-4" /> {lang === 'id' ? 'Putuskan' : 'Disconnect'}
              </Button>
            )}
            <Button onClick={handleTestPrint} variant="outline" className="gap-2" data-testid="printer-test">
              <TestTube2 className="w-4 h-4" /> {lang === 'id' ? 'Test Print' : 'Test Print'}
            </Button>
            <Button onClick={handleOpenDrawer} variant="outline" disabled={!connected} className="gap-2" data-testid="printer-drawer">
              <DollarSign className="w-4 h-4" /> {lang === 'id' ? 'Buka Laci Kas' : 'Open Cash Drawer'}
            </Button>
          </div>

          <div>
            <Label className="text-xs">{lang === 'id' ? 'Lebar Kertas' : 'Paper Width'}</Label>
            <Select value={String(paperWidth)} onValueChange={(v) => saveWidth(v)}>
              <SelectTrigger className="bg-[hsl(var(--secondary))] w-[240px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="32">58mm (32 characters)</SelectItem>
                <SelectItem value="42">80mm (42 characters)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-xs space-y-1">
            <div className="font-semibold mb-1">{lang === 'id' ? 'Cara pairing printer (pertama kali):' : 'How to pair printer (first time):'}</div>
            <ol className="list-decimal list-inside space-y-0.5 text-[hsl(var(--muted-foreground))]">
              <li>{lang === 'id' ? 'Colokkan printer thermal via USB ke komputer kasir' : 'Plug thermal printer USB to cashier computer'}</li>
              <li>{lang === 'id' ? 'Klik tombol "Hubungkan Printer" di atas' : 'Click "Connect Printer" button above'}</li>
              <li>{lang === 'id' ? 'Browser akan minta ijin — pilih device & klik "Connect"' : 'Browser will ask permission — pick device & click Connect'}</li>
              <li>{lang === 'id' ? 'Klik "Test Print" untuk verifikasi' : 'Click "Test Print" to verify'}</li>
            </ol>
            <div className="text-[10px] mt-2 italic flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-400" />{lang === 'id' ? 'Pairing tersimpan — lain kali akan auto-connect' : 'Pairing is saved — will auto-connect next time'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
