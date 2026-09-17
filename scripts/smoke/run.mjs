/**
 * Render every screen and modal once, in Node, and check what comes out.
 *
 * This exists because `npm run build` cannot see the failure that actually
 * happens: a component that references a prop nobody declared builds perfectly
 * and throws `ReferenceError` the moment it renders. That shipped twice.
 *
 * It is not a test framework and does not try to be one. It renders with
 * `renderToStaticMarkup` and asserts on the markup, which is enough to catch
 * the whole class of "the screen is blank now" bugs.
 *
 * What it cannot see: anything in an effect. `renderToStaticMarkup` does not run
 * `useEffect`, so data loading, and the picker's tick-everything-on-open, are
 * invisible here. Assertions must not depend on them.
 */
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(mkdtempSync(path.join(tmpdir(), "trucker-smoke-")), "smoke.cjs");

await build({
  entryPoints: [path.join(here, "harness.jsx")],
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  loader: { ".png": "dataurl" },
  outfile: out,
  logLevel: "error",
  plugins: [{
    name: "stub-portal",
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /ModalBackdrop$/ }, () => ({
        path: path.join(here, "modal-backdrop-stub.jsx"),
      }));
    },
  }],
});

// The screens read these while rendering; Node has neither.
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const error = console.error;
console.error = (message) => {
  // Expected and not interesting: react-router and the shells use layout effects,
  // which a server render cannot encode.
  if (!String(message).includes("useLayoutEffect")) error(message);
};

createRequire(import.meta.url)(out);
