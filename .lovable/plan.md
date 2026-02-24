

## Problem

The "Popular" filter currently forces all Turkish matches to the top — even those without odds — pushing down matches that actually have betting data. This clutters the default view and makes it hard to find actionable matches with odds.

## Solution

**Remove Turkish prioritization from the "Popular" filter and the global sort.** Instead, rely on the existing **"Türk Takımları (Tümü)"** sidebar filter for users who specifically want Turkish matches.

### Changes to `src/components/BettingOdds.tsx`

1. **Popular filter (lines 513-526)**: Remove the `isTurkish` logic. Popular should simply show matches that have odds (`allBets.length > 0`), sorted by number of available markets (most odds first).

2. **Global sort (lines 530-538)**: Remove the Turkish country priority from the final sort. Keep live-first, then sort by date and time only:
   ```
   Before: live → Turkish → date → time
   After:  live → date → time
   ```

3. **Turkish teams filter (lines 479-484)**: Keep as-is — the sidebar "Türk Takımları" filter already handles this use case correctly.

### What stays the same
- The `TURKISH_TEAMS` constant and `turkish_teams` sidebar filter remain untouched
- The "Türkiye Ligleri" sidebar filter remains untouched
- Live/upcoming/all filters unchanged
- Search functionality unchanged

### Result
- Default and Popular views show matches with actual odds, not cluttered by odds-less Turkish matches
- Users can still click "Türk Takımları (Tümü)" in the sidebar to see all Turkish matches specifically
- Cleaner, more useful browsing experience

