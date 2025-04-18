import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

export default defineConfig({
    plugins: [
        basicSsl(),
        cssInjectedByJsPlugin()
    ],
    server: {
        host: "0.0.0.0",
        port: 8080,
        hmr: {
            clientPort: 8080,
        },
        https: true,
    },
    build: {
        outDir: "dist",
        sourcemap: false,
        lib: {
            entry: "./src/main.ts",
            name: "js_audio_tools",
            formats: [
                "es", 
                // "umd", 
                // "iife", 
                // "cjs", 
                // "system"
            ],
            fileName: "js_audio_tools_bundle",
        },
        rollupOptions: {
            external: [],
            output: {
                globals: {
                    // vue: "Vue",
                    // react: "React",
                    // "react-dom": "ReactDOM",
                    // "js_audio_tools": "jsAudioTools",
                },
            },
        },
    },
});
