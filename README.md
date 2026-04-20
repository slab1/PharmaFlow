# PharmaFlow - Pharmacy Management System

Offline-first pharmacy management system designed for small-town and semi-urban pharmacies in Nigeria.

## Problem

- 85% of retail and 90% of wholesale pharmaceutical transactions in Nigeria occur outside traditional pharmacy channels
- Small-town pharmacies cannot track inventory and often sell expired stock unknowingly
- Informal supply chain creates safety and business risks

## Solution

PharmaFlow is a lightweight, offline-first pharmacy management system that enables:
- Inventory tracking with batch-level management
- Expiry alert system to prevent expired drug sales
- Supplier ordering workflow
- Point-of-sale with receipts
- Sales reports and analytics

## Features

### Inventory Management
- Product catalog with categories
- Batch-level stock tracking
- Expiry status (OK/Warning/Critical/Expired)
- Low stock alerts
- Stock adjustments with audit trail

### Purchase Orders
- Supplier directory
- Create purchase orders
- Order status tracking (Draft → Sent → Confirmed → Received)

### Point of Sale
- Quick product lookup
- Cart management
- Receipt generation
- Payment methods (Cash, Transfer, POS, Credit)

### Reports
- Sales reports (daily, weekly, monthly)
- Inventory valuation
- Expiry tracking
- CSV export

### Offline-First
- Works without internet
- Local database (IndexedDB)
- PWA installable

## Tech Stack

- React 19 + TypeScript
- Vite
- TailwindCSS
- Dexie (IndexedDB)
- PWA

## Getting Started

### Prerequisites
- Node.js 18+

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Deployment

### Netlify (Drag & Drop)
1. Go to https://netlify.com/drop
2. Drag the `dist/` folder
3. Get your URL instantly

### Vercel

```bash
npm i -g vercel
vercel --prod
```

### Cloudflare Pages

```bash
wrangler pages deploy dist
```

## Pricing Model

- **Pharmacy Subscription**: ₦3,000–₦8,000/month
- **Wholesaler Commission**: 1-2% on orders

## License

MIT

## Author

PharmaFlow - Pharmacy Management for Nigeria