import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useLang } from '../context/LangContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Shield, ShieldCheck, Check, Copy, KeyRound, AlertTriangle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function TwoFactorSetupPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    try {
      const res = await api.get('/api/auth/2fa/status');
      setStatus(res.data);
    } catch (e) { toast.error('Failed to load status'); }
  };

  useEffect(() => { refresh(); }, []);

  const startSetup = async () => {
    try {
      const res = await api.post('/api/auth/2fa/setup');
      setSetupData(res.data);
      setCode('');
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const enable = async () => {
    if (code.length !== 6) { toast.error(lang === 'id' ? 'Kode harus 6 digit' : 'Code must be 6 digits'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/auth/2fa/enable', { code });
      toast.success(lang === 'id' ? '2FA berhasil diaktifkan' : '2FA enabled');
      setSetupData(null);
      setCode('');
      refresh();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    setSubmitting(false);
  };

  const disable = async () => {
    if (code.length !== 6) { toast.error(lang === 'id' ? 'Masukkan kode 2FA Anda untuk menonaktifkan' : 'Enter current 2FA code to disable'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/auth/2fa/disable', { code });
      toast.success(lang === 'id' ? '2FA dinonaktifkan' : '2FA disabled');
      setCode('');
      refresh();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1.5" data-testid="tfa-back-btn">
        <ArrowLeft className="w-4 h-4" /> {lang === 'id' ? 'Kembali' : 'Back'}
      </Button>

      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
            <Shield className="w-6 h-6 text-[hsl(var(--primary))]" />
            {lang === 'id' ? 'Verifikasi Dua Langkah (2FA)' : 'Two-Factor Authentication'}
            {status?.enabled && <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>}
            {!status?.enabled && status?.required_by_role && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Recommended</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {status?.required_by_role && !status?.enabled && !setupData && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-amber-300">
                {lang === 'id'
                  ? 'Role Anda sangat disarankan untuk mengaktifkan 2FA demi keamanan data finansial & eksekutif.'
                  : 'Your role is strongly recommended to enable 2FA for financial & executive data security.'}
              </div>
            </div>
          )}

          {/* Not enrolled — show setup button */}
          {!status?.enabled && !setupData && (
            <>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {lang === 'id'
                  ? 'Aktifkan 2FA untuk memerlukan kode 6-digit dari aplikasi Authenticator saat login. Mendukung Google Authenticator, Authy, 1Password, dll.'
                  : 'Enable 2FA to require a 6-digit code from your Authenticator app at login. Supports Google Authenticator, Authy, 1Password, etc.'}
              </p>
              <Button onClick={startSetup} className="gap-2" data-testid="tfa-start-setup">
                <ShieldCheck className="w-4 h-4" />
                {lang === 'id' ? 'Mulai Aktifkan 2FA' : 'Start 2FA Setup'}
              </Button>
            </>
          )}

          {/* Setup in progress — show QR + verify */}
          {setupData && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                <Label className="text-xs block mb-2">{lang === 'id' ? 'Langkah 1 — Scan QR Code' : 'Step 1 — Scan QR Code'}</Label>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <div className="bg-white p-2 rounded-lg shrink-0">
                    <img src={setupData.qr_code_base64} alt="QR Code" className="w-48 h-48" data-testid="tfa-qr-image" />
                  </div>
                  <div className="flex-1 text-xs space-y-2 w-full">
                    <p className="text-[hsl(var(--muted-foreground))]">
                      {lang === 'id' ? 'Tidak bisa scan? Masukkan kode manual:' : "Can't scan? Enter this code manually:"}
                    </p>
                    <div className="flex gap-2">
                      <code className="flex-1 px-3 py-2 rounded-lg bg-[var(--glass-bg)] font-mono text-xs break-all" data-testid="tfa-secret">
                        {setupData.secret}
                      </code>
                      <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(setupData.secret); toast.success('Copied'); }} className="h-9 w-9 p-0 shrink-0">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-3">
                      Issuer: <span className="font-semibold">{setupData.issuer}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] space-y-3">
                <Label className="text-xs block">{lang === 'id' ? 'Langkah 2 — Masukkan kode 6-digit' : 'Step 2 — Enter 6-digit code'}</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl font-mono tracking-[0.3em] h-14"
                  data-testid="tfa-verify-code"
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setSetupData(null); setCode(''); }} className="flex-1">
                    {lang === 'id' ? 'Batal' : 'Cancel'}
                  </Button>
                  <Button onClick={enable} disabled={submitting || code.length !== 6} className="flex-1 gap-2" data-testid="tfa-enable-submit">
                    <Check className="w-4 h-4" /> {submitting ? '...' : (lang === 'id' ? 'Aktifkan' : 'Enable')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Already enabled — show disable option */}
          {status?.enabled && !setupData && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-green-400 shrink-0" />
                <div>
                  <div className="font-semibold text-green-400">{lang === 'id' ? '2FA Aktif' : '2FA is Active'}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">
                    {lang === 'id' ? 'Diaktifkan pada' : 'Enabled on'}: {status.enrolled_at ? new Date(status.enrolled_at).toLocaleString('id-ID') : '-'}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-300">
                    {lang === 'id'
                      ? 'Menonaktifkan 2FA akan mengurangi keamanan akun Anda. Masukkan kode saat ini untuk konfirmasi.'
                      : 'Disabling 2FA reduces account security. Enter current code to confirm.'}
                  </div>
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-xl font-mono tracking-[0.3em]"
                  data-testid="tfa-disable-code"
                />
                <Button variant="destructive" onClick={disable} disabled={submitting || code.length !== 6} className="w-full gap-2" data-testid="tfa-disable-submit">
                  <KeyRound className="w-4 h-4" /> {submitting ? '...' : (lang === 'id' ? 'Nonaktifkan 2FA' : 'Disable 2FA')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
