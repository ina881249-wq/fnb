import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LangContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Lock, Mail, ChefHat, Sun, Moon, Languages, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changing, setChanging] = useState(false);
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { lang, changeLang, t } = useLang();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.must_change_password) {
        setMustChange(true);
        setLoading(false);
        return;
      }
      navigate('/portal-select');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    }
    setLoading(false);
  };

  const handleForceChange = async (e) => {
    e.preventDefault();
    if (newPw.length < 6) { toast.error(lang === 'id' ? 'Min 6 karakter' : 'Min 6 characters'); return; }
    if (newPw !== confirmPw) { toast.error(lang === 'id' ? 'Password tidak cocok' : 'Passwords do not match'); return; }
    if (newPw === password) { toast.error(lang === 'id' ? 'Password baru harus berbeda dari sementara' : 'New password must differ'); return; }
    setChanging(true);
    try {
      await api.post('/api/auth/change-password', { old_password: password, new_password: newPw });
      toast.success(lang === 'id' ? 'Password berhasil diubah' : 'Password changed');
      setMustChange(false);
      navigate('/portal-select');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally { setChanging(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden bg-[hsl(var(--card))]">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(900px circle at 20% 10%, rgba(45,212,191,0.18), transparent 55%), radial-gradient(700px circle at 80% 20%, rgba(56,189,248,0.14), transparent 55%)' }} />
        <div className="relative z-10 text-center px-12">
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] backdrop-blur-xl flex items-center justify-center">
              <ChefHat className="w-8 h-8 text-[hsl(var(--primary))]" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4 tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>{t('app.name').split(' ').slice(0,2).join(' ')}<br/>{t('app.name').split(' ').slice(2).join(' ')}</h1>
          <p className="text-[hsl(var(--muted-foreground))] text-lg">Multi-outlet Finance, Accounting & Inventory Management System</p>
        </div>
      </div>

      {/* Right login panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        {/* Theme & Lang toggles */}
        <div className="absolute top-4 right-4 flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => changeLang(lang === 'en' ? 'id' : 'en')} className="h-8 px-2 text-xs gap-1">
            <Languages className="w-3.5 h-3.5" /><span className="uppercase font-semibold">{lang}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleTheme} className="h-8 w-8 p-0">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>{t('app.short')}</h2>
          </div>

          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl shadow-[var(--glass-shadow)]">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>{t('auth.welcome')}</CardTitle>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {t('auth.subtitle')}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-[hsl(var(--secondary))] border-[var(--glass-border)]"
                      data-testid="login-email-input"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-[hsl(var(--secondary))] border-[var(--glass-border)]"
                      data-testid="login-password-input"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm" data-testid="login-error">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 active:scale-[0.98]"
                  disabled={loading}
                  data-testid="login-submit-button"
                >
                  {loading ? t('auth.signing_in') : t('common.sign_in')}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
            F&B Financial Control Platform v1.0
          </p>
        </div>
      </div>

      {/* Force change password dialog */}
      <Dialog open={mustChange} onOpenChange={() => {}}>
        <DialogContent className="max-w-md bg-[hsl(var(--card))] border-amber-500/30" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              {lang === 'id' ? 'Wajib Ganti Password' : 'Password Change Required'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleForceChange} className="space-y-3">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
              {lang === 'id'
                ? 'Password Anda di-reset oleh admin. Buatlah password baru sebelum melanjutkan.'
                : 'Your password was reset by an admin. Please set a new password to continue.'}
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Password Baru' : 'New Password'}</Label>
              <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={6} data-testid="force-change-new-password" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">{lang === 'id' ? 'Konfirmasi Password' : 'Confirm Password'}</Label>
              <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required minLength={6} data-testid="force-change-confirm-password" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={changing} className="w-full" data-testid="force-change-submit">
                {changing ? (lang === 'id' ? 'Menyimpan...' : 'Saving...') : (lang === 'id' ? 'Ganti Password & Lanjut' : 'Change Password & Continue')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
