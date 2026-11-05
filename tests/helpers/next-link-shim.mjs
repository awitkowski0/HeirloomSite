// next has no "exports" map, so plain Node resolves `next/link` to the CJS
// module object. The bundler unwraps `.default`; this does the same.
import mod from 'next/link.js';
export default mod.default ?? mod;
