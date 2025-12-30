require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");

const { COMMAND_CONTEXTS, LICENSE_TIERS } = require("./constants");
const { deployCommands } = require("./utils/deployCommands");
const { getUserLicense, setUserLicense, canUseCommand } = require("./utils/licenseManager");

// Create a new client instance
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	],
});

client.commands = new Collection();
client.cooldowns = new Collection();

/**
 * Loads commands from the commands folder
 * @param {boolean} deploy - Whether to deploy commands to Discord API
 * @returns {Promise<Array>} Array of loaded commands
 */
async function loadCommands(deploy = false) {
	const commandsLoaded = [];
	const commandsPath = path.join(__dirname, "commands");

	if (!fs.existsSync(commandsPath)) {
		console.error("[ERROR] Commands folder does not exist!");
		return commandsLoaded;
	}

	const commandFolders = fs.readdirSync(commandsPath);

	for (const folder of commandFolders) {
		const folderPath = path.join(commandsPath, folder);

		if (!fs.statSync(folderPath).isDirectory()) continue;

		const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith(".js"));

		for (const file of commandFiles) {
			const filePath = path.join(folderPath, file);

			try {
				delete require.cache[require.resolve(filePath)];

				const command = require(filePath);

				if (!command.data || !command.execute) {
					console.warn(`[WARNING] Command at ${filePath} is missing required "data" or "execute" property.`);
					continue;
				}

				client.commands.set(command.data.name, command);
				commandsLoaded.push({
					name: command.data.name,
					path: `${folder}/${file}`,
					context: command.context || COMMAND_CONTEXTS.GLOBAL
				});
				console.log(`[LOAD] Loaded command: ${command.data.name} from ${folder}/${file} (${command.context || COMMAND_CONTEXTS.GLOBAL})`);
			} catch (error) {
				console.error(`[ERROR] Failed to load command at ${filePath}:`, error);
			}
		}
	}

	// Deploy commands to Discord if requested
	if (deploy && commandsLoaded.length > 0) {
		try {
			// Separate commands by context
			const globalCommands = [];
			const guildCommands = [];

			for (const command of client.commands.values()) {
				const commandData = command.data.toJSON();

				if (command.context === COMMAND_CONTEXTS.OWNER_ONLY) {
					guildCommands.push(commandData);
				} else {
					globalCommands.push(commandData);
				}
			}

			await deployCommands({
				globalCommands,
				guildCommands,
				token: process.env.DISCORD_TOKEN,
				clientId: process.env.CLIENT_ID,
				guildId: process.env.GUILD_ID
			});
		} catch (error) {
			console.error("[ERROR] Failed to deploy commands during load:", error);
			throw error;
		}
	}

	return commandsLoaded;
}

console.log("[INIT] Loading commands...");
loadCommands().then(() => {
	console.log(`[INIT] Loaded ${client.commands.size} command(s)`);
}).catch(error => {
	console.error("[ERROR] Failed to load commands on startup:", error);
});

client.loadCommands = loadCommands;

client.once("ready", () => {
	console.log(`[READY] Logged in as ${client.user.tag}`);
	console.log(`[READY] Bot is ready and serving ${client.guilds.cache.size} guild(s)`);
	console.log(`[READY] Invite link: https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=0&scope=bot%20applications.commands`);
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	// Auto-generate FREE license for new users
	let userLicense = getUserLicense(interaction.user.id);
	if (!userLicense) {
		console.log(`[LICENSE] Auto-generating FREE license for new user ${interaction.user.tag} (${interaction.user.id})`);
		userLicense = setUserLicense(interaction.user.id, LICENSE_TIERS.FREE);
	}

	const command = client.commands.get(interaction.commandName);

	if (!command) {
		console.warn(`[WARNING] No command matching ${interaction.commandName} was found.`);
		return;
	}

	// Owner-only commands bypass license checks
	if (command.context === COMMAND_CONTEXTS.OWNER_ONLY && interaction.user.id != process.env.OWNER_ID) {
		return interaction.reply({
			content: "This command is only available to Nexus owners.",
			ephemeral: true
		});
	}

	// Check license level for non-owner commands
	if (command.context !== COMMAND_CONTEXTS.OWNER_ONLY && !(command.data.name === "redeem" || command.data.name === "license")) {
		const requiredTier = command.license || LICENSE_TIERS.FREE;
		const licenseCheck = canUseCommand(interaction.user.id, requiredTier);

		if (!licenseCheck.allowed) {
			console.log(`[LICENSE] ${interaction.user.tag} denied access to /${command.data.name}: ${licenseCheck.reason}`);
			return interaction.reply({
				content: licenseCheck.reason,
				ephemeral: true
			});
		}
	}

	const { cooldowns } = client;

	if (!cooldowns.has(command.data.name)) {
		cooldowns.set(command.data.name, new Collection());
	}

	const now = Date.now();
	const timestamps = cooldowns.get(command.data.name);
	const cooldownAmount = command.context === COMMAND_CONTEXTS.OWNER_ONLY ? 0 : (command.cooldown ?? 3) * 1000; // Default 3 seconds, unless owner-only command

	if (timestamps.has(interaction.user.id)) {
		const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			console.log(`[COOLDOWN] ${interaction.user.tag} tried to use ${command.data.name} but is on cooldown for ${timeLeft.toFixed(1)}s more`);

			return interaction.reply({
				content: `Please wait ${timeLeft.toFixed(1)} more second(s) before using \`/${command.data.name}\` again.`,
				ephemeral: true,
			});
		}
	}

	timestamps.set(interaction.user.id, now);
	setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

	try {
		console.log(`[COMMAND] ${interaction.user.tag} (${interaction.user.id}) used /${command.data.name} in ${interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : "DM"}`);
		await command.execute(interaction);
	} catch (error) {
		console.error(`[ERROR] Error executing command ${command.data.name}:`, error);

		const errorMessage = {
			content: interaction.user.id === process.env.OWNER_ID ? `There was an error while executing that command: ${error}` : "There was an error while executing that command.",
			ephemeral: true,
		};

		if (interaction.replied || interaction.deferred) {
			await interaction.followUp(errorMessage).catch(err => {
				console.error("[ERROR] Failed to send error follow-up:", err);
			});
		} else {
			await interaction.reply(errorMessage).catch(err => {
				console.error("[ERROR] Failed to send error reply:", err);
			});
		}
	}
});

client.on("error", (error) => {
	console.error("[CLIENT ERROR]", error);
});

client.on("warn", (warning) => {
	console.warn("[CLIENT WARNING]", warning);
});

process.on("unhandledRejection", (error) => {
	console.error("[UNHANDLED REJECTION]", error);
});

process.on("uncaughtException", (error) => {
	console.error("[UNCAUGHT EXCEPTION]", error);
	process.exit(1);
});

process.on("SIGINT", () => {
	console.log("[SHUTDOWN] Received SIGINT, shutting down gracefully...");
	client.destroy();
	process.exit(0);
});

process.on("SIGTERM", () => {
	console.log("[SHUTDOWN] Received SIGTERM, shutting down gracefully...");
	client.destroy();
	process.exit(0);
});

client.login(process.env.DISCORD_TOKEN).catch((error) => {
	console.error("[ERROR] Failed to login:", error);
	process.exit(1);
});
