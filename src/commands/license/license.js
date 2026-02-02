const { SlashCommandBuilder } = require("discord.js");
const { COMMAND_CONTEXTS, LICENSE_TIERS } = require("../../constants");
const { getUserLicense } = require("../../utils/licenseManager");

module.exports = {
	context: COMMAND_CONTEXTS.GLOBAL,
	license: LICENSE_TIERS.FREE,
	cooldown: 5,

	data: new SlashCommandBuilder()
		.setName("license")
		.setDescription("Check your license status")
		.addUserOption(option =>
			option
				.setName("user")
				.setDescription("Check another user's license (Owner only)")
				.setRequired(false)
		),

	async execute(interaction) {
		const targetUser = interaction.options.getUser("user");
		const isOwner = interaction.user.id === process.env.OWNER_ID;

		// If a user was specified but executor is not owner, deny
		if (targetUser && !isOwner) {
			return interaction.reply({
				content: "only the bot owner can check other users' licenses.",
				ephemeral: true
			});
		}

		// Determine which user's license to check
		const userToCheck = targetUser || interaction.user;
		const license = getUserLicense(userToCheck.id);

		if (!license) {
			return interaction.reply({
				content: targetUser
					? `user ${targetUser.tag} does not have a license.`
					: "no license found. this shouldn't happen! please contact support.",
				ephemeral: true
			});
		}

		const statusEmoji = license.revoked ? "🔴" : "🟢";
		const status = license.revoked ? "Revoked" : "Active";

		const embed = {
			color: license.revoked ? 0xFF0000 : (license.tier === LICENSE_TIERS.PRO ? 0xFFD700 : license.tier === LICENSE_TIERS.BASIC ? 0x00FF00 : 0x808080),
			title: `${statusEmoji} License Status${targetUser ? ` - ${userToCheck.tag}` : ""}`,
			fields: [
				{
					name: "License Tier",
					value: `\`${license.tier}\``,
					inline: true
				},
				{
					name: "Status",
					value: `\`${status}\``,
					inline: true
				},
				{
					name: "License Key",
					value: `||\`${license.licenseKey}\`||`,
					inline: false
				},
				{
					name: "Created",
					value: `<t:${Math.floor(new Date(license.createdAt).getTime() / 1000)}:R>`,
					inline: true
				},
				{
					name: "Activated",
					value: `<t:${Math.floor(new Date(license.activatedAt).getTime() / 1000)}:R>`,
					inline: true
				}
			],
			footer: {
				text: `User ID: ${userToCheck.id}`
			},
			timestamp: new Date().toISOString()
		};

		// Add old licenses if they exist
		if (license.oldLicenses && license.oldLicenses.length > 0) {
			embed.fields.push({
				name: "Previous Licenses",
				value: license.oldLicenses.map(key => `||\`${key}\`||`).join("\n"),
				inline: false
			});
		}

		await interaction.reply({ embeds: [embed], ephemeral: true });
	},
};
