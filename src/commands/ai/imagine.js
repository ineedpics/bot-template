const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { COMMAND_CONTEXTS, LICENSE_TIERS } = require("../../constants");
const { setLastCommand } = require("../../utils/lastCommand");

module.exports = {
	context: COMMAND_CONTEXTS.GLOBAL,
	license: LICENSE_TIERS.PRO,
	cooldown: 10,

	data: new SlashCommandBuilder()
		.setName("imagine")
		.setDescription("generate an image with AI")
		.addStringOption((option) =>
			option
				.setName("prompt")
				.setDescription("what to generate")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("aspect_ratio")
				.setDescription("aspect ratio of the image (default: 1:1)")
				.addChoices(
					{ name: "1:1", value: "1:1" },
					{ name: "16:9", value: "16:9" },
					{ name: "9:16", value: "9:16" },
					{ name: "4:3", value: "4:3" },
					{ name: "3:4", value: "3:4" },
				)
				.setRequired(false)
		),

	async execute(interaction) {
		if (!process.env.HACKCLUB_AI_KEY) {
			await interaction.reply({
				content: "the AI API key is not configured.",
				ephemeral: true,
			});
			return;
		}

		const prompt = interaction.options.getString("prompt");
		const aspectRatio = interaction.options.getString("aspect_ratio") || "1:1";

		await interaction.deferReply();
		setLastCommand(interaction.user.id, { command: "imagine", params: { prompt, aspectRatio } });

		try {
			const res = await fetch("https://ai.hackclub.com/proxy/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${process.env.HACKCLUB_AI_KEY}`,
				},
				body: JSON.stringify({
					model: "google/gemini-2.5-flash-image",
					messages: [{ role: "user", content: `Generate an image according to this prompt: ${prompt}` }],
					modalities: ["image", "text"],
					image_config: { aspect_ratio: aspectRatio },
					stream: false,
				}),
			});

			if (!res.ok) {
				const text = await res.text();
				await interaction.editReply(`API request failed (HTTP ${res.status}): ${text.slice(0, 200)}`);
				return;
			}

			const data = await res.json();
			const message = data.choices?.[0]?.message;

			if (!message) {
				await interaction.editReply("the API returned an empty response.");
				return;
			}

			const image = message.images?.[0];

			if (!image) {
				await interaction.editReply(message.content || "the API returned no image.");
				return;
			}

			const dataUrl = image.image_url?.url;
			const match = dataUrl?.match(/^data:image\/(\w+);base64,(.+)$/s);

			if (!match) {
				await interaction.editReply("the API returned an unrecognized image format.");
				return;
			}

			const ext = match[1];
			const buffer = Buffer.from(match[2], "base64");
			const attachment = new AttachmentBuilder(buffer, { name: `image.${ext}` });

			await interaction.editReply({
				content: message.content || undefined,
				files: [attachment],
			});
		} catch {
			await interaction.editReply("failed to generate the image.");
		}
	},
};
