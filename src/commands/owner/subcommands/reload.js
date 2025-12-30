module.exports = {
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });

		try {
			const previousCount = interaction.client.commands.size;
			interaction.client.commands.clear();

			// Reload commands and deploy to Discord
			const commandsLoaded = await interaction.client.loadCommands(true);

			const response = [
				`Previous: ${previousCount} command(s)`,
				`Current: ${interaction.client.commands.size} command(s)`,
				"",
				"Loaded Commands:",
				...commandsLoaded.map(cmd => `\`${cmd.name}\` from \`${cmd.path}\``),
				"",
				"Reloading bot..."
			];

			await interaction.editReply({
				content: response.join("\n"),
			});

			console.log(`[RELOAD] ${interaction.user.tag} reloaded ${commandsLoaded.length} command(s)`);

			process.exit(0);
		} catch (error) {
			console.error("[ERROR] Failed to reload commands:", error);

			await interaction.editReply({
				content: `**Error reloading commands:**\n\`\`\`${error.message}\`\`\``,
			});
		}
	}
};
