import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readdirSync } from "node:fs";
import { createHash } from "node:crypto";

/**
 * Genera sw.js con la lista de TODOS los archivos del build (incluido el motor que se carga aparte
 * y las fuentes de KaTeX/MathLive), así la app instalada funciona sin internet.
 */
function offline(): Plugin {
  return {
    name: "offline-sw",
    apply: "build",
    generateBundle(_, bundle) {
      const files = [...Object.keys(bundle), ...readdirSync("public")].filter((f) => f !== "sw.js");
      const urls = ["./", ...files.map((f) => `./${f}`)];
      const version = createHash("sha1").update(files.sort().join("|")).digest("hex").slice(0, 10);
      const source = `// generado en el build
const CACHE = "crack-${version}";
const URLS = ${JSON.stringify(urls)};
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(URLS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true, ignoreVary: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).catch(() =>
        e.request.mode === "navigate" ? caches.match("./") : Response.error(),
      );
    }),
  );
});
`;
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  // rutas relativas: funciona en cualquier hosting (también en una subcarpeta, como GitHub Pages)
  base: "./",
  plugins: [react(), tailwindcss(), offline()],
  // nerdamer + mathjs pesan ~1 MB: es esperado, todo el motor corre en el navegador.
  build: { chunkSizeWarningLimit: 1500 },
});
