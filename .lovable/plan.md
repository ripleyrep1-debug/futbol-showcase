

## Admin Panel Plan

This plan creates a full admin panel with sidebar navigation, dashboard stats, and user management -- all in Turkish. Since there's no database yet, we'll set up the Supabase schema first, then build the UI.

---

### Phase 1: Database Setup (Migration)

Create the following tables and functions via migration:

1. **`app_role` enum**: `('admin', 'user')`
2. **`profiles` table**: `id (uuid, FK auth.users)`, `display_name`, `balance` (numeric, default 0), `status` (active/suspended), `avatar_url`, `created_at`
3. **`user_roles` table**: `id`, `user_id (FK auth.users)`, `role (app_role)`, unique on (user_id, role)
4. **`transactions` table**: `id`, `user_id`, `type` (deposit/withdrawal/bet/win), `amount`, `description`, `created_at`
5. **`bets` table**: `id`, `user_id`, `selections` (jsonb), `stake`, `total_odds`, `potential_win`, `status` (pending/won/lost/cancelled), `created_at`
6. **`site_settings` table**: `key` (text PK), `value` (text)
7. **`has_role()` security definer function** for safe role checks
8. **RLS policies** on all tables: users read own data, admins read/write all
9. **Trigger** to auto-create profile on signup

---

### Phase 2: Auth Pages

- **`/giris` (Login page)**: Email/password login form, Turkish labels
- **`/kayit` (Register page)**: Email/password signup form
- **Auth context/hook** (`useAuth`): wraps `onAuthStateChange` + `getSession`, exposes `user`, `isAdmin`, `signOut`

---

### Phase 3: Admin Layout & Pages

**New files:**

| File | Purpose |
|------|---------|
| `src/components/admin/AdminLayout.tsx` | Sidebar + top bar + `<Outlet />` wrapper |
| `src/components/admin/AdminSidebar.tsx` | Navigation: Panel, Kullanicilar, Bakiye, Bahisler, Oranlar, Odemeler, Ayarlar |
| `src/pages/admin/Dashboard.tsx` | Stats cards (Toplam Kullanıcı, Aktif Bahisler, Günlük Hacim, Toplam Bakiye) + recent activity |
| `src/pages/admin/Users.tsx` | User management table with search, status toggle, balance display |
| `src/pages/admin/Bets.tsx` | Placeholder for bet management |
| `src/pages/admin/Payments.tsx` | Placeholder for payment management |
| `src/pages/admin/Settings.tsx` | Placeholder for site settings |

**Route structure in `App.tsx`:**
```
/giris         → Login
/kayit         → Register
/admin         → AdminLayout (protected, requires admin role)
  /admin       → Dashboard
  /admin/kullanicilar → Users
  /admin/bahisler     → Bets
  /admin/odemeler     → Payments
  /admin/ayarlar      → Settings
```

**Admin sidebar navigation items (Turkish):**
- Genel Bakış (Dashboard) -- LayoutDashboard icon
- Kullanıcılar -- Users icon
- Bahis Yönetimi -- Trophy icon
- Ödemeler -- CreditCard icon
- Site Ayarları -- Settings icon

**Dashboard stats cards:**
- Toplam Kullanıcı (total profiles count)
- Aktif Bahisler (pending bets count)
- Günlük Hacim (sum of today's transactions)
- Toplam Bakiye (sum of all user balances)

**Users table columns:**
- Kullanıcı (display_name + email)
- Bakiye (₺ formatted)
- Durum (active/suspended badge)
- Kayıt Tarihi (formatted date)
- İşlemler (suspend/activate button)

---

### Phase 4: Wire Up Header

- Update Header "Giriş Yap" and "Kayıt Ol" buttons to link to `/giris` and `/kayit`
- If user is admin, show "Admin Panel" link in header

---

### Technical Details

- Admin route protection: `useAuth` hook checks `has_role` via Supabase RPC call; redirects non-admins to `/`
- All admin data fetched via `@tanstack/react-query` using the Supabase client
- Admin sidebar uses existing dark theme CSS variables for consistency
- Responsive: sidebar collapses to icon-only on smaller screens
- No new dependencies needed -- uses existing shadcn/ui components (Table, Card, Badge, Button)

---

### Security

- Roles stored in separate `user_roles` table (never on profiles)
- `has_role()` is `SECURITY DEFINER` to avoid RLS recursion
- Admin check is server-side via RLS policies, not client-side only
- RLS on all tables; admin policies use `has_role(auth.uid(), 'admin')`

