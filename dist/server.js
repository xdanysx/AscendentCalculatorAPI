"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const swe_1 = require("./lib/swe");
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";
const server = app_1.app.listen(PORT, HOST, () => {
    console.log(`Listening on http://${HOST}:${PORT}`);
});
async function shutdown(signal) {
    console.log(`Shutting down (${signal})...`);
    server.close(async () => {
        try {
            const swe = await (0, swe_1.getSwe)();
            swe.close?.();
        }
        catch (e) {
            console.error("Error closing swe", e);
        }
        finally {
            process.exit(0);
        }
    });
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
//# sourceMappingURL=server.js.map