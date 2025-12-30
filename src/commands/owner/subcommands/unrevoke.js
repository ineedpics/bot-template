const { unrevokeLicense, getUserLicense } = require("../../../utils/licenseManager");

module.exports = {
	async execute(interaction) {
		const targetUser = interaction.options.getUser("user");
		const license = getUserLicense(targetUser.id);

		if (!license) {
			return interaction.reply({
				content: `User ${targetUser.tag} does not have a license.`,
				ephemeral: true
			});
		}

		if (!license.revoked) {
			return interaction.reply({
				content: `User ${targetUser.tag}'s license is not revoked.`,
				ephemeral: true
			});
		}

		const success = unrevokeLicense(targetUser.id);

		if (!success) {
			return interaction.reply({
				content: `Failed to un-revoke license for ${targetUser.tag}.`,
				ephemeral: true
			});
		}

		await interaction.reply({
			content: `**Un-revoked ${targetUser.tag}'s license.**\n\n` +
					 `They can now use the bot again with their ${license.tier} license.`,
			ephemeral: true
		});

		console.log(`[LICENSE] ${interaction.user.tag} un-revoked ${targetUser.tag}'s license`);
	}
};
