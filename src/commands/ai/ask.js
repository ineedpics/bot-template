const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { COMMAND_CONTEXTS, LICENSE_TIERS } = require("../../constants");
const { fetchModels } = require("../../utils/models");
const { setLastCommand } = require("../../utils/lastCommand");

module.exports = {
	context: COMMAND_CONTEXTS.GLOBAL,
	license: LICENSE_TIERS.BASIC,
	cooldown: 5,

	data: new SlashCommandBuilder()
		.setName("ask")
		.setDescription("ask an AI a question")
		.addStringOption((option) =>
			option
				.setName("prompt")
				.setDescription("the question or prompt to send")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("model")
				.setDescription("the model to use (default: google/gemini-2.5-flash)")
				.setAutocomplete(true)
				.setRequired(false)
		),

	async autocomplete(interaction) {
		const focused = interaction.options.getFocused();
		const models = await fetchModels();
		const filtered = models
			.filter((m) => m.name.toLowerCase().includes(focused.toLowerCase()))
			.slice(0, 25);
		await interaction.respond(filtered);
	},

	async execute(interaction) {
		const prompt = interaction.options.getString("prompt");
		const model = interaction.options.getString("model") || "google/gemini-2.5-flash";

		if (!process.env.HACKCLUB_AI_KEY) {
			await interaction.reply({
				content: "the AI API key is not configured.",
				ephemeral: true,
			});
			return;
		}

		await interaction.deferReply();
		setLastCommand(interaction.user.id, { command: "ask", params: { prompt, model } });

		try {
			const res = await fetch("https://ai.hackclub.com/proxy/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${process.env.HACKCLUB_AI_KEY}`,
				},
				body: JSON.stringify({
					model,
					messages: [{ role: "user", content: prompt }],
					stream: true,
				}),
			});

			if (!res.ok) {
				const text = await res.text();
				await interaction.editReply(`API request failed (HTTP ${res.status}): ${text.slice(0, 200)}`);
				return;
			}

			let content = "";
			let lastEdit = 0;
			const EDIT_INTERVAL = 500;
			const MAX_LENGTH = 2000;

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop();

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed.startsWith("data: ")) continue;
					const payload = trimmed.slice(6);
					if (payload === "[DONE]") continue;

					try {
						const chunk = JSON.parse(payload);
						const delta = chunk.choices?.[0]?.delta?.content;
						if (delta) content += delta;
					} catch {
						// ignore malformed chunks
					}
				}

				const now = Date.now();
				if (content && now - lastEdit >= EDIT_INTERVAL) {
					if (content.length > MAX_LENGTH) {
						await interaction.editReply("response exceeds character limit; the full response will be returned as an attachment once it's done.");
						lastEdit = Infinity;
					} else {
						await interaction.editReply(content + " ▍");
						lastEdit = now;
					}
				}
			}

			if (!content) {
				await interaction.editReply("the API returned an empty response.");
				return;
			}

			if (content.length > MAX_LENGTH) {
				const attachment = new AttachmentBuilder(Buffer.from(content, "utf-8"), {
					name: "response.txt",
				});
				await interaction.editReply({
					content: "response exceeds character limit; returned as an attachment",
					files: [attachment],
				});
			} else {
				await interaction.editReply(content);
			}
		} catch {
			await interaction.editReply("failed to get a response from the AI.");
		}
	},
};
