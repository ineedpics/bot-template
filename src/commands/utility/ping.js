const { SlashCommandBuilder } = require("discord.js");
const { COMMAND_CONTEXTS, LICENSE_TIERS } = require("../../constants");

module.exports = {
	context: COMMAND_CONTEXTS.GLOBAL,
	license: LICENSE_TIERS.FREE,
	cooldown: 5,

	data: new SlashCommandBuilder()
		.setName("ping")
		.setDescription("gets bot latency"),

	async execute(interaction) {
		const sent = await interaction.deferReply({ fetchReply: true });

		const roundTripLatency = sent.createdTimestamp - interaction.createdTimestamp;
		const websocketLatency = interaction.client.ws.ping;

		await interaction.editReply(`pong! (rt: ${roundTripLatency}ms, ws: ${websocketLatency}ms)`);
	},
};