const { REST, Routes } = require("discord.js");

/**
 * Deploys commands to Discord's API
 * @param {Object} options - Deployment options
 * @param {Array} options.globalCommands - Array of global command data objects
 * @param {Array} options.guildCommands - Array of guild-specific command data objects
 * @param {string} options.token - Discord bot token
 * @param {string} options.clientId - Discord application/client ID
 * @param {string} options.guildId - Guild ID for guild-specific commands
 * @returns {Promise<Object>} Object containing deployed global and guild commands
 */
async function deployCommands({ globalCommands = [], guildCommands = [], token, clientId, guildId }) {
	if (!token) {
		throw new Error("DISCORD_TOKEN is required for command deployment");
	}

	if (!clientId) {
		throw new Error("CLIENT_ID is required for command deployment");
	}

	if (globalCommands.length === 0 && guildCommands.length === 0) {
		throw new Error("No commands to deploy");
	}

	if (guildCommands.length > 0 && !guildId) {
		throw new Error("GUILD_ID is required for deploying guild-specific commands");
	}

	const rest = new REST({ version: "10" }).setToken(token);
	const results = { global: null, guild: null };

	try {
		// Deploy global commands
		if (globalCommands.length > 0) {
			console.log(`[DEPLOY] Registering ${globalCommands.length} global application (/) command(s)...`);

			// Automatically set integration types and contexts for global commands
			const processedGlobalCommands = globalCommands.map(cmd => ({
				...cmd,
				integration_types: [0, 1], // 0 = GuildInstall, 1 = UserInstall
				contexts: [0, 1, 2], // 0 = Guild, 1 = BotDM, 2 = PrivateChannel
				dm_permission: true,
			}));

			const globalData = await rest.put(
				Routes.applicationCommands(clientId),
				{ body: processedGlobalCommands },
			);

			console.log(`[SUCCESS] Successfully registered ${globalData.length} global command(s)`);
			console.log("[INFO] Global commands:", globalData.map(cmd => cmd.name).join(", "));
			results.global = globalData;
		}

		// Deploy guild-specific commands
		if (guildCommands.length > 0) {
			console.log(`[DEPLOY] Registering ${guildCommands.length} guild-specific command(s) to guild ${guildId}...`);

			const guildData = await rest.put(
				Routes.applicationGuildCommands(clientId, guildId),
				{ body: guildCommands },
			);

			console.log(`[SUCCESS] Successfully registered ${guildData.length} guild-specific command(s)`);
			console.log("[INFO] Guild commands:", guildData.map(cmd => cmd.name).join(", "));
			results.guild = guildData;
		}

		return results;
	} catch (error) {
		console.error("[ERROR] Failed to register commands:", error);

		if (error.code === 50001) {
			console.error("[HINT] Error 50001: Missing Access. Make sure your bot token is correct.");
		} else if (error.code === 10002) {
			console.error("[HINT] Error 10002: Unknown Application. Make sure your CLIENT_ID is correct.");
		} else if (error.code === 50035) {
			console.error("[HINT] Error 50035: Invalid Form Body. Check your command definitions.");
		} else if (error.rawError) {
			console.error("[DETAILS]", JSON.stringify(error.rawError, null, 2));
		}

		throw error;
	}
}

module.exports = { deployCommands };