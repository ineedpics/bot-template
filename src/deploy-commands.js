require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { deployCommands } = require("./utils/deployCommands");
const { COMMAND_CONTEXTS } = require("./constants");

const globalCommands = [];
const guildCommands = [];
const commandsPath = path.join(__dirname, "commands");

console.log("[DEPLOY] Starting command deployment...");

// Check if commands folder exists
if (!fs.existsSync(commandsPath)) {
	console.error("[ERROR] Commands folder does not exist!");
	process.exit(1);
}

// Get all subdirectories in the commands folder
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
	const folderPath = path.join(commandsPath, folder);

	// Skip if not a directory
	if (!fs.statSync(folderPath).isDirectory()) continue;

	// Get all .js files in the subfolder
	const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith(".js"));

	for (const file of commandFiles) {
		const filePath = path.join(folderPath, file);

		try {
			const command = require(filePath);

			// Validate command structure
			if (!command.data) {
				console.warn(`[WARNING] Command at ${filePath} is missing required "data" property. Skipping.`);
				continue;
			}

			const commandData = command.data.toJSON();
			const context = command.context || COMMAND_CONTEXTS.GLOBAL;

			// Separate commands by context
			if (context === COMMAND_CONTEXTS.OWNER_ONLY) {
				guildCommands.push(commandData);
				console.log(`[LOAD] Loaded guild command: ${command.data.name} from ${folder}/${file}`);
			} else {
				globalCommands.push(commandData);
				console.log(`[LOAD] Loaded global command: ${command.data.name} from ${folder}/${file}`);
			}
		} catch (error) {
			console.error(`[ERROR] Failed to load command at ${filePath}:`, error);
		}
	}
}

console.log(`[DEPLOY] Loaded ${globalCommands.length} global and ${guildCommands.length} guild-specific command(s)`);

// Validate environment variables
if (!process.env.DISCORD_TOKEN) {
	console.error("[ERROR] DISCORD_TOKEN is not defined in .env file!");
	process.exit(1);
}

if (!process.env.CLIENT_ID) {
	console.error("[ERROR] CLIENT_ID is not defined in .env file!");
	process.exit(1);
}

if (guildCommands.length > 0 && !process.env.GUILD_ID) {
	console.error("[ERROR] GUILD_ID is required in .env file for guild-specific commands!");
	process.exit(1);
}

// Deploy commands using the shared utility
(async () => {
	try {
		await deployCommands({
			globalCommands,
			guildCommands,
			token: process.env.DISCORD_TOKEN,
			clientId: process.env.CLIENT_ID,
			guildId: process.env.GUILD_ID
		});
		console.log("[INFO] Note: Global commands may take up to 1 hour to appear in all servers.");
		console.log("[INFO] Guild-specific commands appear instantly in the specified guild.");
	} catch (error) {
		process.exit(1);
	}
})();
