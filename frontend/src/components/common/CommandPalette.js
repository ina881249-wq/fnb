import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '../ui/command';
import {
  LayoutDashboard, DollarSign, Package, FileText, Settings, CheckSquare,
  ClipboardList, AlertTriangle, BarChart3, Target, Repeat, ChefHat,
  Factory, Shield, TrendingUp, Building2, Users, Search, Scale
} from 'lucide-react';

const menuItems = [
  // Executive
  { label: 'Dashboard', labelId: 'Dasbor', path: '/management/dashboard', icon: LayoutDashboard, group: 'Executive', keywords: 'home overview kpi' },
  { label: 'Alerts', labelId: 'Peringatan', path: '/management/alerts', icon: AlertTriangle, group: 'Executive', keywords: 'exception warning notification' },
  // Finance
  { label: 'Chart of Accounts', labelId: 'Bagan Akun', path: '/management/coa', icon: DollarSign, group: 'Finance', keywords: 'coa account tree ledger' },
  { label: 'Journal Entries', labelId: 'Jurnal Entri', path: '/management/journals', icon: DollarSign, group: 'Finance', keywords: 'journal debit credit posting double entry' },
  { label: 'Cash & Bank', labelId: 'Kas & Bank', path: '/management/finance', icon: DollarSign, group: 'Finance', keywords: 'cash bank account movement settlement' },
  { label: 'Reconciliation', labelId: 'Rekonsiliasi', path: '/management/reconciliation', icon: Scale, group: 'Finance', keywords: 'reconcile variance mismatch' },
  { label: 'Budgeting', labelId: 'Anggaran', path: '/management/budgeting', icon: Target, group: 'Finance', keywords: 'budget actual spending' },
  { label: 'Recurring', labelId: 'Transaksi Berulang', path: '/management/recurring', icon: Repeat, group: 'Finance', keywords: 'recurring schedule automatic' },
  // Inventory
  { label: 'Items & Stock', labelId: 'Barang & Stok', path: '/management/inventory', icon: Package, group: 'Inventory', keywords: 'item stock inventory material' },
  { label: 'Recipe & BOM', labelId: 'Resep & BOM', path: '/management/recipes', icon: ChefHat, group: 'Inventory', keywords: 'recipe bom ingredient menu' },
  { label: 'Production Orders', labelId: 'Order Produksi', path: '/management/production', icon: Factory, group: 'Inventory', keywords: 'production prep batch' },
  // Reports
  { label: 'Reports', labelId: 'Laporan', path: '/management/reports', icon: FileText, group: 'Reports', keywords: 'pnl cashflow balance sheet export' },
  { label: 'Variance', labelId: 'Varians', path: '/management/variance', icon: BarChart3, group: 'Reports', keywords: 'variance theoretical actual waste' },
  { label: 'Drill-Down', labelId: 'Drill-Down', path: '/management/drilldown', icon: TrendingUp, group: 'Reports', keywords: 'drilldown detail outlet city' },
  // Operations
  { label: 'Closing Monitor', labelId: 'Monitor Penutupan', path: '/management/closing-monitor', icon: CheckSquare, group: 'Operations', keywords: 'closing daily outlet lock' },
  { label: 'Approvals', labelId: 'Persetujuan', path: '/management/approvals', icon: CheckSquare, group: 'Operations', keywords: 'approval approve reject pending' },
  { label: 'Approval Rules', labelId: 'Aturan Persetujuan', path: '/management/approval-rules', icon: Shield, group: 'Operations', keywords: 'rule threshold amount' },
  // Admin
  { label: 'Admin', labelId: 'Admin', path: '/management/admin', icon: Settings, group: 'Admin', keywords: 'user role permission outlet' },
  { label: 'Audit Trail', labelId: 'Jejak Audit', path: '/management/audit', icon: ClipboardList, group: 'Admin', keywords: 'audit log history change' },
  // Outlet
  { label: 'Outlet Dashboard', labelId: 'Dasbor Outlet', path: '/outlet/dashboard', icon: Building2, group: 'Outlet', keywords: 'outlet daily cash sales' },
  { label: 'Sales Summary', labelId: 'Ringkasan Penjualan', path: '/outlet/sales', icon: FileText, group: 'Outlet', keywords: 'sales daily input' },
  { label: 'Cash Management', labelId: 'Manajemen Kas', path: '/outlet/cash', icon: DollarSign, group: 'Outlet', keywords: 'cash in out movement' },
  { label: 'Daily Closing', labelId: 'Penutupan Harian', path: '/outlet/closing', icon: CheckSquare, group: 'Outlet', keywords: 'closing checklist submit' },
];

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useLang();

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = useCallback((path) => {
    setOpen(false);
    navigate(path);
  }, [navigate]);

  const groups = [...new Set(menuItems.map(i => i.group))];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command className="bg-[hsl(var(--popover))] border-[var(--glass-border)]">
        <CommandInput placeholder={lang === 'id' ? 'Cari menu, halaman, atau fitur...' : 'Search menus, pages, or features...'} />
        <CommandList>
          <CommandEmpty>{lang === 'id' ? 'Tidak ditemukan.' : 'No results found.'}</CommandEmpty>
          {groups.map((group) => {
            const items = menuItems.filter(i => i.group === group);
            return (
              <CommandGroup key={group} heading={group}>
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.path}
                      value={`${item.label} ${item.labelId} ${item.keywords}`}
                      onSelect={() => handleSelect(item.path)}
                      className="gap-2 cursor-pointer"
                    >
                      <Icon className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <span>{lang === 'id' ? item.labelId : item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            );
          })}
        </CommandList>
      </Command>
    </CommandDialog>
  );
};

export default CommandPalette;
