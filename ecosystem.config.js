module.exports = {
	apps: [
		{
			name: "discord-bot-template",
			script: "./src/index.js",
			instances: 1,
			autorestart: true,
			watch: false,
			max_memory_restart: "500M",
			env: {
				NODE_ENV: "production",
			},
			error_file: "./logs/error.log",
			out_file: "./logs/out.log",
			log_file: "./logs/combined.log",
			time: true,
			kill_timeout: 5000,
			wait_ready: false,
			max_restarts: 10,
			min_uptime: "10s",
		},
	],
};
