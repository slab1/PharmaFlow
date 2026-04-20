import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product, CATEGORIES, UNITS } from '../db';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import { formatCurrency, generateSKU } from '../utils/helpers';

export function Products() {
  const products = useLiveQuery(() => db.products.toArray());
  const batches = useLiveQuery(() => db.batches.toArray());
  const suppliers = useLiveQuery(() => db.suppliers.toArray());

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    sku: '',
    name: '',
    category: CATEGORIES[0],
    unit: UNITS[0],
    purchasePrice: 0,
    sellingPrice: 0,
    reorderLevel: 10,
    supplierId: 0,
  });

  const filteredProducts = products?.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setForm({
        sku: product.sku,
        name: product.name,
        category: product.category,
        unit: product.unit,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        reorderLevel: product.reorderLevel,
        supplierId: product.supplierId || 0,
      });
    } else {
      setEditingProduct(null);
      setForm({
        sku: generateSKU(),
        name: '',
        category: CATEGORIES[0],
        unit: UNITS[0],
        purchasePrice: 0,
        sellingPrice: 0,
        reorderLevel: 10,
        supplierId: 0,
      });
    }
    setShowModal(true);
  };

  const saveProduct = async () => {
    if (!form.name || !form.sku) return;

    if (editingProduct) {
      await db.products.update(editingProduct.id!, {
        ...form,
        supplierId: form.supplierId || undefined,
        updatedAt: new Date(),
      });
    } else {
      await db.products.add({
        ...form,
        supplierId: form.supplierId || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    setShowModal(false);
  };

  const deleteProduct = async (id: number) => {
    if (confirm('Delete this product?')) {
      await db.products.delete(id);
    }
  };

  const getStockLevel = (productId: number) => {
    const productBatches = batches?.filter((b) => b.productId === productId) || [];
    return productBatches.reduce((sum, b) => sum + b.remainingQty, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Products</h2>
          <p className="text-slate-500">Manage your product catalog</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">SKU</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Product</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Category</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Price</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Stock</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No products found. Add your first product!
                </td>
              </tr>
            ) : (
              filteredProducts?.map((product) => {
                const stock = getStockLevel(product.id!);
                const status =
                  stock <= product.reorderLevel
                    ? stock === 0
                      ? 'text-red-600'
                      : 'text-yellow-600'
                    : 'text-slate-600';
                return (
                  <tr key={product.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-mono">{product.sku}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-slate-400">{product.unit}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{product.category}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatCurrency(product.sellingPrice)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${status}`}>
                      {stock}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal(product)}
                          className="p-1 text-slate-400 hover:text-teal-600"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id!)}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 size={18} />
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    {UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Purchase Price (₦)
                  </label>
                  <input
                    type="number"
                    value={form.purchasePrice}
                    onChange={(e) =>
                      setForm({ ...form, purchasePrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Selling Price (₦)
                  </label>
                  <input
                    type="number"
                    value={form.sellingPrice}
                    onChange={(e) =>
                      setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    value={form.reorderLevel}
                    onChange={(e) =>
                      setForm({ ...form, reorderLevel: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                  <select
                    value={form.supplierId}
                    onChange={(e) => setForm({ ...form, supplierId: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={0}>-- Select --</option>
                    {suppliers?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={saveProduct}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                {editingProduct ? 'Update' : 'Add'} Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}