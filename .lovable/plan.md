

## Gap Analysis: What's Missing for User and Admin

### Current State Summary

**User side has:**
- Auth (login/register via username)
- Balance display in header
- Deposit (IBAN) and withdrawal request modal
- Payment history
- Betting odds view with league filtering
- Bet slip (add selections, set stake)
- Football widgets, standings

**Admin side has:**
- Dashboard with 10 stat cards + recent activity
- User management (search, suspend, balance edit, history)
- Bet management (list, settle won/lost)
- Payment processing (approve/reject deposits & withdrawals, manual IBAN entry)
- Odds override (live match odds control)
- Settings (limits, commission, IBAN toggle, bet category toggles, maintenance mode, announcements)

---

### Missing: User Side

| # | Feature | Details |
|---|---------|---------|
| 1 | **Bet slip doesn't actually place bets** | The "Bahis Yap" button in `BetSlip.tsx` has no `onClick` handler — it never inserts into the `bets` table, doesn't check balance, and doesn't deduct stake from user balance. This is the most critical gap. |
| 2 | **No "My Bets" history page** | Users cannot see their past bets, results, or winnings. There's no `/bahislerim` route or component. |
| 3 | **No user profile page** | No way to view or edit display name, change password, or see account details. |
| 4 | **Balance not deducted on bet** | Even once bet placement works, there's no transaction created and no balance update on the user side. |
| 5 | **No bet limits enforced on user side** | `min_stake`, `max_stake`, `max_payout`, `max_accumulator` settings exist in admin but are never checked when the user builds a bet slip. |
| 6 | **Maintenance mode not enforced** | Admin can toggle `maintenance_mode` but the user-facing app never reads it or blocks betting. |
| 7 | **Announcement banner not shown** | Admin can set an announcement but it's never rendered on the main page. |
| 8 | **BottomNav is static** | Shows Giriş/Kayıt links even when logged in; doesn't link to auth modal or user-specific pages. |
| 9 | **No login required prompt for betting** | If a non-logged-in user clicks an odds button, nothing tells them to log in first. |
| 10 | **Dashboard "Son Bahisler/Ödemeler" join still uses `profiles(display_name)`** | The Dashboard queries still use the FK join pattern that was already fixed in Bets.tsx and Payments.tsx — these will fail silently. |

---

### Missing: Admin Side

| # | Feature | Details |
|---|---------|---------|
| 1 | **No real-time notifications** | Admin has no alerts for new payment requests or new bets (e.g., a bell icon with count). |
| 2 | **No user transaction log** | Admin can see recent payments and bets on the dashboard but there's no dedicated transaction history page showing all deposits/withdrawals/bet payouts. |
| 3 | **No export/download** | No CSV/Excel export for bets, payments, or user data. |
| 4 | **No bulk bet settlement** | Admin must settle bets one by one — no "settle all bets for match X" feature. |
| 5 | **No audit log** | No record of which admin performed which action (approved payment, settled bet, changed odds). |
| 6 | **Dashboard join bug** | `recentBets` and `recentPayments` queries still use `profiles(display_name)` FK join which may fail (same bug that was fixed in Bets.tsx/Payments.tsx). |

---

### Recommended Implementation Priority

**Phase 1 — Critical (app is broken without these):**
1. Wire up "Bahis Yap" button: check auth, check balance, check limits, insert bet, deduct balance, create transaction
2. Fix Dashboard FK join bug (use same two-step fetch pattern)
3. Show maintenance mode banner / block betting when active
4. Show announcement banner on Index page

**Phase 2 — Important (core user experience):**
5. "Bahislerim" (My Bets) page at `/bahislerim` — list user's bets with status badges
6. User profile page — display name, balance, change password
7. Enforce site settings limits (min/max stake, max payout, max selections)
8. Login prompt when unauthenticated user clicks odds
9. Update BottomNav to be context-aware (show Bakiye/Bahislerim when logged in)

**Phase 3 — Nice to have:**
10. Admin notification badge for pending payments
11. Bulk bet settlement by match
12. CSV export for admin tables
13. Admin audit log

---

### Technical Notes

- **Bet placement flow**: Insert into `bets` table → insert transaction (type: `bet`, negative amount) → update `profiles.balance` via admin RLS or a new `place_bet` RPC function (SECURITY DEFINER) that atomically deducts balance and creates the bet. An RPC is preferred to avoid race conditions.
- **Dashboard fix**: Replace `profiles(display_name)` join with the same two-step fetch already used in `Bets.tsx` and `Payments.tsx`.
- **Maintenance/announcement**: Read `site_settings` in `Index.tsx`, render a banner component, and conditionally disable the bet slip submit button.
- **My Bets page**: New route `/bahislerim`, new component that queries `bets` table with `user_id = auth.uid()`, shows selections, status, and payout.

