/*
 * Lets `node --test` run the TypeScript sources directly, with no new
 * dependency. Node 24 strips the types itself; these hooks only supply what
 * the Next/bundler toolchain normally does:
 *   - the `@/` path alias from tsconfig.json,
 *   - extensionless relative imports (`./order-terms` -> `./order-terms.ts`),
 *   - JSON imports without an import attribute (src/lib/pricing.ts imports the
 *     generated data/pricing.json the bundler way).
 * `server-only` resolves to its empty build because the test script passes
 * --conditions=react-server.
 */
import { registerHooks } from 'node:module';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as resolvePath } from 'node:path';

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');

function withExtension(path) {
  for (const candidate of [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // does not exist; try the next form
    }
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    let base = null;
    if (specifier.startsWith('@/')) {
      base = resolvePath(root, 'src', specifier.slice(2));
    } else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
      base = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);
    }
    if (base) {
      const found = withExtension(base);
      if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.json')) {
      const text = readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${text};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
