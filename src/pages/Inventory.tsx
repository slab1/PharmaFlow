import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, CATEGORIES, STOCK_MOVEMENT_REASONS } from '../db';
import { Plus, Search, Trash2, X, Edit2, ArrowUpDown, History } from 'lucide-react';
import { formatDate, getExpiryStatus, formatDateTime } from '../utils/helpers';

interface BatchForm {
  productId: number;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  purchaseDate: string;
  cost: number;
}

interface AdjustmentForm {
  batchId: number;
  type: 'increase' | 'decrease';
  quantity: number;
  reason: string;
}

export function Inventory() {
  const products = useLiveQuery(() => db.products.toArray());
  const batches = useLiveQuery(() => db.batches.toArray());
  const movements = useLiveQuery(() => db.stockMovements.orderBy('createdAt').reverse().toArray());

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [showAdjustStock, setShowAdjustStock] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any>(null);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [form, setForm] = useState<BatchForm>({
    productId: 0,
    batchNumber: '',
    quantity: 0,
    expiryDate: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    cost: 0,
  });
  const [adjustment, setAdjustment] = useState<AdjustmentForm>({
    batchId: 0,
    type: 'increase',
    quantity: 1,
    reason: 'Stock Take',
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'expired':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Expired</span>;
      case 'critical':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Critical</span>;
      case 'warning':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">Warning</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">OK</span>;
    }
  };

  const saveBatch = async () => {
    if (!form.productId || !form.batchNumber || !form.expiryDate) return;
    await db.batches.add({
      productId: form.productId,
      batchNumber: form.batchNumber,
      quantity: form.quantity,
      expiryDate: new Date(form.expiryDate),
      purchaseDate: new Date(form.purchaseDate),
      cost: form.cost,
      remainingQty: form.quantity,
    });
    setShowAddBatch(false);
    setForm({
      productId: 0,
      batchNumber: '',
      quantity: 0,
      expiryDate: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      cost: 0,
    });
  };

  const deleteBatch = async (id: number) => {
    if (confirm('Delete this batch?')) {
      await db.batches.delete(id);
    }
  };

  const updateBatch = async () => {
    if (!editingBatch) return;
    await db.batches.update(editingBatch.id, {
      batchNumber: editingBatch.batchNumber,
      expiryDate: new Date(editingBatch.expiryDate),
      cost: editingBatch.cost,
    });
    setEditingBatch(null);
  };

  const saveAdjustment = async () => {
    if (!adjustment.batchId || adjustment.quantity <= 0) return;
    const batch = batches?.find(b => b.id === adjustment.batchId);
    if (!batch) return;
    const newQty = adjustment.type === 'increase'
      ? batch.remainingQty + adjustment.quantity
      : batch.remainingQty - adjustment.quantity;
    if (newQty < 0) {
      alert('Cannot reduce below 0');
      return;
    }
    await db.batches.update(adjustment.batchId, { remainingQty: newQty });
    await db.stockMovements.add({
      productId: batch.productId,
      batchId: adjustment.batchId,
      type: 'adjustment',
      quantity: newQty,
      change: adjustment.type === 'increase' ? adjustment.quantity : -adjustment.quantity,
      reason: adjustment.reason,
      createdAt: new Date(),
    });
    setShowAdjustStock(false);
    setAdjustment({ batchId: 0, type: 'increase', quantity: 1, reason: 'Stock Take' });
  };

  const openAdjustment = (batch: any) => {
    setSelectedBatch(batch);
    setAdjustment({ batchId: batch.id, type: 'increase', quantity: 1, reason: 'Stock Take' });
    setShowAdjustStock(true);
  };

  const filteredBatches = batches?.filter(b => {
    const product = products?.find(p => p.id === b.productId);
    if (!product) return false;
    if (search && !product.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter && product.category !== categoryFilter) return false;
    if (statusFilter) {
      const status = getExpiryStatus(b.expiryDate);
      if (statusFilter === 'ok' && status !== 'ok') return false;
      if (statusFilter === 'warning' && status !== 'warning') return false;
      if (statusFilter === 'critical' && status !== 'critical') return false;
      if (statusFilter === 'expired' && status !== 'expired') return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inventory</h2>
          <p className="text-slate-500">Track stock and manage batches</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              showHistory ? 'bg-teal-50 border-teal-300 text-teal-700' : 'border-slate-300 text-slate-600'
            }`}
          >
            <History size={18} />
            <span className="hidden sm:inline">History</span>
          </button>
          <button
            onClick={() => setShowAddBatch(true)}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Batch</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg"
        >
          <option value="">All Status</option>
          <option value="ok">OK</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Product</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Batch</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Qty</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Expiry</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Status</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBatches?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No batches found.
                </td>
              </tr>
            ) : (
              filteredBatches?.map((batch) => {
                const product = products?.find((p) => p.id === batch.productId);
                if (!product) return null;
                const status = getExpiryStatus(batch.expiryDate);
                return (
                  <tr key={batch.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-slate-400">{product.unit}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">{batch.batchNumber}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {batch.remainingQty} / {batch.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDate(batch.expiryDate)}</td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(status)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openAdjustment(batch)}
                          className="p-1 text-slate-400 hover:text-teal-600"
                          title="Adjust Stock"
                        >
                          <ArrowUpDown size={16} />
                        </button>
                        <button
                          onClick={() => setEditingBatch(batch)}
                          className="p-1 text-slate-400 hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteBatch(batch.id!)}
                          className="p-1 text-slate-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showHistory && movements && movements.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mt-4">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">Stock Movement History</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Date</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Product</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Type</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">Change</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Reason</th>
                </tr>
              </thead>
              <tbody>
                {movements.slice(0, 20).map((m) => {
                  const product = products?.find(p => p.id === m.productId);
                  const isIncrease = m.change > 0;
                  return (
                    <tr key={m.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 text-xs text-slate-500">{formatDateTime(m.createdAt)}</td>
                      <td className="px-4 py-2 text-sm">{product?.name}</td>
                      <td className="px-4 py-2 text-sm capitalize">{m.type}</td>
                      <td className={`px-4 py-2 text-sm font-medium text-right ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                        {isIncrease ? '+' : ''}{m.change}
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-500">{m.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold">Add Batch</h3>
              <button onClick={() => setShowAddBatch(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
                <select
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value={0}>-- Select Product --</option>
                  {products?.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={form.batchNumber}
                    onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cost (NGN)</label>
                <input
                  type="number"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => setShowAddBatch(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={saveBatch}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Add Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {editingBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold">Edit Batch</h3>
              <button onClick={() => setEditingBatch(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Batch Number</label>
                <input
                  type="text"
                  value={editingBatch.batchNumber}
                  onChange={(e) => setEditingBatch({ ...editingBatch, batchNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={new Date(editingBatch.expiryDate).toISOString().split('T')[0]}
                  onChange={(e) => setEditingBatch({ ...editingBatch, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cost (NGN)</label>
                <input
                  type="number"
                  value={editingBatch.cost}
                  onChange={(e) => setEditingBatch({ ...editingBatch, cost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => setEditingBatch(null)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={updateBatch}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdjustStock && selectedBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold">Adjust Stock</h3>
              <button onClick={() => setShowAdjustStock(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm font-medium">{products?.find(p => p.id === selectedBatch.productId)?.name}</p>
                <p className="text-xs text-slate-500">Current: {selectedBatch.remainingQty}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={adjustment.type}
                    onChange={(e) => setAdjustment({ ...adjustment, type: e.target.value as 'increase' | 'decrease' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="increase">Increase (+)</option>
                    <option value="decrease">Decrease (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={adjustment.quantity}
                    onChange={(e) => setAdjustment({ ...adjustment, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <select
                  value={adjustment.reason}
                  onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {STOCK_MOVEMENT_REASONS.adjustment.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => setShowAdjustStock(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={saveAdjustment}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}