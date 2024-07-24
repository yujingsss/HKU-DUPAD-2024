import { defineConfig } from "vite";
import path, { format } from "path";
import { viteExternalsPlugin } from "vite-plugin-externals";
const resolve = (url) => path.resolve(__dirname, url);

export default defineConfig({
    plugins:
        process.env.NODE_ENV === "production"
            ? [
                viteExternalsPlugin({
                    three: "THREE",
                    aitable: "Airtable",
                }),
            ]
            : [],
    css: {
        modules: {
            generateScopedName: "[name]__[local]__[hash:5]",
        },
        preprocessorOptions: {
            sass: {
                javascriptEnabled: true,
            }
        }
    },
    build: {
        lib: {
            entry: resolve("src/vr-hall/index.js"),
            name: "VRHall",
            fileName: (format) => `lib/vrhall.${format}.js`,
        },
    },
    base: "/",
    server: {
        host: "0.0.0.0",
        port: 3000,
    },
});