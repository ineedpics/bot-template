const { generateMultipleLicenseKeys } = require("../../../utils/licenseManager");

module.exports = {
	async execute(interaction) {
		const tier = interaction.options.getString("tier");
		const count = interaction.options.getInteger("count");

		await interaction.deferReply({ ephemeral: true });

		const keys = generateMultipleLicenseKeys(tier, count);

		const keysText = keys.map((key, index) => `${index + 1}. \`${key}\``).join("\n");

		// If the message would be too long, send as a file
		if (keysText.length > 1900) {
			const buffer = Buffer.from(keys.join("\n"), "utf-8");

			await interaction.editReply({
				content: `**Generated ${count} ${tier} License Keys**\n\nKeys are attached as a text file.`,
				files: [{
					attachment: buffer,
					name: `${tier}_keys_${Date.now()}.txt`
				}]
			});
		} else {
			await interaction.editReply({
				content: `**Generated ${count} ${tier} License Keys:**\n\n${keysText}\n\n` +
						 `These keys can be redeemed by users to activate their licenses.`
			});
		}

		console.log(`[LICENSE] ${interaction.user.tag} generated ${count} ${tier} license keys`);
	}
};
