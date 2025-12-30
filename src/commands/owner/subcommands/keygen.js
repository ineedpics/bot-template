const { generateLicenseKey } = require("../../../utils/licenseManager");

module.exports = {
	async execute(interaction) {
		const tier = interaction.options.getString("tier");
		const key = generateLicenseKey(tier);

		await interaction.reply({
			content: `**Generated ${tier} License Key:**\n\n||\`${key}\`||` +
					 `\n\nThis key can be redeemed by a user to activate their license.`,
			ephemeral: true
		});

		console.log(`[LICENSE] ${interaction.user.tag} generated a ${tier} license key: ${key}`);
	}
};
