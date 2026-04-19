import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { useOutletContext } from 'react-router-dom';
import api from '../../api/client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Minus, Trash2, ShoppingCart, Search, CreditCard, X, Wallet, Delete, Printer } from 'lucide-react';
import escpos from '../../services/escposPrinter';

const fmtIDR = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

export default function POSPage() {
  const { currentOutlet, outlets } = useAuth();
  const { lang } = useLang();
  const { currentShift } = useOutletContext() || {};

  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [orderType, setOrderType] = useState('dine_in');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [payMethod, setPayMethod] = useState('cash');
  const [tendered, setTendered] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await api.get('/api/cashier/menu', { params: { outlet_id: currentOutlet } });
        setMenu(res.data.items || []);
        setCategories(['All', ...(res.data.categories || [])]);
      } catch (e) {
        toast.error(lang === 'id' ? 'Gagal memuat menu' : 'Failed to load menu');
      }
    };
    if (currentOutlet) fetchMenu();
  }, [currentOutlet, lang]);

  const filteredMenu = useMemo(() => {
    return menu.filter(m => {
      if (activeCategory !== 'All' && m.category !== activeCategory) return false;
      if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [menu, activeCategory, search]);

  const addToCart = (item) => {
    if (!currentShift) { toast.error(lang === 'id' ? 'Buka shift terlebih dahulu' : 'Please open a shift first'); return; }
    setCart(prev => {
      const existing = prev.find(c => c.menu_item_id === item.id);
      if (existing) return prev.map(c => c.menu_item_id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, qty: 1, notes: '' }];
    });
  };

  const updateQty = (idx, delta) => {
    setCart(prev => {
      const next = [...prev];
      next[idx].qty = Math.max(1, next[idx].qty + delta);
      return next;
    });
  };

  const removeLine = (idx) => setCart(prev => prev.filter((_, i) => i !== idx));
  const clearCart = () => { setCart([]); setTableNumber(''); setCustomerName(''); setNotes(''); };

  const cartQty = cart.reduce((s, l) => s + l.qty, 0);
  const subtotal = cart.reduce((s, l) => s + l.qty * l.price, 0);
  const total = subtotal;
  const change = payMethod === 'cash' ? Math.max(0, parseFloat(tendered || 0) - total) : 0;

  const openCheckout = () => {
    if (!currentShift) { toast.error(lang === 'id' ? 'Buka shift dulu' : 'Open a shift first'); return; }
    if (cart.length === 0) { toast.error(lang === 'id' ? 'Keranjang kosong' : 'Cart is empty'); return; }
    setTendered(String(total));
    setCartDrawerOpen(false);
    setCheckoutOpen(true);
  };

  // Numeric keypad helpers for cash input
  const keypadPress = (v) => {
    if (v === 'backspace') setTendered(t => (t || '').slice(0, -1) || '0');
    else if (v === 'clear') setTendered('0');
    else setTendered(t => {
      const cur = (t === '0' || !t) ? '' : t;
      return cur + v;
    });
  };

  // Quick-pay denominations
  const quickAmounts = [50000, 100000, 150000, 200000, 500000];

  const submitOrder = async () => {
    setSubmitting(true);
    try {
      const createRes = await api.post('/api/cashier/orders', {
        outlet_id: currentOutlet,
        order_type: orderType,
        customer_name: customerName,
        table_number: tableNumber,
        lines: cart.map(l => ({ menu_item_id: l.menu_item_id, name: l.name, qty: l.qty, price: l.price, notes: l.notes || '' })),
        notes, discount: 0, tax_rate: 0,
      });
      const order = createRes.data.order;
      const payRes = await api.post(`/api/cashier/orders/${order.id}/pay`, {
        payment_method: payMethod,
        amount_tendered: parseFloat(tendered || total),
      });
      toast.success(lang === 'id' ? `Order ${order.order_number} berhasil dibayar` : `Order ${order.order_number} paid`);
      const finalOrder = { ...payRes.data.order, change: payRes.data.change };
      setReceiptOrder(finalOrder);

      // Auto-print + open cash drawer if enabled
      const autoPrint = localStorage.getItem('lp_auto_print_receipt') !== '0';
      if (autoPrint) {
        const outlet = outlets.find(o => o.id === currentOutlet);
        try {
          await escpos.smartPrint({
            outlet,
            order_number: finalOrder.order_number,
            paid_at: finalOrder.paid_at,
            order_type: finalOrder.order_type,
            table_number: finalOrder.table_number,
            customer_name: finalOrder.customer_name,
            lines: finalOrder.lines,
            total: finalOrder.total,
            payment_method: finalOrder.payment_method,
            amount_tendered: finalOrder.amount_tendered,
            change: finalOrder.change_amount || finalOrder.change || 0,
          });
        } catch (e) { /* silent: screen receipt is still shown */ }
      }

      clearCart();
      setCheckoutOpen(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || (lang === 'id' ? 'Gagal memproses order' : 'Failed to process order'));
    } finally {
      setSubmitting(false);
    }
  };

  const reprintReceipt = async () => {
    if (!receiptOrder) return;
    const outlet = outlets.find(o => o.id === currentOutlet);
    try {
      const mode = await escpos.smartPrint({
        outlet,
        order_number: receiptOrder.order_number,
        paid_at: receiptOrder.paid_at,
        order_type: receiptOrder.order_type,
        table_number: receiptOrder.table_number,
        customer_name: receiptOrder.customer_name,
        lines: receiptOrder.lines,
        total: receiptOrder.total,
        payment_method: receiptOrder.payment_method,
        amount_tendered: receiptOrder.amount_tendered,
        change: receiptOrder.change_amount || receiptOrder.change || 0,
      });
      toast.success(mode === 'thermal' ? (lang === 'id' ? 'Cetak ulang ke printer thermal' : 'Reprinted to thermal') : (lang === 'id' ? 'Dialog print browser dibuka' : 'Browser print opened'));
    } catch (e) { toast.error(e.message); }
  };

  if (!currentOutlet) {
    return <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Pilih outlet terlebih dahulu' : 'Please select an outlet'}</div>;
  }

  // ============ Cart Panel (reusable) ============
  const CartPanel = ({ inDrawer = false }) => (
    <div className={`flex flex-col gap-3 ${inDrawer ? 'h-full' : ''}`}>
      {!inDrawer && (
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
            <ShoppingCart className="w-4 h-4" /> {lang === 'id' ? 'Keranjang' : 'Cart'} ({cartQty})
          </h3>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart} className="h-8 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]" data-testid="pos-cart-clear">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Select value={orderType} onValueChange={setOrderType}>
          <SelectTrigger className="h-10 text-sm bg-[var(--glass-bg-strong)]" data-testid="pos-order-type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dine_in">{lang === 'id' ? 'Dine-in' : 'Dine-in'}</SelectItem>
            <SelectItem value="takeaway">{lang === 'id' ? 'Bawa pulang' : 'Takeaway'}</SelectItem>
            <SelectItem value="delivery">{lang === 'id' ? 'Antar' : 'Delivery'}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder={orderType === 'dine_in' ? (lang === 'id' ? 'No. Meja' : 'Table') : (lang === 'id' ? 'Pelanggan' : 'Customer')}
          value={orderType === 'dine_in' ? tableNumber : customerName}
          onChange={(e) => orderType === 'dine_in' ? setTableNumber(e.target.value) : setCustomerName(e.target.value)}
          className="h-10 text-sm bg-[var(--glass-bg-strong)]"
          data-testid="pos-order-meta"
        />
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1 min-h-[120px]">
        {cart.length === 0 && (
          <div className="text-center py-10 text-sm text-[hsl(var(--muted-foreground))]">
            {currentShift ? (lang === 'id' ? 'Tambahkan menu untuk memulai' : 'Add items to start') : (lang === 'id' ? 'Buka shift terlebih dahulu' : 'Open a shift first')}
          </div>
        )}
        {cart.map((line, idx) => (
          <div key={idx} className="flex items-center gap-2 p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]" data-testid={`pos-cart-line-${idx}`}>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{line.name}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">{fmtIDR(line.price)} × {line.qty}</div>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="h-10 w-10 p-0" onClick={() => updateQty(idx, -1)} data-testid={`pos-cart-qty-minus-${idx}`}>
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-semibold">{line.qty}</span>
              <Button size="sm" variant="outline" className="h-10 w-10 p-0" onClick={() => updateQty(idx, 1)} data-testid={`pos-cart-qty-plus-${idx}`}>
                <Plus className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-10 w-10 p-0 text-[hsl(var(--destructive))]" onClick={() => removeLine(idx)} data-testid={`pos-cart-remove-${idx}`}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-1 pt-2 border-t border-[var(--glass-border)]">
        <div className="flex justify-between text-sm text-[hsl(var(--muted-foreground))]">
          <span>Subtotal</span><span>{fmtIDR(subtotal)}</span>
        </div>
        <div className="flex justify-between font-bold text-xl">
          <span>Total</span>
          <span className="text-[hsl(var(--primary))]" data-testid="pos-cart-total">{fmtIDR(total)}</span>
        </div>
      </div>
      <Button
        onClick={openCheckout}
        disabled={cart.length === 0 || !currentShift}
        className="w-full gap-2 h-14 text-base font-semibold"
        data-testid="pos-checkout-btn"
      >
        <CreditCard className="w-5 h-5" /> {lang === 'id' ? 'Bayar' : 'Checkout'}
      </Button>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 min-h-[calc(100vh-180px)] pb-20 lg:pb-0" data-testid="pos-page">
      {/* LEFT: Menu */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <Input
            placeholder={lang === 'id' ? 'Cari menu...' : 'Search menu...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 text-base bg-[var(--glass-bg)] border-[var(--glass-border)]"
            data-testid="pos-search-input"
          />
        </div>

        {/* Category pill tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {categories.map(cat => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 h-11 px-4 rounded-full text-sm transition-colors whitespace-nowrap border ${
                  active
                    ? 'bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/40 font-semibold'
                    : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
                data-testid={`pos-category-${cat.toLowerCase().replace(/ /g, '-')}`}
              >
                {cat === 'All' ? (lang === 'id' ? 'Semua' : 'All') : cat}
              </button>
            );
          })}
        </div>

        {/* Menu grid - larger touch targets on tablet */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredMenu.map(item => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              disabled={!currentShift}
              className="group text-left bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[hsl(var(--primary))]/40 hover:-translate-y-0.5 active:scale-95 transition-transform duration-150 rounded-xl p-3 disabled:opacity-50 disabled:cursor-not-allowed min-h-[140px] flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              data-testid={`pos-menu-item-${item.id}`}
            >
              <div>
                <div className="text-sm font-semibold line-clamp-2 mb-1">{item.name}</div>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-[var(--glass-border)] text-[hsl(var(--muted-foreground))]">{item.category}</Badge>
              </div>
              <div className="text-base font-bold text-[hsl(var(--primary))] mt-3">{fmtIDR(item.price)}</div>
            </button>
          ))}
          {filteredMenu.length === 0 && (
            <div className="col-span-full text-center py-10 text-[hsl(var(--muted-foreground))] text-sm">{lang === 'id' ? 'Tidak ada menu' : 'No menu items'}</div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart (desktop sticky) */}
      <div className="hidden lg:block lg:sticky lg:top-[132px] lg:self-start">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardContent className="p-4 flex flex-col gap-3 max-h-[calc(100vh-160px)]">
            <CartPanel />
          </CardContent>
        </Card>
      </div>

      {/* Mobile/Tablet floating cart FAB */}
      <button
        onClick={() => setCartDrawerOpen(true)}
        disabled={cart.length === 0}
        className="lg:hidden fixed bottom-4 left-4 right-4 h-14 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg flex items-center justify-between px-6 font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform z-30"
        data-testid="pos-mobile-cart-fab"
      >
        <span className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          <span>{cartQty} {lang === 'id' ? 'item' : 'items'}</span>
        </span>
        <span>{fmtIDR(total)}</span>
      </button>

      {/* Mobile cart drawer (Sheet) */}
      <Sheet open={cartDrawerOpen} onOpenChange={setCartDrawerOpen}>
        <SheetContent side="bottom" className="h-[85vh] bg-[hsl(var(--card))] border-[var(--glass-border)] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> {lang === 'id' ? 'Keranjang' : 'Cart'} ({cartQty})
            </SheetTitle>
          </SheetHeader>
          <div className="pt-3 h-[calc(85vh-60px)]">
            <CartPanel inDrawer />
          </div>
        </SheetContent>
      </Sheet>

      {/* Checkout dialog with numeric keypad */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md bg-[hsl(var(--card))] border-[var(--glass-border)] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{lang === 'id' ? 'Pembayaran' : 'Payment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between text-xl font-bold p-4 rounded-lg bg-[var(--glass-bg-strong)]">
              <span>Total</span>
              <span className="text-[hsl(var(--primary))]">{fmtIDR(total)}</span>
            </div>
            <div>
              <Label className="text-sm mb-2 block font-medium">{lang === 'id' ? 'Metode Pembayaran' : 'Payment Method'}</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'cash', label: lang === 'id' ? 'Tunai' : 'Cash' },
                  { value: 'card', label: lang === 'id' ? 'Kartu' : 'Card' },
                  { value: 'qris', label: 'QRIS' },
                  { value: 'online', label: lang === 'id' ? 'Online/App' : 'Online' },
                ].map(m => (
                  <button
                    key={m.value}
                    onClick={() => setPayMethod(m.value)}
                    className={`h-12 text-sm rounded-lg border-2 transition-colors font-medium ${
                      payMethod === m.value
                        ? 'bg-[hsl(var(--primary))]/15 border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                        : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-[var(--glass-border-strong)]'
                    }`}
                    data-testid={`pos-pay-method-${m.value}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            {payMethod === 'cash' && (
              <>
                <div>
                  <Label className="text-sm mb-2 block font-medium">{lang === 'id' ? 'Uang Diterima' : 'Amount Tendered'}</Label>
                  <Input
                    type="number"
                    value={tendered}
                    onChange={(e) => setTendered(e.target.value)}
                    className="h-12 text-lg font-bold bg-[var(--glass-bg)] text-right"
                    data-testid="pos-amount-tendered"
                  />
                  <div className="flex justify-between mt-2 text-base">
                    <span className="text-[hsl(var(--muted-foreground))]">{lang === 'id' ? 'Kembalian' : 'Change'}</span>
                    <span className="font-bold text-emerald-400 text-lg" data-testid="pos-change">{fmtIDR(change)}</span>
                  </div>
                </div>
                {/* Quick amount buttons */}
                <div className="grid grid-cols-5 gap-1.5">
                  {quickAmounts.map(amt => (
                    <button
                      key={amt}
                      onClick={() => setTendered(String(amt))}
                      className="h-10 text-xs font-semibold rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[hsl(var(--primary))]/40 active:scale-95 transition-transform"
                      data-testid={`pos-quick-amount-${amt}`}
                    >
                      {amt >= 1000 ? `${amt / 1000}K` : amt}
                    </button>
                  ))}
                </div>
                {/* Numeric keypad */}
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'backspace'].map(k => (
                    <button
                      key={k}
                      onClick={() => keypadPress(k)}
                      className="h-12 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] hover:bg-[var(--glass-bg)] active:scale-95 transition-transform text-lg font-semibold flex items-center justify-center"
                      data-testid={`pos-keypad-${k}`}
                    >
                      {k === 'backspace' ? <Delete className="w-5 h-5" /> : k}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div>
              <Label className="text-sm mb-1.5 block">{lang === 'id' ? 'Catatan (opsional)' : 'Notes (optional)'}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="bg-[var(--glass-bg)]" data-testid="pos-notes" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCheckoutOpen(false)} className="h-12 flex-1" data-testid="pos-checkout-cancel">
              {lang === 'id' ? 'Batal' : 'Cancel'}
            </Button>
            <Button onClick={submitOrder} disabled={submitting} className="gap-2 h-12 flex-1 text-base font-semibold" data-testid="pos-checkout-confirm">
              <Wallet className="w-5 h-5" /> {submitting ? (lang === 'id' ? 'Memproses...' : 'Processing...') : (lang === 'id' ? 'Konfirmasi' : 'Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt dialog */}
      <Dialog open={!!receiptOrder} onOpenChange={(o) => !o && setReceiptOrder(null)}>
        <DialogContent className="max-w-sm bg-[hsl(var(--card))] border-[var(--glass-border)]">
          <DialogHeader>
            <DialogTitle className="text-center">{lang === 'id' ? 'Struk Pembayaran' : 'Receipt'}</DialogTitle>
          </DialogHeader>
          {receiptOrder && (
            <div className="text-sm space-y-3 font-mono">
              <div className="text-center border-b border-[var(--glass-border)] pb-2">
                <div className="font-semibold">{receiptOrder.order_number}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(receiptOrder.paid_at || Date.now()).toLocaleString('id-ID')}</div>
              </div>
              <div className="space-y-1">
                {receiptOrder.lines?.map((l, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{l.qty}× {l.name}</span>
                    <span>{fmtIDR(l.qty * l.price)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[var(--glass-border)] pt-2 space-y-1">
                <div className="flex justify-between font-semibold text-[hsl(var(--primary))]">
                  <span>TOTAL</span><span>{fmtIDR(receiptOrder.total)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>{lang === 'id' ? 'Metode' : 'Method'}</span><span className="uppercase">{receiptOrder.payment_method}</span>
                </div>
                {receiptOrder.payment_method === 'cash' && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span>{lang === 'id' ? 'Diterima' : 'Tendered'}</span><span>{fmtIDR(receiptOrder.amount_tendered)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-400">
                      <span>{lang === 'id' ? 'Kembali' : 'Change'}</span><span>{fmtIDR(receiptOrder.change_amount || receiptOrder.change || 0)}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="text-center text-xs text-[hsl(var(--muted-foreground))] pt-2">{lang === 'id' ? 'Terima kasih!' : 'Thank you!'}</div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={reprintReceipt} className="h-12 gap-2" data-testid="pos-receipt-reprint">
              <Printer className="w-4 h-4" /> {lang === 'id' ? 'Cetak Ulang' : 'Reprint'}
            </Button>
            <Button className="flex-1 h-12" onClick={() => setReceiptOrder(null)} data-testid="pos-receipt-close">
              {lang === 'id' ? 'Tutup' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
