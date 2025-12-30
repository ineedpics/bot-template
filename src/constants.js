const COMMAND_CONTEXTS = {
	OWNER_ONLY: "OWNER_ONLY",
	GLOBAL: "GLOBAL"
};

const LICENSE_TIERS = {
	FREE: "FREE",
	BASIC: "BASIC",
	PRO: "PRO"
};

// License tier hierarchy (higher number = higher tier)
const LICENSE_TIER_LEVELS = {
	[LICENSE_TIERS.FREE]: 0,
	[LICENSE_TIERS.BASIC]: 1,
	[LICENSE_TIERS.PRO]: 2
};

// Character sets for license key generation
const CHARACTER_SETS = {
	NUMERIC: "0123456789",
	UPPERCASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
	LOWERCASE: "abcdefghijklmnopqrstuvwxyz",
	HEXADECIMAL: "0123456789ABCDEF",
	ALPHANUMERIC: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
	ALPHANUMERIC_MIXED: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
};

// License key format configuration
// Customize this to change how license keys are generated
//
// EXAMPLES:
//
// Default (4 segments of 4 hex chars):
//   A1B2-C3D4-E5F6-7890
//
// 2 segments of 8 alphanumeric chars:
//   segments: 2, segmentLength: 8, characterSet: CHARACTER_SETS.ALPHANUMERIC
//   Result: X7H9K2M4-P8Q1R5N3
//
// 3 segments of 6 uppercase letters:
//   segments: 3, segmentLength: 6, characterSet: CHARACTER_SETS.UPPERCASE
//   Result: ABCDEF-GHIJKL-MNOPQR
//
// 5 segments of 5 alphanumeric (mixed case):
//   segments: 5, segmentLength: 5, characterSet: CHARACTER_SETS.ALPHANUMERIC_MIXED
//   Result: aB3De-Fg7Hi-Jk9Lm-No1Pq-Rs5Tu
//
// Custom separator (3 segments of 8 numeric):
//   segments: 3, segmentLength: 8, characterSet: CHARACTER_SETS.NUMERIC, separator: "_"
//   Result: 12345678_90123456_78901234
//
// STRICT VALIDATION:
//   strictValidation: false - Any key in the database is valid (allows format changes over time)
//   strictValidation: true  - Only keys matching current format can be redeemed
//
const LICENSE_KEY_CONFIG = {
	segments: 5,                                // Number of random segments
	segmentLength: 5,                           // Characters per segment
	characterSet: CHARACTER_SETS.ALPHANUMERIC,   // Character set to use (see CHARACTER_SETS above)
	includeTierPrefix: false,                   // Whether to include tier prefix (disabled - tier stored separately)
	separator: "-",                             // Separator between segments
	strictValidation: false                     // If true, only keys matching current format are valid. If false, any generated key is valid.
};

module.exports = {
	COMMAND_CONTEXTS,
	LICENSE_TIERS,
	LICENSE_TIER_LEVELS,
	CHARACTER_SETS,
	LICENSE_KEY_CONFIG
};