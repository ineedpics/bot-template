const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { COMMAND_CONTEXTS, LICENSE_TIERS } = require("../../constants");
const { getLastCommand } = require("../../utils/lastCommand");
const { histories } = require("./conversation");

module.exports = {
	context: COMMAND_CONTEXTS.GLOBAL,
	license: LICENSE_TIERS.FREE,
	cooldown: 5,

	data: new SlashCommandBuilder()
		.setName("regenerate")
		.setDescription("retry the last AI command you ran"),

	async execute(interaction) {
		const last = getLastCommand(interaction.user.id);

		if (!last) {
			await interaction.reply({
				content: "no previous AI command to regenerate.",
				ephemeral: true,
			});
			return;
		}

		if (!process.env.HACKCLUB_AI_KEY) {
			await interaction.reply({
				content: "the AI API key is not configured.",
				ephemeral: true,
			});
			return;
		}

		await interaction.deferReply();

		try {
			if (last.command === "ask") {
				await regenerateAsk(interaction, last.params);
			} else if (last.command === "conversation") {
				await regenerateConversation(interaction, last.params);
			} else if (last.command === "imagine") {
				await regenerateImagine(interaction, last.params);
			} else {
				await interaction.editReply("unknown command type stored; cannot regenerate.");
			}
		} catch {
			await interaction.editReply("failed to regenerate the response.");
		}
	},
};

async function regenerateAsk(interaction, { prompt, model }) {
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

	const content = await streamResponse(res, interaction, 500);

	if (!content) {
		await interaction.editReply("the API returned an empty response.");
		return;
	}

	await sendFinalResponse(interaction, content);
}

async function regenerateConversation(interaction, { message, model }) {
	const userId = interaction.user.id;

	if (!histories.has(userId)) {
		histories.set(userId, []);
	}

	const history = histories.get(userId);

	// Pop last assistant reply if present so we can regenerate it
	if (history.length > 0 && history[history.length - 1].role === "assistant") {
		history.pop();
	}

	// Ensure the last user message is still there; if not, re-add it
	if (history.length === 0 || history[history.length - 1].content !== message) {
		history.push({ role: "user", content: message });
	}

	const res = await fetch("https://ai.hackclub.com/proxy/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${process.env.HACKCLUB_AI_KEY}`,
		},
		body: JSON.stringify({
			model,
			messages: history,
			stream: true,
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		await interaction.editReply(`API request failed (HTTP ${res.status}): ${text.slice(0, 200)}`);
		return;
	}

	const content = await streamResponse(res, interaction, 1000);

	if (!content) {
		await interaction.editReply("the API returned an empty response.");
		return;
	}

	history.push({ role: "assistant", content });
	await sendFinalResponse(interaction, content);
}

async function regenerateImagine(interaction, { prompt, aspectRatio }) {
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
}

async function streamResponse(res, interaction, editInterval) {
	let content = "";
	let lastEdit = 0;
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
		if (content && now - lastEdit >= editInterval) {
			if (content.length > MAX_LENGTH) {
				await interaction.editReply("response exceeds character limit; the full response will be returned as an attachment once it's done.");
				lastEdit = Infinity;
			} else {
				await interaction.editReply(content + " ▍");
				lastEdit = now;
			}
		}
	}

	return content;
}

async function sendFinalResponse(interaction, content) {
	const MAX_LENGTH = 2000;

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
}
