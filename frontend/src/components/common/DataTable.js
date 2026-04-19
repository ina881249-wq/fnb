import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Download, Filter, X } from 'lucide-react';

/**
 * Reusable DataTable component with:
 * - Server-side or client-side pagination
 * - Search
 * - Column sorting
 * - Filter chips
 * - Bulk selection + actions
 * - Sticky header
 * - Page size selector
 * - Empty state
 */
export const DataTable = ({
  data = [],
  columns = [],
  total = 0,
  page = 0,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],         // [{key, label, options: [{value, label}], value, onChange}]
  onSort,
  sortKey = '',
  sortDir = 'asc',
  bulkActions = [],      // [{label, icon, onClick, variant}]
  selectedIds = [],
  onSelectChange,
  selectable = false,
  loading = false,
  emptyIcon = null,
  emptyTitle = 'No data',
  emptyDescription = '',
  onRowClick,
  rowClassName,
  stickyHeader = true,
  exportLabel = '',
  onExport,
}) => {
  const [localSelected, setLocalSelected] = useState([]);
  const selected = onSelectChange ? selectedIds : localSelected;
  const setSelected = onSelectChange || setLocalSelected;

  const totalPages = Math.ceil((total || data.length) / pageSize);
  const isServerSide = !!onPageChange;
  const displayData = isServerSide ? data : data.slice(page * pageSize, (page + 1) * pageSize);

  const toggleAll = () => {
    if (selected.length === displayData.length) {
      setSelected([]);
    } else {
      setSelected(displayData.map((d, i) => d.id || i));
    }
  };

  const toggleOne = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSort = (key) => {
    if (onSort) {
      const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
      onSort(key, newDir);
    }
  };

  const SortIcon = ({ colKey }) => {
    if (sortKey !== colKey) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const activeFilters = filters.filter(f => f.value && f.value !== '' && f.value !== 'all');

  return (
    <div className="space-y-3">
      {/* Top bar: search + filters + actions */}
      <div className="flex flex-wrap items-center gap-3">
        {onSearchChange && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-[hsl(var(--secondary))] border-[var(--glass-border)] h-9"
            />
          </div>
        )}
        {filters.map((f) => (
          <Select key={f.key} value={f.value || 'all'} onValueChange={f.onChange}>
            <SelectTrigger className="w-auto min-w-[130px] h-9 bg-[var(--glass-bg)] border-[var(--glass-border)] text-xs">
              <SelectValue placeholder={f.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{f.label}: All</SelectItem>
              {f.options?.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        {onExport && (
          <Button variant="outline" size="sm" className="h-9 gap-1.5 border-[var(--glass-border)] text-xs" onClick={onExport}>
            <Download className="w-3.5 h-3.5" /> {exportLabel || 'Export'}
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
          {activeFilters.map(f => (
            <Badge key={f.key} variant="outline" className="text-[10px] gap-1 cursor-pointer hover:bg-white/10" onClick={() => f.onChange('all')}>
              {f.label}: {f.value} <X className="w-2.5 h-2.5" />
            </Badge>
          ))}
        </div>
      )}

      {/* Bulk actions bar */}
      {selectable && selected.length > 0 && (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20">
          <span className="text-xs font-medium">{selected.length} selected</span>
          {bulkActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <Button key={i} size="sm" variant={action.variant || 'ghost'} className="h-7 text-xs gap-1" onClick={() => action.onClick(selected)}>
                {Icon && <Icon className="w-3.5 h-3.5" />} {action.label}
              </Button>
            );
          })}
          <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => setSelected([])}>Clear</Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className={stickyHeader ? 'sticky top-0 z-10 bg-[hsl(var(--card))]' : ''}>
              <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                {selectable && (
                  <TableHead className="w-10">
                    <Checkbox checked={selected.length === displayData.length && displayData.length > 0} onCheckedChange={toggleAll} />
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`${col.align === 'right' ? 'text-right' : ''} ${col.sortable ? 'cursor-pointer select-none' : ''} ${col.className || ''}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                    style={col.width ? { width: col.width } : {}}
                  >
                    <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                      {col.label}
                      {col.sortable && <SortIcon colKey={col.key} />}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-[var(--glass-border)]">
                    {selectable && <TableCell><div className="w-4 h-4 rounded bg-[hsl(var(--muted))] animate-pulse" /></TableCell>}
                    {columns.map((col, j) => (
                      <TableCell key={j}><div className="h-4 rounded bg-[hsl(var(--muted))] animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : displayData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-12">
                    {emptyIcon && <div className="flex justify-center mb-3">{emptyIcon}</div>}
                    <p className="font-semibold text-sm" style={{ fontFamily: 'Space Grotesk' }}>{emptyTitle}</p>
                    {emptyDescription && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{emptyDescription}</p>}
                  </TableCell>
                </TableRow>
              ) : displayData.map((row, rowIdx) => (
                <TableRow
                  key={row.id || rowIdx}
                  className={`border-[var(--glass-border)] hover:bg-white/5 ${onRowClick ? 'cursor-pointer' : ''} ${selected.includes(row.id || rowIdx) ? 'bg-[hsl(var(--primary))]/5' : ''} ${rowClassName ? rowClassName(row) : ''}`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {selectable && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.includes(row.id || rowIdx)} onCheckedChange={() => toggleOne(row.id || rowIdx)} />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={`${col.align === 'right' ? 'text-right' : ''} ${col.cellClassName || ''}`}
                      style={col.align === 'right' ? { fontVariantNumeric: 'tabular-nums' } : {}}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {(total > pageSize || data.length > pageSize) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total || data.length)} of {total || data.length}
            </span>
            {onPageSizeChange && (
              <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
                <SelectTrigger className="w-[70px] h-7 text-xs bg-[var(--glass-bg)] border-[var(--glass-border)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="sm"
              disabled={page === 0}
              onClick={() => onPageChange ? onPageChange(page - 1) : null}
              className="h-7 w-7 p-0 border-[var(--glass-border)]"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs px-2">{page + 1} / {totalPages}</span>
            <Button
              variant="outline" size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => onPageChange ? onPageChange(page + 1) : null}
              className="h-7 w-7 p-0 border-[var(--glass-border)]"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
