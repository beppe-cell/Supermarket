import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  base: "./",
  build: {
    target: "es2022",
    sourcemap: mode !== "artifact",
    // Nomi stabili per la pubblicazione come Artifact (nessun hash)
    rollupOptions: mode === "artifact"
      ? { output: { inlineDynamicImports: true, entryFileNames: "assets/[name].js", chunkFileNames: "assets/[name].js", assetFileNames: "assets/[name][extname]" } }
      : {},
  },
}));
