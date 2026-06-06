## 2025-06-06 - Consolidate Array Traversals in useMemo

**Learning:** Sequential calls to `.map()`, `.filter()`, and `.forEach()` on the same data array inside a `useMemo` hook create multiple $O(N)$ passes and unnecessary intermediate array allocations. This can impact performance, especially as the dataset grows or when filters trigger frequent re-computations.

**Action:** Consolidate multiple array operations into a single loop (e.g., a single `.forEach()` or `for` loop). This allows populating multiple sets, maps, or result arrays in one pass, reducing CPU cycles and memory pressure. Use benchmark scripts with simulated larger datasets to verify the performance gain.
