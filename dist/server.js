"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const PORT = Number(process.env.PORT ?? 3000);
const HOST = "0.0.0.0";
app_1.app.listen(PORT, HOST, () => {
    console.log(`Listening on http://${HOST}:${PORT}`);
});
//# sourceMappingURL=server.js.map