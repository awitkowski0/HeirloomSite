## 2026-05-14 - Parallelize Convex Database Operations
**Learning:** Sequential database operations (`ctx.db.insert`, `ctx.db.patch`, `ctx.db.delete`) inside `for...of` loops cause high latency in Convex mutations because each operation waits for the previous one to complete. Convex transactions benefit significantly from parallelization since operations are executed against the same database transaction.
**Action:** Always use `Promise.all(array.map(async item => ...))` when performing multiple independent database operations within a Convex mutation or action to reduce latency.
