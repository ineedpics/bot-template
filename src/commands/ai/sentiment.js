const { ContextMenuCommandBuilder, ApplicationCommandType } = require("discord.js");
const { COMMAND_CONTEXTS, LICENSE_TIERS } = require("../../constants");

const CATEGORY_LABELS = {
	"harassment": "Harassment",
	"harassment/threatening": "Harassment (Threatening)",
	"sexual": "Sexual",
	"hate": "Hate",
	"hate/threatening": "Hate (Threatening)",
	"illicit": "Illicit",
	"illicit/violent": "Illicit (Violent)",
	"self-harm/intent": "Self-Harm (Intent)",
	"self-harm/instructions": "Self-Harm (Instructions)",
	"self-harm": "Self-Harm",
	"sexual/minors": "Sexual (Minors)",
	"violence": "Violence",
	"violence/graphic": "Violence (Graphic)",
};

module.exports = {
	context: COMMAND_CONTEXTS.GLOBAL,
	license: LICENSE_TIERS.FREE,
	cooldown: 10,

	data: new ContextMenuCommandBuilder()
		.setName("Sentiment")
		.setType(ApplicationCommandType.Message),

	async execute(interaction) {
		if (!process.env.HACKCLUB_AI_KEY) {
			await interaction.reply({
				content: "the AI API key is not configured.",
				ephemeral: true,
			});
			return;
		}

		const message = interaction.targetMessage;

		if (!message.content) {
			await interaction.reply({
				content: "that message has no text content to analyze.",
				ephemeral: true,
			});
			return;
		}

		await interaction.deferReply();

		try {
			const res = await fetch("https://ai.hackclub.com/proxy/v1/moderations", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${process.env.HACKCLUB_AI_KEY}`,
				},
				body: JSON.stringify({ input: message.content }),
			});

			if (!res.ok) {
				const text = await res.text();
				await interaction.editReply(`API request failed (HTTP ${res.status}): ${text.slice(0, 200)}`);
				return;
			}

			const data = await res.json();
			const result = data.results?.[0];

			if (!result) {
				await interaction.editReply("the API returned no results.");
				return;
			}

			const flagged = Object.entries(result.categories)
				.filter(([, v]) => v)
				.map(([k]) => CATEGORY_LABELS[k] || k);

			const scores = Object.entries(result.category_scores)
				.sort(([, a], [, b]) => b - a)
				.map(([k, v]) => {
					const pct = (v * 100).toFixed(2);
					const label = CATEGORY_LABELS[k] || k;
					return `${label}: ${pct}%`;
				})
				.join("\n");

			await interaction.editReply({
				embeds: [
					{
						color: result.flagged ? 0xed4245 : 0x57f287,
						title: result.flagged ? "Flagged" : "Not Flagged",
						description: message.content.length > 200
							? message.content.slice(0, 197) + "..."
							: message.content,
						fields: [
							flagged.length > 0 && {
								name: "Flagged Categories",
								value: flagged.join(", "),
								inline: false,
							},
							{
								name: "Scores",
								value: `\`\`\`\n${scores}\n\`\`\``,
								inline: false,
							},
						].filter(Boolean),
						timestamp: new Date().toISOString(),
					},
				],
			});
		} catch {
			await interaction.editReply("failed to analyze the message.");
		}
	},
};
