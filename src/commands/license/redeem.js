const { SlashCommandBuilder } = require("discord.js");
const { COMMAND_CONTEXTS, LICENSE_TIERS } = require("../../constants");
const { redeemLicenseKey } = require("../../utils/licenseManager");

module.exports = {
	context: COMMAND_CONTEXTS.GLOBAL,
	license: LICENSE_TIERS.FREE,
	cooldown: 10,

	data: new SlashCommandBuilder()
		.setName("redeem")
		.setDescription("Redeem a license key to upgrade your account")
		.addStringOption(option =>
			option
				.setName("key")
				.setDescription("The license key to redeem")
				.setRequired(true)
		),

	async execute(interaction) {
		const key = interaction.options.getString("key");

		await interaction.deferReply({ ephemeral: true });

		const result = redeemLicenseKey(interaction.user.id, key);

		if (!result.success) {
			return interaction.editReply({
				content: `❌ **Failed to redeem license key:**\n${result.message}`,
			});
		}

		const embed = {
			color: result.tier === LICENSE_TIERS.PRO ? 0xFFD700 : (result.tier === LICENSE_TIERS.BASIC ? 0x00FF00 : 0x808080),
			title: "✅ License Key Redeemed!",
			description: result.message,
			fields: [
				{
					name: "Your New License Tier",
					value: `\`${result.tier}\``,
					inline: true
				},
				{
					name: "License Key",
					value: `||\`${key}\`||`,
					inline: false
				}
			],
			footer: {
				text: `Use /license to view your license details`
			},
			timestamp: new Date().toISOString()
		};

		await interaction.editReply({ embeds: [embed] });

		console.log(`[LICENSE] ${interaction.user.tag} redeemed ${result.tier} license key: ${key}`);
	},
};
