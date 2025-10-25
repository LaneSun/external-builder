import { fileURLToPath } from "node:url";
import { rollup } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

const rel_to = (path) => fileURLToPath(new URL(path, import.meta.url));
const files = rel_to("./files");

export default function(opts = {}) {
  const {
    out = "build",
    precompress = false,
  } = opts;

  return {
    name: "svelte-adapter-deno",

    async adapt(builder) {
      const tmp = builder.getBuildDirectory("deno");

      builder.rimraf(out);
      builder.rimraf(tmp);
      builder.mkdirp(tmp);

      builder.log.minor("Copying assets");
      builder.writeClient(
        `${out}/client${builder.config.kit.paths.base}`,
      );
      builder.writePrerendered(
        `${out}/prerendered${builder.config.kit.paths.base}`,
      );

      if (precompress) {
        builder.log.minor("Compressing assets");
        await Promise.all([
          builder.compress(`${out}/client`),
          builder.compress(`${out}/prerendered`),
        ]);
      }

      builder.log.minor("Building server");

      builder.writeServer(tmp);

      Deno.writeTextFileSync(
        `${tmp}/manifest.js`,
        `export const manifest = ${builder.generateManifest({ relativePath: "./" })
        };`,
      );

      const bundle = await rollup({
        input: {
          index: `${tmp}/index.js`,
          manifest: `${tmp}/manifest.js`,
        },
        external: ["rakiyu-deno-kv"],
        plugins: [
          nodeResolve({ preferBuiltins: true }),
          commonjs(),
          json(),
        ],
      });

      await bundle.write({
        dir: `${out}/server`,
        format: "esm",
        sourcemap: true,
        chunkFileNames: "chunks/[name]-[hash].js",
      });

      builder.copy(files, out, {
        replace: {
          MANIFEST: "./server/manifest.js",
          SERVER: "./server/index.js",
        },
      });
    },
  };
}
