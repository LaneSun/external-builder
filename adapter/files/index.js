import { Server } from "SERVER";
import { manifest } from "MANIFEST";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serveDir } from "jsr:@std/http";

const dir = join(dirname(fileURLToPath(import.meta.url)), "client");

const server = new Server(manifest);
await server.init({ env: {} });

Deno.serve(async request => {
  const response = await serveDir(request, {
    fsRoot: dir,
    quiet: true,
    headers: [
      "Cross-Origin-Opener-Policy: same-origin",
      "Cross-Origin-Embedder-Policy: require-corp",
    ],
  });
  if (response.status < 400) {
    return response;
  } else {
    const response = await server.respond(request, {
      platform: { info: "deno" },
    });
    return response;
  }
});
