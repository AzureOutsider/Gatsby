import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "distribution-notices",
      apply: "build",
      closeBundle() {
        for (const file of ["LICENSE", "NOTICE.md"])
          copyFileSync(resolve(file), resolve("web-dist", file));
        const notices = [
          ["React", "react/LICENSE"],
          ["React DOM", "react-dom/LICENSE"],
          ["Lucide React", "lucide-react/LICENSE"],
        ].map(
          ([name, file]) =>
            `${name}\n${readFileSync(resolve("node_modules", file), "utf8")}`,
        );
        writeFileSync(
          resolve("web-dist", "THIRD-PARTY-LICENSES.txt"),
          notices.join("\n\n"),
        );
      },
    },
  ],
  base: "./",
  build: { outDir: "web-dist", emptyOutDir: true },
  server: { port: 5173, strictPort: true },
});
