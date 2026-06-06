## 2025-05-14 - Redundant Array Filtering in Render Loop

**Learning:** Filtering a large array inside a `map` loop (O(N*M)) during component rendering can significantly impact performance, especially with large datasets like an inventory list. Pre-grouping data into a `Map` outside the loop reduces lookup complexity to O(1), leading to an overall O(N+M) complexity.

**Action:** Precompute an `itemsByProduct` Map within `useMemo` in `Gallery.tsx` to group inventory items by product name, then use this Map in `getDisplayConfig` for efficient constant-time lookups.
