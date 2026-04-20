import Dexie, { type Table } from 'dexie';

export interface Product {
  id?: number;
  sku: string;
  name: string;
  category: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  reorderLevel: number;
  supplierId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Batch {
  id?: number;
  productId: number;
  batchNumber: string;
  quantity: number;
  expiryDate: Date;
  purchaseDate: Date;
  cost: number;
  remainingQty: number;
}

export interface Inventory {
  id?: number;
  productId: number;
  totalQuantity: number;
  location: string;
}

export interface SaleItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  batchId: number;
}

export interface Sale {
  id?: number;
  dateTime: Date;
  items: SaleItem[];
  total: number;
  paymentMethod: string;
  synced: boolean;
}

export interface Supplier {
  id?: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: Date;
}

export interface Settings {
  id?: number;
  key: string;
  value: string;
}

export interface StockMovement {
  id?: number;
  productId: number;
  batchId?: number;
  type: 'adjustment' | 'sale' | 'expired' | 'discarded';
  quantity: number;
  change: number;
  reason: string;
  createdAt: Date;
}

export const STOCK_MOVEMENT_REASONS = {
  adjustment: ['Stock Take', 'Correction', 'Received', 'Other'],
  expired: ['Expired', 'Near Expiry', 'Other'],
  discarded: ['Damaged', 'Returns', 'Quality Issue', 'Other'],
};

export interface PurchaseOrderItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id?: number;
  supplierId: number;
  supplierName: string;
  items: PurchaseOrderItem[];
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  totalAmount: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

class PharmaDB extends Dexie {
  products!: Table<Product>;
  batches!: Table<Batch>;
  inventory!: Table<Inventory>;
  sales!: Table<Sale>;
  suppliers!: Table<Supplier>;
  settings!: Table<Settings>;
  stockMovements!: Table<StockMovement>;
  purchaseOrders!: Table<PurchaseOrder>;

  constructor() {
    super('PharmaDB');
    this.version(3).stores({
      products: '++id, sku, name, category',
      batches: '++id, productId, expiryDate',
      inventory: '++id, productId',
      sales: '++id, dateTime',
      suppliers: '++id, name',
      settings: '++id, key',
      stockMovements: '++id, productId, batchId, type, createdAt',
      purchaseOrders: '++id, supplierId, status, createdAt',
    });
  }
}

export const db = new PharmaDB();

export const CATEGORIES = [
  'Antibiotics',
  'Pain Relief',
  'Antimalarial',
  'Vitamins',
  'Diabetes',
  'Hypertension',
  'Injections',
  'Syrups',
  'Creams',
  'Other',
];

export const UNITS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drop', 'Suspension'];

export const PAYMENT_METHODS = ['Cash', 'Transfer', 'POS', 'Credit'];