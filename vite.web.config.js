import { defineConfig } from "vite";
import path from "path";
import topLevelAwait from "vite-plugin-top-level-await";
const resolve = (url) => path.resolve(__dirname, url);

export default defineConfig({
    plugins: [
        topLevelAwait({
            // The export name of top-level await promise for each chunk module
            promiseExportName: "__tla",
            // The function to generate import names of top-level await promise in each chunk module
            promiseImportName: i => `__tla_${i}`
        }),
    ],
    css: {
        modules: {
            generateScopedName: "[name]__[local]__[hash:5]",
        },
        preprocessorOptions: {
            sass: {
                javascriptEnabled: true,
            },
        },
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve("index.html"),
            },
        },
        minify: "terser",
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
            },
        },
    },
    base: "/",
});