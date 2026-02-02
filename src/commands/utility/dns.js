const { SlashCommandBuilder } = require("discord.js");
const { promises: dns } = require("node:dns");
const { COMMAND_CONTEXTS, LICENSE_TIERS } = require("../../constants");

/**
 * Record types to query and their resolver functions
 */
const RECORD_TYPES = {
	A: dns.resolve4,
	AAAA: dns.resolve6,
	CNAME: dns.resolveCname,
	MX: dns.resolveMx,
	NS: dns.resolveNs,
	TXT: dns.resolveTxt,
	SRV: dns.resolveSrv,
	SOA: dns.resolveSoa,
	CAA: dns.resolveCaa,
};

/**
 * Formats a DNS record value into a readable string
 * @param {string} type - The record type
 * @param {*} record - The record data
 * @returns {string} Formatted record string
 */
function formatRecord(type, record) {
	if (type === "MX") return `${record.priority} ${record.exchange}`;
	if (type === "SRV") return `${record.priority} ${record.weight} ${record.port} ${record.name}`;
	if (type === "SOA") return `${record.nsname} ${record.hostmaster} (serial: ${record.serial})`;
	if (type === "CAA") return `${record.critical} ${record.tag} "${record.value}"`;
	if (type === "TXT") return record.join(" ");
	return String(record);
}

module.exports = {
	context: COMMAND_CONTEXTS.GLOBAL,
	license: LICENSE_TIERS.FREE,
	cooldown: 5,

	data: new SlashCommandBuilder()
		.setName("dns")
		.setDescription("gets all DNS records for a domain")
		.addStringOption((option) =>
			option
				.setName("domain")
				.setDescription("the domain to look up")
				.setRequired(true)
		),

	async execute(interaction) {
		await interaction.deferReply();

		const domain = interaction.options.getString("domain");

		const results = [];

		for (const [type, resolver] of Object.entries(RECORD_TYPES)) {
			try {
				const records = await resolver(domain);
				const formatted = Array.isArray(records)
					? records.map((r) => formatRecord(type, r))
					: [formatRecord(type, records)];

				results.push({
					name: type,
					value: formatted.map((r) => `\`${r}\``).join("\n"),
					inline: false,
				});
			} catch {
				// record type not found for this domain, skip
			}
		}

		if (results.length === 0) {
			await interaction.editReply(`no DNS records found for \`${domain}\``);
			return;
		}

		await interaction.editReply({
			embeds: [
				{
					color: 0x5865F2,
					title: `DNS records for ${domain}`,
					fields: results,
					timestamp: new Date().toISOString(),
				},
			],
		});
	},
};
