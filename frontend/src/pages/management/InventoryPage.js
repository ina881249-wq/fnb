import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Plus, Package, AlertTriangle, Search } from 'lucide-react';
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
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ name: '', category: 'Grains', uom: 'kg', pack_size: 1, material_level: 'raw', reorder_threshold: 10, cost_per_unit: 0, description: '' });
  const [newMovement, setNewMovement] = useState({ type: 'count', item_id: '', outlet_id: '', quantity: 0, reason: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = currentOutlet ? { outlet_id: currentOutlet } : {};
      const [itemsRes, stockRes, movRes, dashRes] = await Promise.all([
        api.get('/api/inventory/items', { params: { search, limit: 100 } }),
        api.get('/api/inventory/stock', { params: { ...params, limit: 100 } }),
        api.get('/api/inventory/stock-movements', { params: { ...params, limit: 50 } }),
        api.get('/api/inventory/dashboard', { params }),
      ]);
      setItems(itemsRes.data.items || []);
      setStock(stockRes.data.stock || []);
      setMovements(movRes.data.movements || []);
      setDashData(dashRes.data);
    } catch (err) { toast.error('Failed to load inventory data'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentOutlet, search]);

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
          <TabsTrigger value="stock">Stock on Hand</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                    <TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead>Outlet</TableHead>
                    <TableHead className="text-right">Qty</TableHead><TableHead>UOM</TableHead>
                    <TableHead className="text-right">Value</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.map((s, i) => (
                    <TableRow key={i} className="border-[var(--glass-border)] hover:bg-white/5">
                      <TableCell className="font-medium">{s.item_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{s.item_category}</Badge></TableCell>
                      <TableCell className="text-[hsl(var(--muted-foreground))]">{s.outlet_name || '-'}</TableCell>
                      <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{(s.quantity || 0).toFixed(1)}</TableCell>
                      <TableCell className="text-[hsl(var(--muted-foreground))]">{s.item_uom}</TableCell>
                      <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(s.value)}</TableCell>
                      <TableCell>{s.is_low_stock ? <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">Low</Badge> : <Badge variant="outline" className="text-[10px] text-green-400 border-green-500/30">OK</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="mt-4">
          <div className="mb-4"><Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm bg-[hsl(var(--secondary))] border-[var(--glass-border)]" /></div>
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                    <TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Level</TableHead>
                    <TableHead>UOM</TableHead><TableHead className="text-right">Cost/Unit</TableHead><TableHead className="text-right">Reorder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="border-[var(--glass-border)] hover:bg-white/5">
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{item.category}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={`text-[10px] ${item.material_level === 'raw' ? 'border-green-500/30 text-green-400' : item.material_level === 'prep' ? 'border-cyan-500/30 text-cyan-400' : 'border-purple-500/30 text-purple-400'}`}>{item.material_level}</Badge></TableCell>
                      <TableCell>{item.uom}</TableCell>
                      <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.cost_per_unit)}</TableCell>
                      <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{item.reorder_threshold}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                    <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead><TableHead>UOM</TableHead><TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id} className="border-[var(--glass-border)] hover:bg-white/5">
                      <TableCell className="text-sm">{m.date}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-[10px] ${
                        m.type === 'waste' ? 'border-red-500/30 text-red-400' :
                        m.type === 'transfer' ? 'border-cyan-500/30 text-cyan-400' :
                        m.type === 'count' ? 'border-green-500/30 text-green-400' :
                        'border-amber-500/30 text-amber-400'
                      }`}>{m.type}</Badge></TableCell>
                      <TableCell>{m.item_name}</TableCell>
                      <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{m.quantity}</TableCell>
                      <TableCell className="text-[hsl(var(--muted-foreground))]">{m.item_uom}</TableCell>
                      <TableCell className="text-[hsl(var(--muted-foreground))]">{m.reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
