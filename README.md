Ascendant Calculator API

A lightweight Node.js API to compute an astrological chart (ascendant, sun, moon, planets, elements) based on date, time, and location.
Built with TypeScript, Express, and Swiss Ephemeris (WASM).

Features

Ascendant calculation

Sun & Moon positions

Planetary positions (Mercury → Pluto)

Zodiac signs & degrees

Element analysis (dominant / triple)

Deterministic results (Swiss Ephemeris)

REST API with JSON responses

Endpoint
POST /v1/astro/chart

Request body

{
  "date": "1998-07-12",
  "time": "14:35",
  "lat": 50.94,
  "lon": 6.96,
  "tz": "Europe/Berlin"
}


Response (excerpt)

{
  "result": {
    "ascendant": { "longitude": 205.43, "sign": "Libra", "degreeInSign": 25.43 },
    "sun": { "longitude": 109.97, "sign": "Cancer", "degreeInSign": 19.97 },
    "moon": { "longitude": 326.07, "sign": "Aquarius", "degreeInSign": 26.07 },
    "elements": {
      "dominant": "air",
      "label": "air_dominant"
    },
    "planets": {
      "mercury": { "sign": "Leo", "degreeInSign": 16.15 },
      "venus": { "sign": "Gemini", "degreeInSign": 21.45 }
    }
  }
}

Local Development
npm install
cp .env.example .env
npm run dev


The API will be available at:

http://localhost:3000

Scripts
npm run dev     # development (ts-node)
npm run build   # compile TypeScript
npm start       # run production build
npm test        # run tests (vitest)

Configuration

All configuration is done via environment variables.
See .env.example for the full list.

Important variables:

PORT

RATE_LIMIT_PER_MIN

CORS_ORIGINS

REQUIRE_API_KEY

Docs

OpenAPI spec: GET /openapi.json

Swagger UI: GET /docs

Health check: GET /v1/health

Tech Stack

Node.js

TypeScript

Express

Swiss Ephemeris (swisseph-wasm)

Zod (validation)

Vitest + Supertest (testing)

License

MIT