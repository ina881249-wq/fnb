import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LangContext';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Building2, Store, ChefHat, CreditCard, Warehouse, Lock, LogOut, Sun, Moon, Languages, BarChart3 } from 'lucide-react';
import { Button } from '../components/ui/button';

const portalConfig = [
  { id: 'executive', name: 'Executive Portal', description: 'Data analytics, performance insights, and control tower', icon: BarChart3, color: 'from-teal-500/20 to-emerald-500/20', borderColor: 'border-teal-500/30', status: 'active' },
  { id: 'management', name: 'Management Portal', description: 'Finance, operations, inventory, and admin management', icon: Building2, color: 'from-cyan-500/20 to-blue-500/20', borderColor: 'border-cyan-500/30', status: 'active' },
  { id: 'outlet', name: 'Outlet Portal', description: 'Outlet-level daily operations and controls', icon: Store, color: 'from-blue-500/20 to-indigo-500/20', borderColor: 'border-blue-500/30', status: 'active' },
  { id: 'cashier', name: 'Cashier Portal', description: 'POS transactions, payment, and shift handling', icon: CreditCard, color: 'from-green-500/20 to-emerald-500/20', borderColor: 'border-green-500/30', status: 'active' },
  { id: 'kitchen', name: 'Kitchen Portal', description: 'Production tasks for kitchen and prep staff', icon: ChefHat, color: 'from-amber-500/20 to-orange-500/20', borderColor: 'border-amber-500/30', status: 'coming_soon' },
  { id: 'warehouse', name: 'Warehouse Portal', description: 'Receiving and stock movement management', icon: Warehouse, color: 'from-purple-500/20 to-indigo-500/20', borderColor: 'border-purple-500/30', status: 'coming_soon' },
];

export default function PortalSelector() {
  const { user, hasPortalAccess, selectPortal, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { lang, changeLang, t } = useLang();
  const navigate = useNavigate();

  const handleSelectPortal = (portalId) => {
    selectPortal(portalId);
    if (portalId === 'executive') {
      navigate('/executive/overview');
    } else if (portalId === 'management') {
      navigate('/management/dashboard');
    } else if (portalId === 'outlet') {
      navigate('/outlet/dashboard');
    } else if (portalId === 'cashier') {
      navigate('/cashier/dashboard');
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Header gradient */}
      <div className="absolute top-0 left-0 right-0 h-[40vh]" style={{ background: 'radial-gradient(900px circle at 20% 10%, rgba(45,212,191,0.18), transparent 55%), radial-gradient(700px circle at 80% 20%, rgba(56,189,248,0.14), transparent 55%)' }} />
      
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>{t('portal.select')}</h1>
            <p className="text-[hsl(var(--muted-foreground))] mt-1">{t('portal.welcome', { name: user?.name })}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => changeLang(lang === 'en' ? 'id' : 'en')} className="h-8 px-2 text-xs gap-1">
              <Languages className="w-3.5 h-3.5" /><span className="uppercase font-semibold">{lang}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="h-8 w-8 p-0">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="outline" onClick={logout} className="gap-2 border-[var(--glass-border)]" data-testid="logout-button">
            <LogOut className="w-4 h-4" /> {t('common.sign_out')}
          </Button>
          </div>
        </div>

        {/* Portal grid */}
        <TooltipProvider>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {portalConfig.map((portal) => {
              const accessible = portal.status === 'active' && hasPortalAccess(portal.id);
              const isComingSoon = portal.status === 'coming_soon';
              const Icon = portal.icon;

              return (
                <Tooltip key={portal.id}>
                  <TooltipTrigger asChild>
                    <Card
                      className={`relative cursor-pointer transition-all duration-200 bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl shadow-[var(--glass-shadow-soft)] overflow-hidden group
                        ${accessible ? 'hover:-translate-y-1 hover:border-[var(--glass-border-strong)] hover:shadow-[var(--glass-shadow)]' : 'opacity-60 cursor-not-allowed'}`}
                      onClick={() => accessible && handleSelectPortal(portal.id)}
                      data-testid={`portal-selector-${portal.id}-card`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${portal.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                      <CardContent className="relative p-6 text-center">
                        <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--glass-bg-strong)] border ${portal.borderColor} flex items-center justify-center`}>
                          {isComingSoon || !accessible ? (
                            <Lock className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
                          ) : (
                            <Icon className="w-6 h-6 text-[hsl(var(--primary))]" />
                          )}
                        </div>
                        <h3 className="font-semibold text-sm mb-1" style={{ fontFamily: 'Space Grotesk' }}>{portal.name}</h3>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">{portal.description}</p>
                        {isComingSoon && (
                          <Badge variant="outline" className="mt-3 text-[10px] border-amber-500/30 text-amber-400">
                            {t('portal.coming_soon')}
                          </Badge>
                        )}
                        {!isComingSoon && !hasPortalAccess(portal.id) && (
                          <Badge variant="outline" className="mt-3 text-[10px] border-red-500/30 text-red-400">
                            No Access
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  {(isComingSoon || !accessible) && (
                    <TooltipContent>
                      <p>{isComingSoon ? 'This portal is launching soon' : 'You do not have access to this portal'}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* User info */}
        <div className="mt-12 p-6 bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-xl rounded-xl">
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'Space Grotesk' }}>Your Access</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-[hsl(var(--muted-foreground))]">Role: </span>
              <span className="font-medium">{user?.is_superadmin ? 'Super Admin' : 'Standard User'}</span>
            </div>
            <div>
              <span className="text-[hsl(var(--muted-foreground))]">Portals: </span>
              <span className="font-medium">{user?.portal_access?.join(', ') || 'None'}</span>
            </div>
            <div>
              <span className="text-[hsl(var(--muted-foreground))]">Outlets: </span>
              <span className="font-medium">{user?.outlet_access?.length || 0} assigned</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
