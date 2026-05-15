# POS Pro — Product Requirements Document

## Original Problem Statement
> Design me a pos + mobile app solution which should give me sale alerts. Send me a daily sales report. Have capability to maintain purchase, expenses and give me profit at the end of the day / month. I need workers to only see POS Screen. Managers can see all screens and add expenses and Purchases. Need bar code scanner to scan products in pos and add products in Purchases. Can i have this in VS Code

## User Choices (confirmed)
- Responsive web app (mobile browsers + desktop)
- In-app notifications + email-ready daily report (email integration deferred)
- Barcode scanner via camera (native BarcodeDetector) AND manual / hardware-scanner input
- JWT email/password auth
- Currency AUD $

## Architecture
- **Backend**: FastAPI + Motor (MongoDB). JWT (cookie + Bearer fallback), bcrypt password hashing, role-based dependency `require_manager`.
- **Frontend**: React 19, React Router, Tailwind + shadcn-ui, lucide-react icons, recharts charts, sonner toasts. AuthContext stores user, token in localStorage as fallback for cross-site cookie issues.
- **Theme**: Swiss / High-Contrast (Klein Blue primary, Signal Red destructive, JetBrains Mono for numbers). No purple gradients.

## Personas
1. **Manager** — owns the store. Full access to dashboard, products, purchases, expenses, users, reports, notifications. Can also open the POS.
2. **Worker / Cashier** — front-of-shop. Locked to /pos full-screen. Cannot open any management screen.

## Implemented (v1.0 · Feb 2026)
- [x] JWT auth with manager + worker seed accounts
- [x] Role-based routing (worker locked to POS)
- [x] Products CRUD + barcode lookup + low-stock indicator
- [x] POS: search, camera/manual scan, cart, qty +/-, payment method, discount, receipt dialog, auto stock decrement
- [x] Sale alerts inserted on every sale; in-app notifications page with mark-all-read
- [x] Purchases (manager) with multi-line barcode-aware entry; auto-creates new products & increases stock
- [x] Expenses (manager) with categories
- [x] Reports: Day/Month P&L summary, 30-day bar chart, top products, daily report (CSV export)
- [x] Users management (manager creates/deletes worker or manager accounts)
- [x] 8 pre-seeded AUD products to demo the flow

## Backlog (prioritised)
- **P1**: Email daily report via Resend (currently CSV export only)
- **P1**: Receipt printing / PDF export
- **P1**: Stripe Terminal or Razorpay integration for card payments
- **P2**: Multi-store / multi-location support
- **P2**: Shift open / close + cash drawer reconciliation
- **P2**: Customer / loyalty CRM
- **P2**: Atomic stock decrement (current implementation is non-atomic)
- **P3**: Native mobile wrapper (Capacitor) for offline POS

## Files of note
- `/app/backend/server.py` — single-file API
- `/app/frontend/src/App.js` — routes & role gates
- `/app/frontend/src/components/BarcodeScanner.jsx` — camera + manual scanner
- `/app/memory/test_credentials.md` — seeded account credentials
