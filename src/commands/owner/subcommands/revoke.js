const { revokeLicense, getUserLicense } = require("../../../utils/licenseManager");
const { LICENSE_TIERS } = require("../../../constants");

module.exports = {
	async execute(interaction) {
		const targetUser = interaction.options.getUser("user");
		const license = getUserLicense(targetUser.id);

		if (!license) {
			return interaction.reply({
				content: `user \`${targetUser.tag}\` does not have a license.`,
				ephemeral: true
			});
		}

		const previousTier = license.tier;
		const success = revokeLicense(targetUser.id);

		if (!success) {
			return interaction.reply({
				content: `failed to revoke license for \`${targetUser.tag}\`.`,
				ephemeral: true
			});
		}

		let message;
		if (previousTier === LICENSE_TIERS.FREE) {
			message = `**revoked \`${targetUser.tag}\`'s FREE license.**\n\n`;
		} else {
			message = `**revoked \`${targetUser.tag}\`'s ${previousTier} license.**\n\n` +
					  `they have been downgraded to **FREE** tier.`;
		}

		await interaction.reply({
			content: message,
			ephemeral: true
		});

		console.log(`[LICENSE] ${interaction.user.tag} revoked ${targetUser.tag}'s license (was ${previousTier})`);
	}
};
