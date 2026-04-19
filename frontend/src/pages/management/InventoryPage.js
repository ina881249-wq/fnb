import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { DataTable } from '../../components/common/DataTable';
import { Plus, Package, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const formatCurrency = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`;

export default function InventoryPage() {
  const { currentOutlet, outlets } = useAuth();
  const [items, setItems] = useState([]);
  const [stock, setStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [dashData, setDashData] = useState(null);
  const [activeTab, setActiveTab] = useState('stock');
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ name: '', category: 'Grains', uom: 'kg', pack_size: 1, material_level: 'raw', reorder_threshold: 10, cost_per_unit: 0, description: '' });
  const [newMovement, setNewMovement] = useState({ type: 'count', item_id: '', outlet_id: '', quantity: 0, reason: '' });

  // DataTable controls per tab
  const [stockSearch, setStockSearch] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');
  const [stockPage, setStockPage] = useState(0);
  const [stockPageSize, setStockPageSize] = useState(20);
  const [stockSort, setStockSort] = useState({ key: 'item_name', dir: 'asc' });

  const [itemSearch, setItemSearch] = useState('');
  const [itemLevelFilter, setItemLevelFilter] = useState('all');
  const [itemPage, setItemPage] = useState(0);
  const [itemPageSize, setItemPageSize] = useState(20);
  const [itemSort, setItemSort] = useState({ key: 'name', dir: 'asc' });

  const [movSearch, setMovSearch] = useState('');
  const [movTypeFilter, setMovTypeFilter] = useState('all');
  const [movPage, setMovPage] = useState(0);
  const [movPageSize, setMovPageSize] = useState(20);
  const [movSort, setMovSort] = useState({ key: 'date', dir: 'desc' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = currentOutlet ? { outlet_id: currentOutlet } : {};
      const [itemsRes, stockRes, movRes, dashRes] = await Promise.all([
        api.get('/api/inventory/items', { params: { limit: 500 } }),
        api.get('/api/inventory/stock', { params: { ...params, limit: 500 } }),
        api.get('/api/inventory/stock-movements', { params: { ...params, limit: 200 } }),
        api.get('/api/inventory/dashboard', { params }),
      ]);
      setItems(itemsRes.data.items || []);
      setStock(stockRes.data.stock || []);
      setMovements(movRes.data.movements || []);
      setDashData(dashRes.data);
    } catch (err) { toast.error('Failed to load inventory data'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentOutlet]);

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/inventory/items', { ...newItem, cost_per_unit: parseFloat(newItem.cost_per_unit), reorder_threshold: parseFloat(newItem.reorder_threshold) });
      toast.success('Item created');
      setShowCreateItem(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleCreateMovement = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/inventory/stock-movements', { ...newMovement, quantity: parseFloat(newMovement.quantity) });
      toast.success('Stock movement recorded');
      setShowMovement(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const chartData = dashData?.category_values?.map(c => ({ name: c.category, value: c.value / 1000000 })) || [];
  const chartTooltipStyle = { contentStyle: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', borderRadius: '8px', color: '#EAF0F7', fontSize: '12px' } };

  // ============ STOCK TABLE ============
  const filteredStock = useMemo(() => {
    let rows = stock;
    if (stockSearch) {
      const q = stockSearch.toLowerCase();
      rows = rows.filter(r => (r.item_name || '').toLowerCase().includes(q) || (r.item_category || '').toLowerCase().includes(q) || (r.outlet_name || '').toLowerCase().includes(q));
    }
    if (stockStatusFilter === 'low') rows = rows.filter(r => r.is_low_stock);
    else if (stockStatusFilter === 'ok') rows = rows.filter(r => !r.is_low_stock);
    const sorted = [...rows].sort((a, b) => {
      const av = a[stockSort.key]; const bv = b[stockSort.key];
      if (av == null) return 1; if (bv == null) return -1;
      const cmp = typeof av === 'number' ? (av - bv) : String(av).localeCompare(String(bv));
      return stockSort.dir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [stock, stockSearch, stockStatusFilter, stockSort]);

  const stockCols = [
    { key: 'item_name', label: 'Item', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
    { key: 'item_category', label: 'Category', sortable: true, render: (v) => <Badge variant="outline" className="text-[10px]">{v}</Badge> },
    { key: 'outlet_name', label: 'Outlet', sortable: true, render: (v) => <span className="text-[hsl(var(--muted-foreground))]">{v || '-'}</span> },
    { key: 'quantity', label: 'Qty', sortable: true, align: 'right', render: (v) => (v || 0).toFixed(1) },
    { key: 'item_uom', label: 'UOM', render: (v) => <span className="text-[hsl(var(--muted-foreground))]">{v}</span> },
    { key: 'value', label: 'Value', sortable: true, align: 'right', render: (v) => formatCurrency(v) },
    { key: 'is_low_stock', label: 'Status', render: (v) => v ? <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">Low</Badge> : <Badge variant="outline" className="text-[10px] text-green-400 border-green-500/30">OK</Badge> },
  ];

  // ============ ITEMS TABLE ============
  const filteredItems = useMemo(() => {
    let rows = items;
    if (itemSearch) {
      const q = itemSearch.toLowerCase();
      rows = rows.filter(r => (r.name || '').toLowerCase().includes(q) || (r.category || '').toLowerCase().includes(q));
    }
    if (itemLevelFilter !== 'all') rows = rows.filter(r => r.material_level === itemLevelFilter);
    const sorted = [...rows].sort((a, b) => {
      const av = a[itemSort.key]; const bv = b[itemSort.key];
      if (av == null) return 1; if (bv == null) return -1;
      const cmp = typeof av === 'number' ? (av - bv) : String(av).localeCompare(String(bv));
      return itemSort.dir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [items, itemSearch, itemLevelFilter, itemSort]);

  const itemCols = [
    { key: 'name', label: 'Name', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
    { key: 'category', label: 'Category', sortable: true, render: (v) => <Badge variant="outline" className="text-[10px]">{v}</Badge> },
    { key: 'material_level', label: 'Level', sortable: true, render: (v) => <Badge variant="outline" className={`text-[10px] ${v === 'raw' ? 'border-green-500/30 text-green-400' : v === 'prep' ? 'border-cyan-500/30 text-cyan-400' : 'border-purple-500/30 text-purple-400'}`}>{v}</Badge> },
    { key: 'uom', label: 'UOM' },
    { key: 'cost_per_unit', label: 'Cost/Unit', sortable: true, align: 'right', render: (v) => formatCurrency(v) },
    { key: 'reorder_threshold', label: 'Reorder', sortable: true, align: 'right' },
  ];

  // ============ MOVEMENTS TABLE ============
  const filteredMovements = useMemo(() => {
    let rows = movements;
    if (movSearch) {
      const q = movSearch.toLowerCase();
      rows = rows.filter(r => (r.item_name || '').toLowerCase().includes(q) || (r.reason || '').toLowerCase().includes(q) || (r.type || '').toLowerCase().includes(q));
    }
    if (movTypeFilter !== 'all') rows = rows.filter(r => r.type === movTypeFilter);
    const sorted = [...rows].sort((a, b) => {
      const av = a[movSort.key]; const bv = b[movSort.key];
      if (av == null) return 1; if (bv == null) return -1;
      const cmp = typeof av === 'number' ? (av - bv) : String(av).localeCompare(String(bv));
      return movSort.dir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [movements, movSearch, movTypeFilter, movSort]);

  const movCols = [
    { key: 'date', label: 'Date', sortable: true },
    { key: 'type', label: 'Type', sortable: true, render: (v) => <Badge variant="outline" className={`text-[10px] ${v === 'waste' ? 'border-red-500/30 text-red-400' : v === 'transfer' ? 'border-cyan-500/30 text-cyan-400' : v === 'count' ? 'border-green-500/30 text-green-400' : 'border-amber-500/30 text-amber-400'}`}>{v}</Badge> },
    { key: 'item_name', label: 'Item', sortable: true },
    { key: 'quantity', label: 'Qty', sortable: true, align: 'right' },
    { key: 'item_uom', label: 'UOM', render: (v) => <span className="text-[hsl(var(--muted-foreground))]">{v}</span> },
    { key: 'reason', label: 'Reason', render: (v) => <span className="text-[hsl(var(--muted-foreground))]">{v || '-'}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Inventory</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Items, stock levels, and movements</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateItem} onOpenChange={setShowCreateItem}>
            <DialogTrigger asChild><Button className="gap-2" data-testid="create-item-button"><Plus className="w-4 h-4" /> Item</Button></DialogTrigger>
            <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)]">
              <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateItem} className="space-y-3">
                <div><Label>Name</Label><Input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="bg-[hsl(var(--secondary))]" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Category</Label><Input value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                  <div><Label>UOM</Label><Input value={newItem.uom} onChange={e => setNewItem({...newItem, uom: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Material Level</Label>
                    <Select value={newItem.material_level} onValueChange={v => setNewItem({...newItem, material_level: v})}>
                      <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="raw">Raw Material</SelectItem><SelectItem value="prep">Prep Material</SelectItem><SelectItem value="sub_prep">Sub-Prep</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Cost/Unit</Label><Input type="number" value={newItem.cost_per_unit} onChange={e => setNewItem({...newItem, cost_per_unit: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                </div>
                <div><Label>Reorder Threshold</Label><Input type="number" value={newItem.reorder_threshold} onChange={e => setNewItem({...newItem, reorder_threshold: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                <Button type="submit" className="w-full">Create Item</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={showMovement} onOpenChange={setShowMovement}>
            <DialogTrigger asChild><Button variant="outline" className="gap-2 border-[var(--glass-border)]" data-testid="create-stock-movement-button"><Plus className="w-4 h-4" /> Movement</Button></DialogTrigger>
            <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)]">
              <DialogHeader><DialogTitle>Stock Movement</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateMovement} className="space-y-3">
                <div><Label>Type</Label>
                  <Select value={newMovement.type} onValueChange={v => setNewMovement({...newMovement, type: v})}>
                    <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="count">Stock Count</SelectItem><SelectItem value="adjustment">Adjustment</SelectItem><SelectItem value="waste">Waste</SelectItem><SelectItem value="transfer">Transfer</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Item</Label>
                  <Select value={newMovement.item_id} onValueChange={v => setNewMovement({...newMovement, item_id: v})}>
                    <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="Select Item" /></SelectTrigger>
                    <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.uom})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Outlet</Label>
                  <Select value={newMovement.outlet_id} onValueChange={v => setNewMovement({...newMovement, outlet_id: v})}>
                    <SelectTrigger className="bg-[hsl(var(--secondary))]"><SelectValue placeholder="Select Outlet" /></SelectTrigger>
                    <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Quantity</Label><Input type="number" value={newMovement.quantity} onChange={e => setNewMovement({...newMovement, quantity: e.target.value})} className="bg-[hsl(var(--secondary))]" required /></div>
                <div><Label>Reason</Label><Input value={newMovement.reason} onChange={e => setNewMovement({...newMovement, reason: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                <Button type="submit" className="w-full">Record Movement</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Items</span>
            <p className="text-2xl font-semibold mt-1" style={{ fontFamily: 'Space Grotesk' }}>{dashData?.total_items || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Stock Value</span>
            <p className="text-2xl font-semibold mt-1" style={{ fontFamily: 'Space Grotesk' }}>{formatCurrency(dashData?.total_stock_value)}</p>
          </CardContent>
        </Card>
        <Card className={`bg-[var(--glass-bg)] border-[var(--glass-border)] ${dashData?.low_stock_count > 0 ? 'border-amber-400/30' : ''}`}>
          <CardContent className="p-4">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Low Stock</span>
            <p className="text-2xl font-semibold mt-1 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
              {dashData?.low_stock_count > 0 && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {dashData?.low_stock_count || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Movements</span>
            <p className="text-2xl font-semibold mt-1" style={{ fontFamily: 'Space Grotesk' }}>{dashData?.recent_movements_count || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Category chart */}
      {chartData.length > 0 && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
          <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>Stock Value by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(234,240,247,0.65)', fontSize: 11 }} tickFormatter={v => `${v}M`} />
                <Tooltip {...chartTooltipStyle} formatter={v => [`Rp ${v.toFixed(1)}M`, 'Value']} />
                <Bar dataKey="value" fill="#2DD4BF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[var(--glass-bg)] border border-[var(--glass-border)]">
          <TabsTrigger value="stock">Stock on Hand ({filteredStock.length})</TabsTrigger>
          <TabsTrigger value="items">Items ({filteredItems.length})</TabsTrigger>
          <TabsTrigger value="movements">Movements ({filteredMovements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4">
          <DataTable
            data={filteredStock}
            columns={stockCols}
            total={filteredStock.length}
            page={stockPage}
            pageSize={stockPageSize}
            onPageChange={setStockPage}
            onPageSizeChange={(s) => { setStockPageSize(s); setStockPage(0); }}
            searchValue={stockSearch}
            onSearchChange={(v) => { setStockSearch(v); setStockPage(0); }}
            searchPlaceholder="Search item, category, outlet..."
            filters={[{ key: 'status', label: 'Status', value: stockStatusFilter, onChange: (v) => { setStockStatusFilter(v); setStockPage(0); }, options: [{ value: 'low', label: 'Low stock' }, { value: 'ok', label: 'OK' }] }]}
            sortKey={stockSort.key}
            sortDir={stockSort.dir}
            onSort={(k, d) => setStockSort({ key: k, dir: d })}
            loading={loading}
            emptyIcon={<Package className="w-10 h-10 opacity-30" />}
            emptyTitle="No stock records"
            emptyDescription="Stock levels will appear here once items are received."
          />
        </TabsContent>

        <TabsContent value="items" className="mt-4">
          <DataTable
            data={filteredItems}
            columns={itemCols}
            total={filteredItems.length}
            page={itemPage}
            pageSize={itemPageSize}
            onPageChange={setItemPage}
            onPageSizeChange={(s) => { setItemPageSize(s); setItemPage(0); }}
            searchValue={itemSearch}
            onSearchChange={(v) => { setItemSearch(v); setItemPage(0); }}
            searchPlaceholder="Search item name or category..."
            filters={[{ key: 'level', label: 'Level', value: itemLevelFilter, onChange: (v) => { setItemLevelFilter(v); setItemPage(0); }, options: [{ value: 'raw', label: 'Raw' }, { value: 'prep', label: 'Prep' }, { value: 'sub_prep', label: 'Sub-Prep' }] }]}
            sortKey={itemSort.key}
            sortDir={itemSort.dir}
            onSort={(k, d) => setItemSort({ key: k, dir: d })}
            loading={loading}
            emptyIcon={<Package className="w-10 h-10 opacity-30" />}
            emptyTitle="No items yet"
            emptyDescription="Create your first inventory item."
          />
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <DataTable
            data={filteredMovements}
            columns={movCols}
            total={filteredMovements.length}
            page={movPage}
            pageSize={movPageSize}
            onPageChange={setMovPage}
            onPageSizeChange={(s) => { setMovPageSize(s); setMovPage(0); }}
            searchValue={movSearch}
            onSearchChange={(v) => { setMovSearch(v); setMovPage(0); }}
            searchPlaceholder="Search item, type, reason..."
            filters={[{ key: 'type', label: 'Type', value: movTypeFilter, onChange: (v) => { setMovTypeFilter(v); setMovPage(0); }, options: [{ value: 'count', label: 'Count' }, { value: 'adjustment', label: 'Adjustment' }, { value: 'waste', label: 'Waste' }, { value: 'transfer', label: 'Transfer' }, { value: 'receipt', label: 'Receipt' }, { value: 'consumption', label: 'Consumption' }] }]}
            sortKey={movSort.key}
            sortDir={movSort.dir}
            onSort={(k, d) => setMovSort({ key: k, dir: d })}
            loading={loading}
            emptyIcon={<Package className="w-10 h-10 opacity-30" />}
            emptyTitle="No movements"
            emptyDescription="Stock movements will appear here."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
