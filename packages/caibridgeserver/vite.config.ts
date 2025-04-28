import type { UserConfig } from "vite";

export default {
    publicDir: "public",
    server: {
        port: 4321,
        strictPort: true,
        open:"index.html"
    },
    build: {
        lib: {
            entry: "src/server/server.ts",
            name: "index",
            fileName: "index",
            formats: ["es"],
        },
    },
    appType: "custom",
    logLevel:"info"
} satisfies UserConfig;
