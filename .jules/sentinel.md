## 2024-05-14 - Fix Hardcoded Admin Password
**Vulnerability:** Found hardcoded fallback password `heirloom2024` for `VITE_ADMIN_PASSWORD` in multiple Convex functions.
**Learning:** Hardcoded passwords can easily be forgotten or accidentally pushed to production, creating a significant security risk by allowing unauthorized admin access.
**Prevention:** Removed the fallback password and required `VITE_ADMIN_PASSWORD` to be explicitly set in the environment variables to enforce secure password configurations.

## 2024-05-24 - [Vite Prefix Secret Exposure Risk]
**Vulnerability:** The backend admin password environment variable was named `VITE_ADMIN_PASSWORD`. In Vite, any environment variable prefixed with `VITE_` is automatically exposed to the client-side build, risking accidental leakage of backend secrets to end users if referenced in frontend code.
**Learning:** Avoid using the `VITE_` prefix for purely backend secrets.
**Prevention:** Renamed the environment variable from `VITE_ADMIN_PASSWORD` to `ADMIN_PASSWORD` across the codebase (Convex backend files, seed scripts, and documentation) to guarantee it is safely retained only on the server/Node environment.
