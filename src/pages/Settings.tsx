import { useState, useEffect } from 'react';
import { db } from '../db';
import { Save, Download, Upload, Trash2, Info } from 'lucide-react';

export function Settings() {
  const [shopName, setShopName] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [expiryWarningDays, setExpiryWarningDays] = useState(30);
  const [lowStockWarning, setLowStockWarning] = useState(10);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      const s = await db.settings.get('shopName');
      if (s) setShopName(s.value);
      const c = await db.settings.get('currency');
      if (c) setCurrency(c.value);
      const e = await db.settings.get('expiryWarningDays');
      if (e) setExpiryWarningDays(parseInt(e.value));
      const l = await db.settings.get('lowStockWarning');
      if (l) setLowStockWarning(parseInt(l.value));
    };
    loadSettings();
  }, []);

  const saveSettings = async () => {
    await db.settings.put({ key: 'shopName', value: shopName });
    await db.settings.put({ key: 'currency', value: currency });
    await db.settings.put({ key: 'expiryWarningDays', value: expiryWarningDays.toString() });
    await db.settings.put({ key: 'lowStockWarning', value: lowStockWarning.toString() });
    setMessage('Settings saved!');
    setTimeout(() => setMessage(''), 3000);
  };

  const exportData = async () => {
    const data = {
      products: await db.products.toArray(),
      batches: await db.batches.toArray(),
      sales: await db.sales.toArray(),
      suppliers: await db.suppliers.toArray(),
      settings: await db.settings.toArray(),
      stockMovements: await db.stockMovements.toArray(),
      purchaseOrders: await db.purchaseOrders.toArray(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmaflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.products && Array.isArray(data.products)) {
        await db.products.clear();
        await db.products.bulkAdd(data.products);
      }
      if (data.batches && Array.isArray(data.batches)) {
        await db.batches.clear();
        await db.batches.bulkAdd(data.batches);
      }
      if (data.sales && Array.isArray(data.sales)) {
        await db.sales.clear();
        await db.sales.bulkAdd(data.sales);
      }
      if (data.suppliers && Array.isArray(data.suppliers)) {
        await db.suppliers.clear();
        await db.suppliers.bulkAdd(data.suppliers);
      }
      if (data.settings && Array.isArray(data.settings)) {
        await db.settings.clear();
        await db.settings.bulkAdd(data.settings);
      }
      if (data.stockMovements && Array.isArray(data.stockMovements)) {
        await db.stockMovements.clear();
        await db.stockMovements.bulkAdd(data.stockMovements);
      }
      if (data.purchaseOrders && Array.isArray(data.purchaseOrders)) {
        await db.purchaseOrders.clear();
        await db.purchaseOrders.bulkAdd(data.purchaseOrders);
      }

      setMessage('Data imported successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error importing data. Check file format.');
      setTimeout(() => setMessage(''), 3000);
    }
    e.target.value = '';
  };

  const clearAllData = async () => {
    if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
      if (confirm('This will delete all products, sales, and inventory. Continue?')) {
        await db.products.clear();
        await db.batches.clear();
        await db.sales.clear();
        await db.suppliers.clear();
        await db.stockMovements.clear();
        await db.purchaseOrders.clear();
        setMessage('All data cleared!');
        setTimeout(() => setMessage(''), 3000);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
        <p className="text-slate-500">Configure your pharmacy</p>
      </div>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800 mb-4">Shop Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Shop Name</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="My Pharmacy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="NGN">Nigerian Naira (₦)</option>
                <option value="USD">US Dollar ($)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800 mb-4">Alert Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Expiry Warning (days)
              </label>
              <input
                type="number"
                value={expiryWarningDays}
                onChange={(e) => setExpiryWarningDays(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Low Stock Threshold
              </label>
              <input
                type="number"
                value={lowStockWarning}
                onChange={(e) => setLowStockWarning(parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800 mb-4">Data Management</h3>
          <div className="space-y-4">
            <button
              onClick={saveSettings}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              <Save size={20} />
              Save Settings
            </button>

            <button
              onClick={exportData}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <Download size={20} />
              Export Data (JSON)
            </button>

            <label className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
              <Upload size={20} />
              Import Data
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800 mb-4">Danger Zone</h3>
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info size={20} className="text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">Clear All Data</p>
                  <p>This will permanently delete all products, sales, batches, and suppliers.</p>
                </div>
              </div>
            </div>
            <button
              onClick={clearAllData}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 size={20} />
              Clear All Data
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-800 mb-4">About</h3>
        <div className="text-sm text-slate-500">
          <p className="font-medium text-slate-700">PharmaFlow - Pharmacy Management</p>
          <p>Version 1.0.0</p>
          <p className="mt-2">Offline-first pharmacy management system designed for small-town pharmacies in Nigeria.</p>
        </div>
      </div>
    </div>
  );
}