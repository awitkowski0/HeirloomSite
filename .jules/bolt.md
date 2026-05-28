## 2024-05-28 - Missing useMemo on Expensive Aggregations
**Learning:** In React components like `Gallery.tsx`, performing large O(N) aggregations (e.g., mapping and filtering the entire inventory database into unique maps and sets) directly within the render body causes severe performance degradation, as these run synchronously on every render and block the main thread.
**Action:** Always wrap these expensive operations in `useMemo` hooks with tight dependency arrays (e.g. `[inventory, selectedWood]`) to ensure they only recompute when their base data actually changes.
