import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Mail, KeyRound, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL || '';

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loadUser } = useAuth();
  const token = params.get('token') || '';

  const [inviteInfo, setInviteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchInfo = async () => {
      if (!token) { setError('Token undangan tidak ditemukan'); setLoading(false); return; }
      try {
        const res = await axios.get(`${API}/api/auth/invite-info`, { params: { token } });
        setInviteInfo(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Invite tidak valid atau sudah kedaluwarsa');
      }
      setLoading(false);
    };
    fetchInfo();
  }, [token]);

  const handleAccept = async (e) => {
    e.preventDefault();
    if (password !== confirmPw) { toast.error('Konfirmasi password tidak cocok'); return; }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/api/auth/accept-invite`, { token, password });
      // Store token & user manually (loadUser will fetch me)
      localStorage.setItem('token', res.data.token);
      await loadUser();
      toast.success('Selamat datang! Akun Anda sudah aktif.');
      navigate('/portal-select');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal menerima undangan');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-[hsl(var(--muted-foreground))]">Memuat...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-[var(--glass-bg)] border-red-500/30">
          <CardContent className="p-8 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>Undangan Tidak Valid</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{error}</p>
            <Button onClick={() => navigate('/login')} className="w-full">Kembali ke Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[hsl(var(--background))] via-[hsl(var(--background))] to-[hsl(var(--primary))]/5">
      <Card className="max-w-md w-full bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <CardContent className="p-8 space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[hsl(var(--primary))]/15 flex items-center justify-center mb-3">
              <Mail className="w-7 h-7 text-[hsl(var(--primary))]" />
            </div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>Terima Undangan</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              Selamat datang, <strong>{inviteInfo.name}</strong>! Silakan buat password untuk mengaktifkan akun.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-sm">
            <div className="text-xs text-[hsl(var(--muted-foreground))]">Email</div>
            <div className="font-mono text-sm">{inviteInfo.email}</div>
          </div>

          <form onSubmit={handleAccept} className="space-y-3" data-testid="accept-invite-form">
            <div>
              <Label className="text-sm mb-1.5 block">Password Baru</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 bg-[var(--glass-bg-strong)]" required data-testid="accept-invite-password" />
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Min 8 karakter, harus ada 1 huruf dan 1 angka.</p>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Konfirmasi Password</Label>
              <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="h-11 bg-[var(--glass-bg-strong)]" required data-testid="accept-invite-confirm-password" />
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-11 gap-2 text-sm font-semibold" data-testid="accept-invite-submit">
              {submitting ? 'Memproses...' : <><Check className="w-4 h-4" /> Aktifkan Akun</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
