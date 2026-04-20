import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SaleItem, PAYMENT_METHODS } from '../db';
import { Search, Plus, Minus, Trash2, ShoppingCart, DollarSign } from 'lucide-react';
import { formatCurrency, getExpiryStatus } from '../utils/helpers';
import { format } from 'date-fns';

interface CartItem extends SaleItem {
  productId: number;
  expiryStatus?: 'expired' | 'critical' | 'warning' | 'ok';
}

export function Sales() {
  const products = useLiveQuery(() => db.products.toArray());
  const batches = useLiveQuery(() => db.batches.toArray());
  const sales = useLiveQuery(() => db.sales.orderBy('dateTime').reverse().toArray());

  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);

  const filteredProducts = useMemo(() => {
    if (!search || !products) return products || [];
    const term = search.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
    );
  }, [products, search]);

  const getAvailableBatches = (productId: number) => {
    return batches?.filter((b) => b.productId === productId && b.remainingQty > 0) || [];
  };

  const addToCart = (productId: number) => {
    const product = products?.find((p) => p.id === productId);
    if (!product) return;

    const availableBatches = getAvailableBatches(productId);
    if (availableBatches.length === 0) return;

    const existingItem = cart.find((item) => item.productId === productId);
    const batch = availableBatches[0];

    if (existingItem) {
      if (existingItem.quantity >= batch.remainingQty) return;
      setCart(
        cart.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      const status = getExpiryStatus(batch.expiryDate);
      setCart([
        ...cart,
        {
          productId: product.id!,
          productName: product.name,
          quantity: 1,
          unitPrice: product.sellingPrice,
          batchId: batch.id!,
          expiryStatus: status,
        },
      ]);
    }
    setSearch('');
  };

  const updateQuantity = (productId: number, delta: number) => {
    const item = cart.find((i) => i.productId === productId);
    if (!item) return;

    const availableBatches = getAvailableBatches(productId);
    const maxQty = availableBatches.reduce((sum, b) => sum + b.remainingQty, 0);

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      setCart(cart.filter((i) => i.productId !== productId));
    } else if (newQty <= maxQty) {
      setCart(
        cart.map((i) =>
          i.productId === productId ? { ...i, quantity: newQty } : i
        )
      );
    }
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((i) => i.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const completeSale = async () => {
    if (cart.length === 0) return;

    const sale: Omit<import('../db').Sale, 'id'> = {
      dateTime: new Date(),
      items: cart.map(({ productId, productName, quantity, unitPrice, batchId }) => ({
        productId,
        productName,
        quantity,
        unitPrice,
        batchId,
      })),
      total: cartTotal,
      paymentMethod,
      synced: true,
    };

    const saleId = await db.sales.add(sale as import('../db').Sale);

    for (const item of cart) {
      let remainingQty = item.quantity;
      const itemBatches = batches
        ?.filter((b) => b.productId === item.productId && b.remainingQty > 0)
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

      if (itemBatches) {
        for (const batch of itemBatches) {
          if (remainingQty <= 0) break;
          const deduct = Math.min(remainingQty, batch.remainingQty);
          await db.batches.update(batch.id!, {
            remainingQty: batch.remainingQty - deduct,
          });
          remainingQty -= deduct;
        }
      }
    }

    setLastSale({ ...sale, id: saleId });
    setShowReceipt(true);
    setCart([]);
    setPaymentMethod(PAYMENT_METHODS[0]);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'expired':
      case 'critical':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-slate-600';
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-800">Point of Sale</h2>
        <p className="text-slate-500 text-sm md:text-base">Process sales</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-3 md:space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 md:p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={isMobile ? 18 : 20} />
              <input
                type="text"
                placeholder="Search product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && filteredProducts[0] && addToCart(filteredProducts[0].id!)}
                className="w-full pl-10 pr-4 py-2.5 md:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-base"
                autoComplete="off"
              />
            </div>

            {search && filteredProducts && filteredProducts.length > 0 && (
              <div className="mt-2 border border-slate-200 rounded-lg max-h-48 md:max-h-60 overflow-y-auto">
                {filteredProducts.slice(0, 6).map((product) => {
                  const availableBatches = getAvailableBatches(product.id!);
                  const hasStock = availableBatches.length > 0;
                  return (
                    <button
                      key={product.id}
                      onClick={() => hasStock && addToCart(product.id!)}
                      disabled={!hasStock}
                      className={`w-full text-left px-3 py-2.5 md:py-2 hover:bg-slate-50 flex items-center justify-between touch-manipulation ${
                        !hasStock ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-medium text-sm">{product.name}</span>
                        <span className="text-slate-400 ml-2 text-xs">{product.unit}</span>
                      </div>
                      <span className="text-sm font-medium">
                        {hasStock
                          ? formatCurrency(product.sellingPrice)
                          : 'Out'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-2.5 md:p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <ShoppingCart size={18} className="text-teal-600" />
              <span className="font-medium text-sm">Cart ({cart.length})</span>
            </div>

            {cart.length === 0 ? (
              <div className="p-6 md:p-8 text-center text-slate-400">
                <ShoppingCart size={isMobile ? 36 : 48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Search products</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-64 md:max-h-96 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.productId} className="p-2.5 md:p-3 flex items-center gap-2 md:gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.productName}</div>
                      <div className={`text-xs ${getStatusColor(item.expiryStatus)}`}>
                        {item.expiryStatus !== 'ok' && `⚠ ${item.expiryStatus}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2">
                      <button
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-lg active:bg-slate-200 touch-manipulation"
                      >
                        <Minus size={18} />
                      </button>
                      <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-lg active:bg-slate-200 touch-manipulation"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    <div className="w-20 md:w-24 text-right font-medium text-sm">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-600 active:text-red-600 touch-manipulation"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 md:space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 md:p-4 sticky top-20 md:static">
            <div className="text-sm text-slate-500 mb-1">Total</div>
            <div className="text-2xl md:text-3xl font-bold text-slate-800">
              {formatCurrency(cartTotal)}
            </div>

            <div className="mt-3 md:mt-4">
              <label className="block text-sm text-slate-500 mb-1">Payment</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-base"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={completeSale}
              disabled={cart.length === 0}
              className="w-full mt-3 md:mt-4 py-3 md:py-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 active:bg-teal-800 touch-manipulation"
            >
              <DollarSign size={isMobile ? 18 : 20} />
              <span className="text-base md:text-lg">Complete Sale</span>
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 md:p-4">
            <h3 className="font-medium text-sm mb-2 md:mb-3">Recent</h3>
            <div className="space-y-2">
              {sales?.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    {format(s.dateTime, 'HH:mm')}
                  </span>
                  <span className="font-medium">{formatCurrency(s.total)}</span>
                </div>
              ))}
              {(!sales || sales.length === 0) && (
                <p className="text-slate-400 text-sm">No sales</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 animate-slide-up md:animate-none">
          <div className="bg-white rounded-t-xl md:rounded-lg shadow-xl w-full md:max-w-sm mx-4">
            <div className="p-4 md:p-6 text-center border-b border-slate-200">
              <h3 className="text-lg font-bold">Pharmacy</h3>
              <p className="text-sm text-slate-500">Sale Receipt</p>
              <p className="text-xs text-slate-400 mt-1">
                {format(lastSale.dateTime, 'MMM dd, yyyy HH:mm')}
              </p>
            </div>

            <div className="p-4 space-y-2">
              {lastSale.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.productName}
                  </span>
                  <span>{formatCurrency(item.quantity * item.unitPrice)}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(lastSale.total)}</span>
              </div>
              <div className="text-sm text-slate-500 text-center">
                {lastSale.paymentMethod}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200">
              <button
                onClick={() => setShowReceipt(false)}
                className="w-full py-3 bg-teal-600 text-white rounded-lg active:bg-teal-700 touch-manipulation"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}