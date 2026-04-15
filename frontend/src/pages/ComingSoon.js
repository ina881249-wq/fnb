import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ChefHat, CreditCard, Warehouse, ArrowLeft, Lock } from 'lucide-react';

const portalInfo = {
  kitchen: { name: 'Kitchen Portal', description: 'Production tasks for kitchen and prep staff. Track prep workflows, batch production, and yield/loss.', icon: ChefHat, color: 'text-amber-400' },
  cashier: { name: 'Cashier Portal', description: 'Transaction capture for front-line sales staff. POS integration and daily transaction recording.', icon: CreditCard, color: 'text-green-400' },
  warehouse: { name: 'Warehouse Portal', description: 'Receiving and stock movement management. Handle inbound shipments and inter-outlet transfers.', icon: Warehouse, color: 'text-purple-400' },
};

export default function ComingSoon() {
  const navigate = useNavigate();
  const { portal } = useParams();
  const info = portalInfo[portal] || portalInfo.kitchen;
  const Icon = info.icon;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl shadow-[var(--glass-shadow)]">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] flex items-center justify-center">
            <Lock className={`w-8 h-8 ${info.color}`} />
          </div>
          <Badge variant="outline" className="mb-4 border-amber-500/30 text-amber-400">
            Coming Soon
          </Badge>
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Space Grotesk' }}>{info.name}</h2>
          <p className="text-[hsl(var(--muted-foreground))] mb-6 text-sm leading-relaxed">{info.description}</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-6">This portal is under development and will be available in a future release.</p>
          <Button onClick={() => navigate('/portal-select')} className="gap-2" data-testid="back-to-portal-select">
            <ArrowLeft className="w-4 h-4" /> Back to Portal Selection
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
