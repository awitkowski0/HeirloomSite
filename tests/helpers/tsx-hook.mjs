/*
 * Test-only: lets a child Node process import .tsx server components and
 * render them with react-dom/server, the way the guides tests check the
 * article template's real output. Loaded AFTER tests/register.mjs (which
 * supplies the @/ alias and extensionless imports).
 *   - .tsx is transpiled with the repo's own TypeScript (jsx: react-jsx),
 *   - `next/link` maps to a shim that unwraps the CJS default export,
 *   - `.css` imports become empty modules.
 */
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const shim = pathToFileURL(fileURLToPath(new URL('./next-link-shim.mjs', import.meta.url))).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/link') return { url: shim, shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.css')) {
      return { format: 'module', source: 'export default {};', shortCircuit: true };
    }
    if (url.startsWith('file:') && url.endsWith('.tsx')) {
      const source = readFileSync(fileURLToPath(url), 'utf8');
      const out = ts.transpileModule(source, {
        fileName: fileURLToPath(url),
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          verbatimModuleSyntax: true,
        },
      });
      return { format: 'module', source: out.outputText, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
