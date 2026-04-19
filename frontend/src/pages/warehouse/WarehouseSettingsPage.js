import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Save, ShieldCheck, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const formatCurr = (v) => `Rp ${(Number(v) || 0).toLocaleString('id-ID')}`;

export default function WarehouseSettingsPage() {
  const { outlets, currentOutlet, selectOutlet } = useAuth();
  const [selectedOutletId, setSelectedOutletId] = useState(currentOutlet || (outlets[0]?.id || ''));
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async (oid) => {
    if (!oid) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/warehouse/settings/${oid}`);
      setSettings(res.data);
    } catch { toast.error('Gagal memuat settings'); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const oid = selectedOutletId || currentOutlet;
    if (oid) fetchSettings(oid);
  }, [selectedOutletId, currentOutlet, fetchSettings]);

  const save = async () => {
    if (!selectedOutletId || !settings) return;
    setSaving(true);
    try {
      await api.put(`/api/warehouse/settings/${selectedOutletId}`, {
        adjustment_approval_threshold: Number(settings.adjustment_approval_threshold),
        require_receipt_attachment: !!settings.require_receipt_attachment,
        auto_receive_po: !!settings.auto_receive_po,
      });
      toast.success('Settings tersimpan');
      fetchSettings(selectedOutletId);
    } catch { toast.error('Gagal simpan'); }
    setSaving(false);
  };

  const currentOutletObj = outlets.find(o => o.id === selectedOutletId);

  return (
    <div className="space-y-4 max-w-3xl" data-testid="warehouse-settings-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Pengaturan Warehouse</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Konfigurasi threshold &amp; policy per outlet.</p>
      </div>

      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            Settings {currentOutletObj && <Badge variant="outline" className="text-[10px]">{currentOutletObj.name}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Outlet</Label>
            <Select value={selectedOutletId} onValueChange={(v) => { setSelectedOutletId(v); selectOutlet(v); }}>
              <SelectTrigger data-testid="settings-outlet-select"><SelectValue placeholder="Pilih outlet" /></SelectTrigger>
              <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {loading && <p className="text-xs text-[hsl(var(--muted-foreground))]">Loading...</p>}

          {settings && (
            <>
              {settings.is_default && (
                <div className="flex items-start gap-2 p-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-400">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  <span>Outlet ini belum punya setting khusus. Menggunakan nilai default. Simpan untuk mengkustomisasi.</span>
                </div>
              )}

              <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <Label className="text-sm flex items-center gap-1.5" style={{ fontFamily: 'Space Grotesk' }}>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Adjustment Approval Threshold
                    </Label>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">
                      Stock adjustment dengan total nilai di atas threshold ini akan dibuat dengan status <b>pending_approval</b> dan butuh di-approve oleh Finance/Admin.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    step="100000"
                    value={settings.adjustment_approval_threshold}
                    onChange={(e) => setSettings(s => ({ ...s, adjustment_approval_threshold: e.target.value }))}
                    className="w-48"
                    data-testid="settings-threshold-input"
                  />
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">{formatCurr(settings.adjustment_approval_threshold)}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] flex items-start justify-between gap-3">
                <div>
                  <Label className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Wajib Upload Attachment pada Receipt</Label>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">Jika aktif, setiap penerimaan barang (GRN) wajib disertai foto/file (delivery note/invoice).</p>
                </div>
                <Switch
                  checked={!!settings.require_receipt_attachment}
                  onCheckedChange={(v) => setSettings(s => ({ ...s, require_receipt_attachment: v }))}
                  data-testid="settings-require-attachment-switch"
                />
              </div>

              <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] flex items-start justify-between gap-3 opacity-60">
                <div>
                  <Label className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Auto-Receive PO (Coming Soon)</Label>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">Jika aktif, PO approved akan otomatis diterima pada expected date tanpa input manual.</p>
                </div>
                <Switch checked={!!settings.auto_receive_po} disabled />
              </div>

              <div className="flex justify-end">
                <Button className="gap-1.5" onClick={save} disabled={saving} data-testid="settings-save-button">
                  <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
