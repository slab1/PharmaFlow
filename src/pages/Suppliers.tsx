import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Supplier, type PurchaseOrder, type PurchaseOrderItem } from '../db';
import { Plus, Search, Edit2, Trash2, X, Phone, Mail, MapPin, ShoppingCart, Check, Send, Package, XCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/helpers';

interface OrderItemForm {
  productId: number;
  quantity: number;
}

export function Suppliers() {
  const suppliers = useLiveQuery(() => db.suppliers.toArray());
  const products = useLiveQuery(() => db.products.toArray());
  const orders = useLiveQuery(() => db.purchaseOrders.orderBy('createdAt').reverse().toArray());

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [viewTab, setViewTab] = useState<'suppliers' | 'orders'>('suppliers');
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemForm[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });

  const filtered = suppliers?.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
  );

  const openModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditing(supplier);
      setForm({ name: supplier.name, phone: supplier.phone, email: supplier.email, address: supplier.address });
    } else {
      setEditing(null);
      setForm({ name: '', phone: '', email: '', address: '' });
    }
    setShowModal(true);
  };

  const saveSupplier = async () => {
    if (!form.name) return;
    if (editing) {
      await db.suppliers.update(editing.id!, form);
    } else {
      await db.suppliers.add({ ...form, createdAt: new Date() });
    }
    setShowModal(false);
  };

  const deleteSupplier = async (id: number) => {
    if (confirm('Delete this supplier?')) {
      await db.suppliers.delete(id);
    }
  };

  const addToOrder = (productId: number) => {
    if (orderItems.find(i => i.productId === productId)) return;
    setOrderItems([...orderItems, { productId, quantity: 1 }]);
  };

  const updateOrderQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems(orderItems.filter(i => i.productId !== productId));
    } else {
      setOrderItems(orderItems.map(i => i.productId === productId ? { ...i, quantity } : i));
    }
  };

  const getOrderTotal = () => {
    return orderItems.reduce((sum, item) => {
      const product = products?.find(p => p.id === item.productId);
      return sum + (product?.purchasePrice || 0) * item.quantity;
    }, 0);
  };

  const createOrder = async () => {
    if (!selectedSupplier || orderItems.length === 0) return;
    const items: PurchaseOrderItem[] = orderItems.map(item => {
      const product = products?.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        productName: product?.name || '',
        quantity: item.quantity,
        unitPrice: product?.purchasePrice || 0,
      };
    });
    await db.purchaseOrders.add({
      supplierId: selectedSupplier.id!,
      supplierName: selectedSupplier.name,
      items,
      status: 'draft',
      totalAmount: getOrderTotal(),
      notes: orderNotes,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setShowOrderModal(false);
    setSelectedSupplier(null);
    setOrderItems([]);
    setOrderNotes('');
  };

  const updateOrderStatus = async (orderId: number, status: PurchaseOrder['status']) => {
    await db.purchaseOrders.update(orderId, { status, updatedAt: new Date() });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">Draft</span>;
      case 'sent': return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Sent</span>;
      case 'confirmed': return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">Confirmed</span>;
      case 'received': return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Received</span>;
      case 'cancelled': return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Cancelled</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Suppliers & Orders</h2>
          <p className="text-slate-500">Manage suppliers and purchase orders</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewTab('suppliers')}
              className={`px-3 py-1.5 text-sm rounded-md ${viewTab === 'suppliers' ? 'bg-white shadow text-teal-700' : 'text-slate-500'}`}
            >
              Suppliers
            </button>
            <button
              onClick={() => setViewTab('orders')}
              className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-1 ${viewTab === 'orders' ? 'bg-white shadow text-teal-700' : 'text-slate-500'}`}
            >
              Orders
              <span className="text-xs bg-slate-200 px-1.5 rounded-full">{orders?.length || 0}</span>
            </button>
          </div>
        </div>
      </div>

      {viewTab === 'suppliers' && (
        <>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
          >
            <Plus size={20} />
            Add Supplier
          </button>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {filtered?.length === 0 ? (
                <div className="col-span-full text-center py-8 text-slate-500">
                  No suppliers found. Add your first supplier!
                </div>
              ) : (
                filtered?.map((supplier) => (
                  <div key={supplier.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-800">{supplier.name}</h3>
                        <div className="mt-2 space-y-1 text-sm text-slate-500">
                          {supplier.phone && (
                            <div className="flex items-center gap-2">
                              <Phone size={14} />
                              <span>{supplier.phone}</span>
                            </div>
                          )}
                          {supplier.email && (
                            <div className="flex items-center gap-2">
                              <Mail size={14} />
                              <span>{supplier.email}</span>
                            </div>
                          )}
                          {supplier.address && (
                            <div className="flex items-center gap-2">
                              <MapPin size={14} />
                              <span className="line-clamp-2">{supplier.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openModal(supplier)} className="p-1 text-slate-400 hover:text-teal-600">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => deleteSupplier(supplier.id!)} className="p-1 text-slate-400 hover:text-red-600">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {viewTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">Purchase Orders</h3>
            <button
              onClick={() => setShowOrderModal(true)}
              disabled={!suppliers || suppliers.length === 0}
              className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              <ShoppingCart size={18} />
              New Order
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Order #</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Supplier</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Total</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Date</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  orders?.map((order) => (
                    <tr key={order.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-sm font-mono">PO{String(order.id).padStart(4, '0')}</td>
                      <td className="px-4 py-3 text-sm">{order.supplierName}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(order.status)}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{formatDate(order.createdAt)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {order.status === 'draft' && (
                            <button
                              onClick={() => updateOrderStatus(order.id!, 'sent')}
                              className="p-1 text-blue-600 hover:text-blue-800"
                              title="Send Order"
                            >
                              <Send size={16} />
                            </button>
                          )}
                          {order.status === 'sent' && (
                            <button
                              onClick={() => updateOrderStatus(order.id!, 'confirmed')}
                              className="p-1 text-yellow-600 hover:text-yellow-800"
                              title="Mark Confirmed"
                            >
                              <Check size={16} />
                            </button>
                          )}
                          {order.status === 'confirmed' && (
                            <button
                              onClick={() => updateOrderStatus(order.id!, 'received')}
                              className="p-1 text-green-600 hover:text-green-800"
                              title="Mark Received"
                            >
                              <Package size={16} />
                            </button>
                          )}
                          {(order.status === 'draft' || order.status === 'sent') && (
                            <button
                              onClick={() => updateOrderStatus(order.id!, 'cancelled')}
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Cancel"
                            >
                              <XCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold">{editing ? 'Edit' : 'Add'} Supplier</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-slate-200">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">
                Cancel
              </button>
              <button onClick={saveSupplier} className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                {editing ? 'Update' : 'Add'} Supplier
              </button>
            </div>
          </div>
        </div>
      )}

      {showOrderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">New Purchase Order</h3>
              <button onClick={() => { setShowOrderModal(false); setSelectedSupplier(null); setOrderItems([]); }} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {!selectedSupplier ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Supplier</label>
                  <div className="grid grid-cols-1 gap-2">
                    {suppliers?.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSupplier(s)}
                        className="text-left p-3 border border-slate-200 rounded-lg hover:border-teal-500 hover:bg-teal-50"
                      >
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-slate-500">{s.phone}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-teal-50 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-medium">{selectedSupplier.name}</div>
                      <button onClick={() => setSelectedSupplier(null)} className="text-xs text-teal-600">Change</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Add Products</label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) addToOrder(parseInt(e.target.value));
                        e.target.value = '';
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="">-- Select Product --</option>
                      {products?.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.purchasePrice)}</option>
                      ))}
                    </select>
                  </div>

                  {orderItems.length > 0 && (
                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                      {orderItems.map((item) => {
                        const product = products?.find(p => p.id === item.productId);
                        return (
                          <div key={item.productId} className="p-3 flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{product?.name}</div>
                              <div className="text-xs text-slate-500">{formatCurrency(product?.purchasePrice || 0)} each</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateOrderQuantity(item.productId, item.quantity - 1)}
                                className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded"
                              >
                                -
                              </button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateOrderQuantity(item.productId, item.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <textarea
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Optional notes..."
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>{formatCurrency(getOrderTotal())}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 p-4 border-t border-slate-200 sticky bottom-0 bg-white">
              <button
                onClick={() => { setShowOrderModal(false); setSelectedSupplier(null); setOrderItems([]); }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={createOrder}
                disabled={!selectedSupplier || orderItems.length === 0}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}