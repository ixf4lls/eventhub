const isWeb = typeof window !== "undefined";

// The Docker web build uses same-origin relative URLs. Native builds can set
// EXPO_PUBLIC_API_URL / EXPO_PUBLIC_SEARCH_URL when the API is on another host.
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;
const configuredSearchUrl = process.env.EXPO_PUBLIC_SEARCH_URL;

export const API_BASE_URL = (
  configuredApiUrl || (isWeb ? "" : "http://localhost:3000")
).replace(/\/+$/, "");

export const SEARCH_BASE_URL = (
  configuredSearchUrl || (isWeb ? "" : "http://localhost:9200")
).replace(/\/+$/, "");
