const { SlashCommandBuilder } = require("discord.js");
const { COMMAND_CONTEXTS, LICENSE_TIERS } = require("../../constants");
const { toggleHidden } = require("../../utils/hiddenUsers");

module.exports = {
	context: COMMAND_CONTEXTS.GLOBAL,
	license: LICENSE_TIERS.FREE,
	cooldown: 3,

	data: new SlashCommandBuilder()
		.setName("hide")
		.setDescription("toggle whether your command responses are hidden (ephemeral)"),

	async execute(interaction) {
		const nowHidden = toggleHidden(interaction.user.id);
		await interaction.reply({
			content: nowHidden
				? "your commands will now be hidden (only visible to you)."
				: "your commands are now visible to everyone again.",
			ephemeral: true,
		});
	},
};
