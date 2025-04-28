import type { UserConfig } from "vite";

export default {
    root:"src/ui",
    publicDir:"public",
    server: {
        port: 4321,
        strictPort: true,
        open: "src/ui/index.html",
    }
} satisfies UserConfig;
