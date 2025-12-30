const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { LICENSE_TIERS, LICENSE_TIER_LEVELS, LICENSE_KEY_CONFIG } = require("../constants");

const LICENSE_FILE = path.join(__dirname, "../data/licenses.json");

/**
 * Generates a random string using the specified character set
 * @param {number} length - Length of the string to generate
 * @param {string} characterSet - Character set to use
 * @returns {string} Random string
 */
function generateRandomString(length, characterSet) {
	let result = "";
	const charactersLength = characterSet.length;

	// Generate random bytes and map them to characters
	const randomBytes = crypto.randomBytes(length * 2); // Generate extra to avoid bias

	for (let i = 0; i < length; i++) {
		// Use random bytes to pick characters
		const randomIndex = randomBytes[i] % charactersLength;
		result += characterSet[randomIndex];
	}

	return result;
}

/**
 * Generates a random license key string
 * @param {string} tier - License tier (FREE, BASIC, PRO)
 * @param {Object} config - Optional custom configuration (overrides LICENSE_KEY_CONFIG)
 * @returns {string} License key in configured format
 */
function generateLicenseKeyString(tier, config = LICENSE_KEY_CONFIG) {
	const segments = [];

	// Add tier prefix if configured
	if (config.includeTierPrefix) {
		segments.push(tier.toUpperCase());
	}

	// Generate random segments
	for (let i = 0; i < config.segments; i++) {
		const segment = generateRandomString(config.segmentLength, config.characterSet);
		segments.push(segment);
	}

	return segments.join(config.separator);
}

/**
 * Loads licenses from the JSON file
 * @returns {Object} Licenses data
 */
function loadLicenses() {
	try {
		if (!fs.existsSync(LICENSE_FILE)) {
			return { licenses: {}, users: {} };
		}

		const data = fs.readFileSync(LICENSE_FILE, "utf-8");
		return JSON.parse(data);
	} catch (error) {
		console.error("[LICENSE] Error loading licenses:", error);
		return { licenses: {}, users: {} };
	}
}

/**
 * Saves licenses to the JSON file
 * @param {Object} data - Licenses data to save
 */
function saveLicenses(data) {
	try {
		fs.writeFileSync(LICENSE_FILE, JSON.stringify(data, null, 2), "utf-8");
	} catch (error) {
		console.error("[LICENSE] Error saving licenses:", error);
		throw error;
	}
}

/**
 * Creates a new license key entry
 * @param {string} tier - License tier
 * @returns {string} The generated license key
 */
function generateLicenseKey(tier) {
	const data = loadLicenses();
	const key = generateLicenseKeyString(tier);

	// Create license entry
	data.licenses[key] = {
		tier,
		createdAt: new Date().toISOString(),
		usedBy: null,
		usedAt: null,
		revoked: false
	};

	saveLicenses(data);
	console.log(`[LICENSE] Generated ${tier} license key: ${key}`);

	return key;
}

/**
 * Generates multiple license keys and creates entries for them
 * @param {string} tier - License tier
 * @param {number} count - Number of keys to generate
 * @returns {Array<string>} Array of license keys
 */
function generateMultipleLicenseKeys(tier, count) {
	const data = loadLicenses();
	const keys = [];

	for (let i = 0; i < count; i++) {
		const key = generateLicenseKeyString(tier);

		// Create license entry
		data.licenses[key] = {
			tier,
			createdAt: new Date().toISOString(),
			usedBy: null,
			usedAt: null,
			revoked: false
		};

		keys.push(key);
	}

	saveLicenses(data);
	console.log(`[LICENSE] Generated ${count} ${tier} license keys`);

	return keys;
}

/**
 * Gets a user's license information
 * @param {string} userId - Discord user ID
 * @returns {Object|null} User license information or null if not found
 */
function getUserLicense(userId) {
	const data = loadLicenses();
	const userInfo = data.users[userId];

	if (!userInfo) {
		return null;
	}

	// Get the actual license data
	const license = data.licenses[userInfo.licenseKey];

	if (!license) {
		console.warn(`[LICENSE] User ${userId} has invalid license key: ${userInfo.licenseKey}`);
		return null;
	}

	// Return combined user + license info
	return {
		userId,
		tier: userInfo.tier,
		licenseKey: userInfo.licenseKey,
		activatedAt: userInfo.activatedAt,
		oldLicenses: userInfo.oldLicenses || [],
		revoked: license.revoked,
		createdAt: license.createdAt,
		updatedAt: userInfo.activatedAt
	};
}

/**
 * Creates or updates a user's license (auto-generates FREE license for new users)
 * @param {string} userId - Discord user ID
 * @param {string} tier - License tier
 * @param {string|null} customKey - Custom license key (optional, generates if not provided)
 * @returns {Object} The created/updated license
 */
function setUserLicense(userId, tier, customKey = null) {
	const data = loadLicenses();
	let licenseKey = customKey;

	// If no custom key provided, generate a new one
	if (!licenseKey) {
		licenseKey = generateLicenseKeyString(tier);

		// Create license entry
		data.licenses[licenseKey] = {
			tier,
			createdAt: new Date().toISOString(),
			usedBy: userId,
			usedAt: new Date().toISOString(),
			revoked: false
		};
	} else {
		// Using existing key, mark it as used
		if (data.licenses[licenseKey]) {
			data.licenses[licenseKey].usedBy = userId;
			data.licenses[licenseKey].usedAt = new Date().toISOString();
		}
	}

	// Save old license if upgrading
	const oldLicenses = data.users[userId]?.oldLicenses || [];
	if (data.users[userId] && data.users[userId].licenseKey !== licenseKey) {
		oldLicenses.push(data.users[userId].licenseKey);
	}

	// Create/update user entry
	data.users[userId] = {
		licenseKey,
		tier,
		activatedAt: new Date().toISOString(),
		oldLicenses
	};

	saveLicenses(data);
	console.log(`[LICENSE] Set license for user ${userId}: ${tier} (${licenseKey})`);

	return getUserLicense(userId);
}

/**
 * Revokes a user's license
 * @param {string} userId - Discord user ID
 * @returns {boolean} True if revoked, false if user not found
 */
function revokeLicense(userId) {
	const data = loadLicenses();
	const userInfo = data.users[userId];

	if (!userInfo) {
		return false;
	}

	const currentTier = userInfo.tier;
	const currentKey = userInfo.licenseKey;

	if (currentTier === LICENSE_TIERS.FREE) {
		// If FREE license is revoked, mark the license as revoked (user is banned)
		if (data.licenses[currentKey]) {
			data.licenses[currentKey].revoked = true;
		}
	} else {
		// If BASIC or PRO is revoked, downgrade to FREE
		const newKey = generateLicenseKeyString(LICENSE_TIERS.FREE);

		// Create new FREE license
		data.licenses[newKey] = {
			tier: LICENSE_TIERS.FREE,
			createdAt: new Date().toISOString(),
			usedBy: userId,
			usedAt: new Date().toISOString(),
			revoked: false
		};

		// Save old license
		const oldLicenses = userInfo.oldLicenses || [];
		oldLicenses.push(currentKey);

		// Update user
		data.users[userId] = {
			licenseKey: newKey,
			tier: LICENSE_TIERS.FREE,
			activatedAt: new Date().toISOString(),
			oldLicenses
		};
	}

	saveLicenses(data);
	console.log(`[LICENSE] Revoked license for user ${userId} (was ${currentTier})`);

	return true;
}

/**
 * Un-revokes a user's license
 * @param {string} userId - Discord user ID
 * @returns {boolean} True if un-revoked, false if user not found or not revoked
 */
function unrevokeLicense(userId) {
	const data = loadLicenses();
	const userInfo = data.users[userId];

	if (!userInfo) {
		return false;
	}

	const license = data.licenses[userInfo.licenseKey];

	if (!license || !license.revoked) {
		return false;
	}

	// Un-revoke the license
	license.revoked = false;

	saveLicenses(data);
	console.log(`[LICENSE] Un-revoked license for user ${userId}`);

	return true;
}

/**
 * Checks if a user can use a command based on license tier
 * @param {string} userId - Discord user ID
 * @param {string} requiredTier - Required license tier for the command
 * @returns {Object} { allowed: boolean, userTier: string, reason: string }
 */
function canUseCommand(userId, requiredTier = LICENSE_TIERS.FREE) {
	const license = getUserLicense(userId);

	// If user has no license, they need one (shouldn't happen with auto-generation)
	if (!license) {
		return {
			allowed: false,
			userTier: null,
			reason: "No license found. Please interact with the bot to generate a license."
		};
	}

	// If license is revoked, user is banned
	if (license.revoked) {
		return {
			allowed: false,
			userTier: license.tier,
			reason: "Your license has been revoked. You are banned from using this bot."
		};
	}

	// Check if user's tier meets the requirement
	const userLevel = LICENSE_TIER_LEVELS[license.tier] || 0;
	const requiredLevel = LICENSE_TIER_LEVELS[requiredTier] || 0;

	if (userLevel >= requiredLevel) {
		return {
			allowed: true,
			userTier: license.tier,
			reason: null
		};
	}

	return {
		allowed: false,
		userTier: license.tier,
		reason: `This command requires ${requiredTier} license or higher. You have ${license.tier}.`
	};
}

/**
 * Redeems a license key for a user
 * @param {string} userId - Discord user ID
 * @param {string} licenseKey - License key to redeem
 * @returns {Object} { success: boolean, tier: string|null, message: string }
 */
function redeemLicenseKey(userId, licenseKey) {
	const data = loadLicenses();
	const config = LICENSE_KEY_CONFIG;

	// Normalize key (trim whitespace)
	licenseKey = licenseKey.trim();

	// Strict format validation (if enabled)
	if (config.strictValidation) {
		const parts = licenseKey.split(config.separator);
		const expectedParts = config.segments;

		if (parts.length !== expectedParts) {
			return {
				success: false,
				tier: null,
				message: `Invalid license key format. Expected ${expectedParts} segments separated by "${config.separator}".`
			};
		}

		// Validate each segment length
		for (let i = 0; i < parts.length; i++) {
			if (parts[i].length !== config.segmentLength) {
				return {
					success: false,
					tier: null,
					message: `Invalid segment length. Expected ${config.segmentLength} characters per segment.`
				};
			}
		}
	}

	// Check if key exists (this validates that it's a valid, generated key)
	const license = data.licenses[licenseKey];

	if (!license) {
		return { success: false, tier: null, message: "Invalid license key. Key does not exist." };
	}

	// Check if key is revoked
	if (license.revoked) {
		return { success: false, tier: null, message: "This license key has been revoked." };
	}

	// Check if key is already in use by another user
	if (license.usedBy && license.usedBy !== userId) {
		return { success: false, tier: null, message: "This license key is already in use by another user." };
	}

	// Assign the license to the user (tier comes from the license object)
	setUserLicense(userId, license.tier, licenseKey);

	return { success: true, tier: license.tier, message: `Successfully redeemed ${license.tier} license!` };
}

module.exports = {
	generateLicenseKey,
	generateMultipleLicenseKeys,
	getUserLicense,
	setUserLicense,
	revokeLicense,
	unrevokeLicense,
	canUseCommand,
	redeemLicenseKey
};
