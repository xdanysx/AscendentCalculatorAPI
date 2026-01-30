"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildOpenApi = buildOpenApi;
function buildOpenApi() {
    return {
        openapi: "3.0.3",
        info: { title: "Ascendant Calculator API", version: "1.0.0" },
        paths: {
            "/v1/astro/chart": {
                post: {
                    summary: "Compute chart (ascendant, sun, moon, planets, elements)",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["date", "time", "lat", "lon"],
                                    properties: {
                                        date: { type: "string", example: "1998-07-12" },
                                        time: { type: "string", example: "14:35" },
                                        lat: { type: "number", example: 50.94 },
                                        lon: { type: "number", example: 6.96 },
                                        tz: { type: "string", example: "Europe/Berlin" },
                                        houseSystem: { type: "string", example: "P" }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        "200": { description: "OK" },
                        "400": { description: "Invalid input" },
                        "500": { description: "Internal error" }
                    }
                }
            },
            "/v1/health": {
                get: {
                    summary: "Healthcheck",
                    responses: { "200": { description: "OK" } }
                }
            }
        }
    };
}
//# sourceMappingURL=openapi.js.map