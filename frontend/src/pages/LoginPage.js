import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Lock, Mail, ChefHat } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/portal-select');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden" style={{ background: 'hsl(222 35% 8%)' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(900px circle at 20% 10%, rgba(45,212,191,0.18), transparent 55%), radial-gradient(700px circle at 80% 20%, rgba(56,189,248,0.14), transparent 55%)' }} />
        <div className="relative z-10 text-center px-12">
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] backdrop-blur-xl flex items-center justify-center">
              <ChefHat className="w-8 h-8 text-[hsl(var(--primary))]" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4 tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>F&B Financial<br/>Control Platform</h1>
          <p className="text-[hsl(var(--muted-foreground))] text-lg">Multi-outlet Finance, Accounting & Inventory Management System</p>
        </div>
      </div>

      {/* Right login panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>F&B ERP</h2>
          </div>

          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl shadow-[var(--glass-shadow)]">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>Welcome Back</CardTitle>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Sign in to access your portal
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
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
                  <Label htmlFor="password">Password</Label>
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
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
            F&B Financial Control Platform v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
