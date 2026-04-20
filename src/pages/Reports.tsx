import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Download, Calendar, TrendingUp, Package, AlertTriangle, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate, getExpiryStatus } from '../utils/helpers';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

type ReportType = 'sales' | 'inventory' | 'expiry' | 'lowstock' | 'profit';

export function Reports() {
  const products = useLiveQuery(() => db.products.toArray());
  const batches = useLiveQuery(() => db.batches.toArray());
  const sales = useLiveQuery(() => db.sales.toArray());

  const [reportType, setReportType] = useState<ReportType>('sales');
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    const from = startOfDay(new Date(dateFrom));
    const to = endOfDay(new Date(dateTo));
    return sales.filter(s => isWithinInterval(s.dateTime, { start: from, end: to }));
  }, [sales, dateFrom, dateTo]);

  const salesReport = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const transactionCount = filteredSales.length;
    const avgTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0;

    const byPayment: Record<string, number> = {};
    filteredSales.forEach(s => {
      byPayment[s.paymentMethod] = (byPayment[s.paymentMethod] || 0) + s.total;
    });

    return { totalRevenue, transactionCount, avgTransaction, byPayment };
  }, [filteredSales]);

  const inventoryReport = useMemo(() => {
    if (!products || !batches) return [];
    return products.map(product => {
      const productBatches = batches.filter(b => b.productId === product.id);
      const totalQty = productBatches.reduce((sum, b) => sum + b.remainingQty, 0);
      const totalCost = productBatches.reduce((sum, b) => sum + (b.remainingQty * (b.cost / b.quantity)), 0);
      const totalValue = totalQty * product.sellingPrice;
      return {
        ...product,
        totalQty,
        totalCost,
        totalValue,
      };
    }).filter(p => p.totalQty > 0).sort((a, b) => b.totalValue - a.totalValue);
  }, [products, batches]);

  const expiryReport = useMemo(() => {
    if (!batches || !products) return [];
    return batches
      .filter(b => {
        const status = getExpiryStatus(b.expiryDate);
        return status === 'expired' || status === 'critical' || status === 'warning';
      })
      .map(b => {
        const product = products.find(p => p.id === b.productId);
        const status = getExpiryStatus(b.expiryDate);
        return {
          ...b,
          productName: product?.name,
          productUnit: product?.unit,
          status,
        };
      })
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [batches, products]);

  const lowStockReport = useMemo(() => {
    if (!products || !batches) return [];
    return products
      .map(product => {
        const productBatches = batches.filter(b => b.productId === product.id);
        const totalQty = productBatches.reduce((sum, b) => sum + b.remainingQty, 0);
        return { ...product, totalQty };
      })
      .filter(p => p.totalQty <= p.reorderLevel)
      .sort((a, b) => a.totalQty - b.totalQty);
  }, [products, batches]);

  const profitReport = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);

    let totalCost = 0;
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const batch = batches?.find(b => b.id === item.batchId);
        if (batch) {
          const itemCost = (batch.cost / batch.quantity) * item.quantity;
          totalCost += itemCost;
        }
      });
    });

    return {
      revenue: totalRevenue,
      cost: totalCost,
      profit: totalRevenue - totalCost,
      margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
    };
  }, [filteredSales, batches]);

  const totalInventoryValue = inventoryReport.reduce((sum, p) => sum + p.totalValue, 0);

  const renderReport = () => {
    switch (reportType) {
      case 'sales':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(salesReport.totalRevenue)}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600">Transactions</p>
                <p className="text-2xl font-bold text-blue-700">{salesReport.transactionCount}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600">Avg Transaction</p>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(salesReport.avgTransaction)}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">Period</p>
                <p className="text-lg font-bold text-slate-700">
                  {dateFrom} to {dateTo}
                </p>
              </div>
            </div>

            {Object.keys(salesReport.byPayment).length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h4 className="font-medium mb-3">By Payment Method</h4>
                <div className="space-y-2">
                  {Object.entries(salesReport.byPayment).map(([method, amount]) => (
                    <div key={method} className="flex justify-between">
                      <span className="text-slate-600">{method}</span>
                      <span className="font-medium">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="p-3 border-b border-slate-200 bg-slate-50 font-medium">
                Transaction Details
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-500">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Items</th>
                    <th className="px-4 py-2">Payment</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        No sales in selected period
                      </td>
                    </tr>
                  ) : (
                    filteredSales.slice(0, 20).map(sale => (
                      <tr key={sale.id} className="border-t border-slate-100">
                        <td className="px-4 py-2 text-sm">{format(sale.dateTime, 'MMM dd, HH:mm')}</td>
                        <td className="px-4 py-2 text-sm">{sale.items.length} items</td>
                        <td className="px-4 py-2 text-sm">{sale.paymentMethod}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(sale.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'inventory':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-teal-50 p-4 rounded-lg">
                <p className="text-sm text-teal-600">Total Products</p>
                <p className="text-2xl font-bold text-teal-700">{inventoryReport.length}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600">Total Batches</p>
                <p className="text-2xl font-bold text-blue-700">{batches?.length || 0}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600">Inventory Value</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(totalInventoryValue)}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-500 bg-slate-50">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Cost</th>
                    <th className="px-4 py-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryReport.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No inventory data
                      </td>
                    </tr>
                  ) : (
                    inventoryReport.map(item => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="px-4 py-2">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-slate-400">{item.sku}</div>
                        </td>
                        <td className="px-4 py-2 text-sm">{item.category}</td>
                        <td className="px-4 py-2 text-sm text-right">{item.totalQty} {item.unit}</td>
                        <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.totalCost)}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(item.totalValue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-medium">
                    <td colSpan={4} className="px-4 py-3 text-right">Total Value</td>
                    <td className="px-4 py-3 text-right text-teal-700">{formatCurrency(totalInventoryValue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );

      case 'expiry':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-red-500" size={20} />
              <span className="text-red-600 font-medium">{expiryReport.length} batches expiring soon</span>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-500 bg-slate-50">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3">Expiry</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expiryReport.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No expiring batches
                      </td>
                    </tr>
                  ) : (
                    expiryReport.map(batch => (
                      <tr key={batch.id} className="border-t border-slate-100">
                        <td className="px-4 py-2 font-medium">{batch.productName}</td>
                        <td className="px-4 py-2 text-sm font-mono">{batch.batchNumber}</td>
                        <td className="px-4 py-2 text-sm text-right">{batch.remainingQty}</td>
                        <td className="px-4 py-2 text-sm">{formatDate(batch.expiryDate)}</td>
                        <td className="px-4 py-2">
                          {batch.status === 'expired' && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Expired</span>
                          )}
                          {batch.status === 'critical' && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Critical</span>
                          )}
                          {batch.status === 'warning' && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">Warning</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'lowstock':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-yellow-500" size={20} />
              <span className="text-yellow-600 font-medium">{lowStockReport.length} products below reorder level</span>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-500 bg-slate-50">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Reorder Level</th>
                    <th className="px-4 py-3 text-right">Current Stock</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockReport.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-green-600">
                        All stock levels are healthy
                      </td>
                    </tr>
                  ) : (
                    lowStockReport.map(item => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="px-4 py-2 font-medium">{item.name}</td>
                        <td className="px-4 py-2 text-sm">{item.category}</td>
                        <td className="px-4 py-2 text-sm text-right">{item.reorderLevel}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">{item.totalQty}</td>
                        <td className="px-4 py-2">
                          {item.totalQty === 0 ? (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Out of Stock</span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">Low Stock</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'profit':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600">Revenue</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(profitReport.revenue)}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-600">Cost</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(profitReport.cost)}</p>
              </div>
              <div className="bg-teal-50 p-4 rounded-lg">
                <p className="text-sm text-teal-600">Profit</p>
                <p className="text-2xl font-bold text-teal-700">{formatCurrency(profitReport.profit)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600">Margin</p>
                <p className="text-2xl font-bold text-purple-700">{profitReport.margin.toFixed(1)}%</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h4 className="font-medium mb-3">Profit Calculation</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Gross Revenue</span>
                  <span className="font-medium">{formatCurrency(profitReport.revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Cost of Goods Sold</span>
                  <span className="font-medium text-red-600">-{formatCurrency(profitReport.cost)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold">
                  <span>Net Profit</span>
                  <span className={profitReport.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(profitReport.profit)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  const downloadCSV = () => {
    let csvContent = '';
    let filename = '';

    switch (reportType) {
      case 'sales':
        csvContent = 'Date,Items,Payment,Total\n' +
          filteredSales.map(s => `${format(s.dateTime, 'yyyy-MM-dd HH:mm')},${s.items.length},${s.paymentMethod},${s.total}`).join('\n');
        filename = 'sales-report.csv';
        break;
      case 'inventory':
        csvContent = 'Product,Category,Qty,Cost,Value\n' +
          inventoryReport.map(p => `${p.name},${p.category},${p.totalQty},${p.totalCost},${p.totalValue}`).join('\n');
        filename = 'inventory-report.csv';
        break;
      case 'expiry':
        csvContent = 'Product,Batch,Qty,Expiry,Status\n' +
          expiryReport.map(b => `${b.productName},${b.batchNumber},${b.remainingQty},${formatDate(b.expiryDate)},${b.status}`).join('\n');
        filename = 'expiry-report.csv';
        break;
      case 'lowstock':
        csvContent = 'Product,Category,Reorder Level,Current Stock\n' +
          lowStockReport.map(p => `${p.name},${p.category},${p.reorderLevel},${p.totalQty}`).join('\n');
        filename = 'lowstock-report.csv';
        break;
      case 'profit':
        csvContent = `Metric,Value\nRevenue,${profitReport.revenue}\nCost,${profitReport.cost}\nProfit,${profitReport.profit}\nMargin,${profitReport.margin}%`;
        filename = 'profit-report.csv';
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reports</h2>
          <p className="text-slate-500">Business analytics and insights</p>
        </div>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <Download size={20} />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { id: 'sales', label: 'Sales', icon: DollarSign },
          { id: 'profit', label: 'Profit', icon: TrendingUp },
          { id: 'inventory', label: 'Inventory', icon: Package },
          { id: 'expiry', label: 'Expiry', icon: AlertTriangle },
          { id: 'lowstock', label: 'Low Stock', icon: Package },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setReportType(item.id as ReportType)}
            className={`p-3 rounded-lg text-center transition-colors ${
              reportType === item.id
                ? 'bg-teal-600 text-white'
                : 'bg-white border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <item.icon size={20} className="mx-auto mb-1" />
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </div>

      {(reportType === 'sales' || reportType === 'profit') && (
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
      )}

      {renderReport()}
    </div>
  );
}