const MODELS_URL = "https://ai.hackclub.com/proxy/v1/models";

let cachedModels = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetches the list of available models from the API, with caching
 * @returns {Promise<Array<{name: string, value: string}>>} Array of choices for slash commands
 */
async function fetchModels() {
	const now = Date.now();
	if (cachedModels && now - cacheTime < CACHE_TTL) {
		return cachedModels;
	}

	const res = await fetch(MODELS_URL);
	if (!res.ok) return cachedModels || [];

	const data = await res.json();
	cachedModels = data.data.map((m) => ({ name: m.id, value: m.id }));
	cacheTime = now;
	return cachedModels;
}

module.exports = { fetchModels };
