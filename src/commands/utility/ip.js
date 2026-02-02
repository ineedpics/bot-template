const { SlashCommandBuilder } = require("discord.js");
const { COMMAND_CONTEXTS, LICENSE_TIERS } = require("../../constants");

/**
 * Validates that a string is a valid IPv4 address
 */
function isValidIPv4(ip) {
	const parts = ip.split(".");
	if (parts.length !== 4) return false;
	return parts.every((part) => {
		if (!/^\d{1,3}$/.test(part)) return false;
		const num = Number(part);
		return num >= 0 && num <= 255;
	});
}

/**
 * Checks whether an IPv4 address is publicly routable (not private/reserved)
 */
function isPublicIP(ip) {
	const [a, b, c, d] = ip.split(".").map(Number);

	// 0.0.0.0/8 - current network
	if (a === 0) return false;
	// 10.0.0.0/8 - private
	if (a === 10) return false;
	// 100.64.0.0/10 - carrier-grade NAT
	if (a === 100 && b >= 64 && b <= 127) return false;
	// 127.0.0.0/8 - loopback
	if (a === 127) return false;
	// 169.254.0.0/16 - link-local
	if (a === 169 && b === 254) return false;
	// 172.16.0.0/12 - private
	if (a === 172 && b >= 16 && b <= 31) return false;
	// 192.0.0.0/24 - IETF protocol assignments
	if (a === 192 && b === 0 && c === 0) return false;
	// 192.0.2.0/24 - TEST-NET-1
	if (a === 192 && b === 0 && c === 2) return false;
	// 192.88.99.0/24 - 6to4 relay anycast
	if (a === 192 && b === 88 && c === 99) return false;
	// 192.168.0.0/16 - private
	if (a === 192 && b === 168) return false;
	// 198.18.0.0/15 - benchmarking
	if (a === 198 && (b === 18 || b === 19)) return false;
	// 198.51.100.0/24 - TEST-NET-2
	if (a === 198 && b === 51 && c === 100) return false;
	// 203.0.113.0/24 - TEST-NET-3
	if (a === 203 && b === 0 && c === 113) return false;
	// 224.0.0.0/4 - multicast
	if (a >= 224 && a <= 239) return false;
	// 240.0.0.0/4 - reserved for future use
	if (a >= 240) return false;

	return true;
}

module.exports = {
	context: COMMAND_CONTEXTS.GLOBAL,
	license: LICENSE_TIERS.FREE,
	cooldown: 5,

	data: new SlashCommandBuilder()
		.setName("ip")
		.setDescription("gets information about an IPv4 address")
		.addStringOption((option) =>
			option
				.setName("address")
				.setDescription("the IPv4 address to look up")
				.setRequired(true)
		),

	async execute(interaction) {
		const address = interaction.options.getString("address").trim();

		if (!isValidIPv4(address)) {
			await interaction.reply({
				content: "that's not a valid IPv4 address.",
				ephemeral: true,
			});
			return;
		}

		if (!isPublicIP(address)) {
			await interaction.reply({
				content: "that IP address is not publicly routable.",
				ephemeral: true,
			});
			return;
		}

		await interaction.deferReply();

		try {
			const res = await fetch(`https://api.ipapi.is/?q=${address}`);

			if (!res.ok) {
				await interaction.editReply(`failed to look up \`${address}\` (HTTP ${res.status})`);
				return;
			}

			const data = await res.json();
			const loc = data.location || {};
			const asn = data.asn || {};
			const company = data.company || {};

			const flags = [
				data.is_datacenter && "Datacenter",
				data.is_vpn && "VPN",
				data.is_proxy && "Proxy",
				data.is_tor && "Tor",
				data.is_crawler && "Crawler",
				data.is_mobile && "Mobile",
				data.is_satellite && "Satellite",
				data.is_abuser && "Abuser",
			].filter(Boolean);

			const fields = [
				asn.asn && { name: "ASN", value: `AS${asn.asn}`, inline: true },
				asn.org && { name: "Organization", value: asn.org, inline: true },
				company.name && { name: "Company", value: company.name, inline: true },
				asn.route && { name: "Route", value: `\`${asn.route}\``, inline: true },
				company.domain && { name: "Domain", value: company.domain, inline: true },
				company.type && { name: "Type", value: company.type, inline: true },
				loc.country && { name: "Country", value: `${loc.country} (${loc.country_code})`, inline: true },
				loc.state && { name: "Region", value: loc.state, inline: true },
				loc.city && { name: "City", value: loc.city, inline: true },
				loc.zip && { name: "Postal", value: loc.zip, inline: true },
				loc.latitude && { name: "Location", value: `\`${loc.latitude}, ${loc.longitude}\``, inline: true },
				loc.timezone && { name: "Timezone", value: loc.timezone, inline: true },
				{ name: "Flags", value: flags.length > 0 ? flags.join(", ") : "None", inline: false },
			].filter(Boolean);

			await interaction.editReply({
				embeds: [
					{
						color: 0x5865f2,
						title: `IP info for ${address}`,
						fields,
						timestamp: new Date().toISOString(),
					},
				],
			});
		} catch {
			await interaction.editReply(`failed to look up \`${address}\``);
		}
	},
};
