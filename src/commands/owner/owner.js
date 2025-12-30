const { SlashCommandBuilder } = require("discord.js");
const { COMMAND_CONTEXTS, LICENSE_TIERS } = require("../../constants");

// Import subcommand handlers
const reloadHandler = require("./subcommands/reload");
const revokeHandler = require("./subcommands/revoke");
const unrevokeHandler = require("./subcommands/unrevoke");
const keygenHandler = require("./subcommands/keygen");
const masskeygenHandler = require("./subcommands/masskeygen");

module.exports = {
	context: COMMAND_CONTEXTS.OWNER_ONLY,

	data: new SlashCommandBuilder()
		.setName("owner")
		.setDescription("Owner-only commands")
		.addSubcommand(subcommand =>
			subcommand
				.setName("reload")
				.setDescription("Reloads all bot commands and restarts")
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName("revoke")
				.setDescription("Revoke a user's license")
				.addUserOption(option =>
					option
						.setName("user")
						.setDescription("The user to revoke")
						.setRequired(true)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName("unrevoke")
				.setDescription("Un-revoke a user's license")
				.addUserOption(option =>
					option
						.setName("user")
						.setDescription("The user to un-revoke")
						.setRequired(true)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName("keygen")
				.setDescription("Generate a single license key")
				.addStringOption(option =>
					option
						.setName("tier")
						.setDescription("License tier")
						.setRequired(true)
						.addChoices(
							{ name: "FREE", value: LICENSE_TIERS.FREE },
							{ name: "BASIC", value: LICENSE_TIERS.BASIC },
							{ name: "PRO", value: LICENSE_TIERS.PRO }
						)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName("masskeygen")
				.setDescription("Generate multiple license keys")
				.addStringOption(option =>
					option
						.setName("tier")
						.setDescription("License tier")
						.setRequired(true)
						.addChoices(
							{ name: "FREE", value: LICENSE_TIERS.FREE },
							{ name: "BASIC", value: LICENSE_TIERS.BASIC },
							{ name: "PRO", value: LICENSE_TIERS.PRO }
						)
				)
				.addIntegerOption(option =>
					option
						.setName("count")
						.setDescription("Number of keys to generate")
						.setRequired(true)
						.setMinValue(1)
						.setMaxValue(50)
				)
		),

	async execute(interaction) {
		const subcommand = interaction.options.getSubcommand();

		switch (subcommand) {
			case "reload":
				await reloadHandler.execute(interaction);
				break;
			case "revoke":
				await revokeHandler.execute(interaction);
				break;
			case "unrevoke":
				await unrevokeHandler.execute(interaction);
				break;
			case "keygen":
				await keygenHandler.execute(interaction);
				break;
			case "masskeygen":
				await masskeygenHandler.execute(interaction);
				break;
			default:
				await interaction.reply({
					content: "Unknown subcommand.",
					ephemeral: true
				});
		}
	},
};
