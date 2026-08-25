import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "public");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const requested = pathname === "/" ? "/pages/index.html" : pathname;
    const safePath = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
    const file = join(root, safePath);
    if (!(await stat(file)).isFile()) throw new Error("Not found");
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("404 · Recurso no encontrado");
  }
}).listen(5173, "127.0.0.1", () => console.log("TalentSync disponible en http://localhost:5173"));
