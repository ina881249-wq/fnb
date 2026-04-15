import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Plus, BookOpen, ChefHat, Package, ArrowRight, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`;

export default function RecipeBOMPage() {
  const [recipes, setRecipes] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [newRecipe, setNewRecipe] = useState({
    name: '', output_item_id: '', output_quantity: 1, output_uom: 'porsi',
    description: '', yield_percentage: 100,
    lines: [{ item_id: '', quantity: 0, uom: '' }],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, itemsRes] = await Promise.all([
        api.get('/api/recipes', { params: { search } }),
        api.get('/api/inventory/items', { params: { limit: 200 } }),
      ]);
      setRecipes(recRes.data.recipes || []);
      setItems(itemsRes.data.items || []);
    } catch (err) { toast.error('Failed to load'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [search]);

  const viewRecipe = async (id) => {
    try {
      const res = await api.get(`/api/recipes/${id}`);
      setSelectedRecipe(res.data);
    } catch (err) { toast.error('Failed'); }
  };

  const addIngredient = () => {
    setNewRecipe(prev => ({ ...prev, lines: [...prev.lines, { item_id: '', quantity: 0, uom: '' }] }));
  };

  const removeIngredient = (idx) => {
    if (newRecipe.lines.length <= 1) return;
    setNewRecipe(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }));
  };

  const updateLine = (idx, field, value) => {
    setNewRecipe(prev => {
      const lines = [...prev.lines];
      lines[idx] = { ...lines[idx], [field]: value };
      return { ...prev, lines };
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/recipes', { ...newRecipe, yield_percentage: parseFloat(newRecipe.yield_percentage), output_quantity: parseFloat(newRecipe.output_quantity), lines: newRecipe.lines.map(l => ({ ...l, quantity: parseFloat(l.quantity) })) });
      toast.success('Recipe created');
      setShowCreate(false);
      setNewRecipe({ name: '', output_item_id: '', output_quantity: 1, output_uom: 'porsi', description: '', yield_percentage: 100, lines: [{ item_id: '', quantity: 0, uom: '' }] });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Recipe & BOM</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage recipes, bill of materials, and consumption rules</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button className="gap-2" data-testid="create-recipe-button"><Plus className="w-4 h-4" /> Recipe</Button></DialogTrigger>
          <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)] max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Recipe / BOM</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><Label>Recipe Name</Label><Input value={newRecipe.name} onChange={e => setNewRecipe({...newRecipe, name: e.target.value})} className="bg-[hsl(var(--secondary))]" required /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Output Item (optional)</Label>
                  <Select value={newRecipe.output_item_id || 'none'} onValueChange={v => setNewRecipe({...newRecipe, output_item_id: v === 'none' ? '' : v})}>
                    <SelectTrigger className="bg-[hsl(var(--secondary))] text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">None (menu item)</SelectItem>{items.filter(i => i.material_level !== 'raw').map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Output Qty</Label><Input type="number" value={newRecipe.output_quantity} onChange={e => setNewRecipe({...newRecipe, output_quantity: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
                <div><Label>Yield %</Label><Input type="number" value={newRecipe.yield_percentage} onChange={e => setNewRecipe({...newRecipe, yield_percentage: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>
              </div>
              <div><Label>Description</Label><Input value={newRecipe.description} onChange={e => setNewRecipe({...newRecipe, description: e.target.value})} className="bg-[hsl(var(--secondary))]" /></div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Ingredients (BOM)</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addIngredient} className="h-7 text-xs gap-1"><Plus className="w-3 h-3" /> Add</Button>
                </div>
                <div className="space-y-2">
                  {newRecipe.lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-6">
                        <Select value={line.item_id || ''} onValueChange={v => updateLine(idx, 'item_id', v)}>
                          <SelectTrigger className="bg-[hsl(var(--secondary))] h-9 text-xs"><SelectValue placeholder="Select item" /></SelectTrigger>
                          <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.uom})</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3"><Input type="number" placeholder="Qty" value={line.quantity || ''} onChange={e => updateLine(idx, 'quantity', e.target.value)} className="bg-[hsl(var(--secondary))] h-9 text-xs" /></div>
                      <div className="col-span-2"><Input placeholder="UOM" value={line.uom} onChange={e => updateLine(idx, 'uom', e.target.value)} className="bg-[hsl(var(--secondary))] h-9 text-xs" /></div>
                      <div className="col-span-1">{newRecipe.lines.length > 1 && <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-400" onClick={() => removeIngredient(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>}</div>
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full">Create Recipe</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm bg-[hsl(var(--secondary))] border-[var(--glass-border)]" />

      {/* Recipes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recipes.map(recipe => (
          <Card key={recipe.id} className="bg-[var(--glass-bg)] border-[var(--glass-border)] hover:bg-[var(--glass-bg-strong)] transition-colors cursor-pointer" onClick={() => viewRecipe(recipe.id)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-[hsl(var(--primary))]" />
                </div>
                <Badge variant="outline" className="text-[9px]">v{recipe.version}</Badge>
              </div>
              <h3 className="font-semibold text-sm mb-1" style={{ fontFamily: 'Space Grotesk' }}>{recipe.name}</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">{recipe.description || 'No description'}</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[hsl(var(--muted-foreground))]">{recipe.ingredient_count} ingredients</span>
                <span className="text-[hsl(var(--muted-foreground))]">Yield: {recipe.yield_percentage}%</span>
                {recipe.output_item_name && <Badge variant="outline" className="text-[9px]">{recipe.output_item_name}</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {recipes.length === 0 && !loading && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-8 text-center">
            <ChefHat className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--muted-foreground))]" />
            <p className="text-[hsl(var(--muted-foreground))]">No recipes yet. Create your first recipe!</p>
          </CardContent>
        </Card>
      )}

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="bg-[hsl(222,35%,10%)] border-[var(--glass-border)] max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ChefHat className="w-5 h-5 text-[hsl(var(--primary))]" /> {selectedRecipe?.name}</DialogTitle></DialogHeader>
          {selectedRecipe && (
            <div className="space-y-4">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{selectedRecipe.description}</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                  <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Output</span>
                  <p className="text-sm font-semibold mt-1">{selectedRecipe.output_quantity} {selectedRecipe.output_uom}</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                  <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Yield</span>
                  <p className="text-sm font-semibold mt-1">{selectedRecipe.yield_percentage}%</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
                  <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total Cost</span>
                  <p className="text-sm font-semibold mt-1">{formatCurrency(selectedRecipe.total_cost)}</p>
                </div>
              </div>
              <Table>
                <TableHeader><TableRow className="border-[var(--glass-border)]">
                  <TableHead>#</TableHead><TableHead>Ingredient</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>UOM</TableHead><TableHead className="text-right">Cost</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {selectedRecipe.lines?.map((l, i) => (
                    <TableRow key={i} className="border-[var(--glass-border)]">
                      <TableCell className="text-xs">{l.line_number}</TableCell>
                      <TableCell className="font-medium text-sm">{l.item_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px]">{l.item_category}</Badge></TableCell>
                      <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{l.quantity}</TableCell>
                      <TableCell className="text-xs text-[hsl(var(--muted-foreground))]">{l.item_uom}</TableCell>
                      <TableCell className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(l.quantity * l.cost_per_unit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
