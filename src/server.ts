import { app } from "./app";
import { getSwe } from "./lib/swe";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  console.log(`Listening on http://${HOST}:${PORT}`);
});

async function shutdown(signal: string) {
  console.log(`Shutting down (${signal})...`);
  server.close(async () => {
    try {
      const swe = await getSwe();
      swe.close?.();
    } catch (e) {
      console.error("Error closing swe", e);
    } finally {
      process.exit(0);
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
