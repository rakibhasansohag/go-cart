# GoCart — Multi-Vendor E-Commerce Platform

GoCart is an e-commerce platform built with Next.js (App Router), TypeScript, Prisma, PostgreSQL, TanStack Query v5, and Clerk authentication.

---

## Test Accounts & Credentials

For local development and automated testing, use the following pre-configured Clerk test accounts:

| Role | Email | Password | Primary Surface |
| :--- | :--- | :--- | :--- |
| **Customer** | `user@email.com` | `123456789` | Storefront & Buyer Profile (`/profile`) |
| **Seller** | `seller@email.com` | `123456789` | Seller Store Dashboard (`/dashboard/seller/stores/srank`) |
| **Admin** | `admin@email.com` | `123456789` | Admin Management Dashboard (`/dashboard/admin`) |

---

## Getting Started

### 1. Install Dependencies & Generate Database Client

```bash
bun install
bun run db:prepare
```

### 2. Run the Development Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing & Quality Assurance

- **Unit & Integration Suite**:
  ```bash
  bun vitest run
  ```
- **Static Typecheck**:
  ```bash
  bun run typecheck
  ```
- **Code & Format Check**:
  ```bash
  bun run check:format
  ```
