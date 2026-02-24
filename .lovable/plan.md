

## Plan: Per-Selection Results on MyBets + Admin Bet Detail Management

### Problem
Currently, users only see the overall bet status (Bekliyor/Kazandı/Kaybetti). They have no visibility into which individual selections within a coupon have won or lost. The admin also settles the entire bet at once without marking individual selections.

### Solution

**1. Admin Side — Bets Page Enhancement (`Bets.tsx`)**
- Make each bet row expandable (click to expand) showing all selections in a detailed sub-table
- Each selection row gets a mini action: ✅ Kazandı / ❌ Kaybetti buttons
- Marking a selection updates the `result` field inside that selection's JSONB entry (e.g., `selections[i].result = "won" | "lost"`)
- When all selections are marked, auto-suggest settling the whole bet (if all won → "Kazandı", if any lost → "Kaybetti")
- Admin can still override and settle the whole bet manually

**2. User Side — MyBets Page Enhancement (`MyBets.tsx`)**
- Show each selection with a result indicator icon/badge:
  - ✅ green check if `sel.result === "won"`
  - ❌ red X if `sel.result === "lost"`
  - ⏳ clock/dash if no result yet
- Add a progress indicator: "2/3 seçim sonuçlandı" style text
- Keep the overall bet status badge at the top as-is

**3. No Database Migration Needed**
- The `selections` column is already JSONB — we just add a `result` field to each selection object when the admin marks it
- The `bets` table update (JSONB modification) is done via Supabase's standard update

### Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/Bets.tsx` | Add expandable rows with per-selection result buttons, JSONB update mutation |
| `src/pages/MyBets.tsx` | Show per-selection result icons/badges, progress indicator |

### Selection JSONB Structure (before → after)

```text
Before: { matchLabel, selection, odds, ... }
After:  { matchLabel, selection, odds, ..., result: "won" | "lost" | undefined }
```

### Implementation Details

**Admin Bets page changes:**
- Add `expandedBetId` state to toggle row expansion
- When expanded, render a sub-row with all selections listed with match name, selection, odds, and two small buttons (Kazandı/Kaybetti)
- Clicking a result button triggers a mutation that reads current selections JSONB, updates the specific selection's `result` field, and writes back
- Show a summary: "3/5 seçim sonuçlandı" with auto-settle suggestion when all are marked
- Add cancel/refund: when admin cancels a bet, refund stake back to user balance and create a refund transaction

**User MyBets page changes:**
- For each selection row, show a colored icon based on `sel.result`
- Add a small progress bar or text showing how many selections have results
- Style: green background tint for won selections, red tint for lost, neutral for pending

