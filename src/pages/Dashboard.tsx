import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Package, AlertTriangle, TrendingUp, DollarSign, CheckCircle } from 'lucide-react';
import { formatCurrency, getExpiryStatus } from '../utils/helpers';

export function Dashboard() {
  const products = useLiveQuery(() => db.products.toArray());
  const sales = useLiveQuery(() => db.sales.toArray());
  const batches = useLiveQuery(() => db.batches.toArray());
  const suppliers = useLiveQuery(() => db.suppliers.toArray());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySales = useLiveQuery(
    () => db.sales.where('dateTime').above(today).toArray(),
    [today]
  );

  const totalRevenue = todaySales?.reduce((sum, s) => sum + s.total, 0) || 0;
  const todayTransactions = todaySales?.length || 0;

  const lowStockProducts = products?.filter((p) => {
    const inv = batches?.filter((b) => b.productId === p.id && b.remainingQty > 0);
    const totalStock = inv?.reduce((sum, b) => sum + b.remainingQty, 0) || 0;
    return totalStock <= p.reorderLevel;
  });

  const expiringBatches = batches?.filter((b) => {
    const status = getExpiryStatus(b.expiryDate);
    return status === 'critical' || status === 'expired';
  });

  const expiringCount = expiringBatches?.length || 0;
  const lowStockCount = lowStockProducts?.length || 0;

  const stats = [
    {
      label: 'Products',
      value: products?.length || 0,
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      label: 'Today',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: 'bg-green-500',
      sub: `${todayTransactions} sales`,
    },
    {
      label: 'Low Stock',
      value: lowStockCount,
      icon: TrendingUp,
      color: lowStockCount > 0 ? 'bg-yellow-500' : 'bg-slate-400',
    },
    {
      label: 'Expiring',
      value: expiringCount,
      icon: AlertTriangle,
      color: expiringCount > 0 ? 'bg-red-500' : 'bg-slate-400',
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-slate-500 text-sm">Overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className={`${color} p-2 md:p-3 rounded-lg`}>
                <Icon className="text-white w-4 h-4 md:w-6 md:h-6" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-slate-500">{label}</p>
                <p className="text-lg md:text-2xl font-bold text-slate-800">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 md:p-4">
          <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Expiring
          </h3>
          {expiringCount === 0 ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={18} />
              <span className="text-sm">All good</span>
            </div>
          ) : (
            <div className="space-y-2">
              {expiringBatches?.slice(0, 4).map((batch) => {
                const product = products?.find((p) => p.id === batch.productId);
                return (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between p-2 bg-red-50 rounded text-sm"
                  >
                    <div className="truncate">
                      <span className="font-medium text-sm">{product?.name}</span>
                    </div>
                    <span className="text-red-600 font-medium text-sm ml-2">
                      {batch.remainingQty}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 md:p-4">
          <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-yellow-500" />
            Low Stock
          </h3>
          {lowStockCount === 0 ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={18} />
              <span className="text-sm">Stock healthy</span>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockProducts?.slice(0, 4).map((product) => {
                const batchList = batches?.filter((b) => b.productId === product.id);
                const totalStock = batchList?.reduce((sum, b) => sum + b.remainingQty, 0) || 0;
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-2 bg-yellow-50 rounded text-sm"
                  >
                    <span className="font-medium text-sm truncate">{product.name}</span>
                    <span className="text-yellow-700 font-medium text-sm ml-2">
                      {totalStock}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 md:p-4">
        <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-3">Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-sm">
          <div>
            <p className="text-slate-500">Products</p>
            <p className="text-xl font-bold">{products?.length || 0}</p>
          </div>
          <div>
            <p className="text-slate-500">Batches</p>
            <p className="text-xl font-bold">{batches?.length || 0}</p>
          </div>
          <div>
            <p className="text-slate-500">Suppliers</p>
            <p className="text-xl font-bold">{suppliers?.length || 0}</p>
          </div>
          <div>
            <p className="text-slate-500">Sales</p>
            <p className="text-xl font-bold">{sales?.length || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}