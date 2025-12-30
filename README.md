# Discord Bot Template

A clean and organized Discord bot template using discord.js v14 with slash commands, command cooldowns, and advanced error handling.

## Features

- Slash commands with support for both guilds and DMs
- Organized command structure with category folders
- Command cooldown system
- Environment variable configuration
- Advanced error handling and logging
- Command reload functionality
- Easy command deployment script

## Prerequisites

- Node.js 16.9.0 or higher
- A Discord bot token (see setup instructions below)

## Setup

### 1. Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" tab and click "Add Bot"
4. Under the bot's username, click "Reset Token" to get your bot token
5. Copy your bot token (you'll need this for the `.env` file)
6. Under "Privileged Gateway Intents", you can enable intents if needed (this template uses minimal intents)
7. Go to the "OAuth2" tab and copy your "Application ID" (this is your CLIENT_ID)

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your values:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   OWNER_ID=your_user_id_here
   GUILD_ID=your_guild_id_here
   ```

   To get your Discord user ID and Guild ID:
   - Enable Developer Mode in Discord (User Settings > App Settings > Advanced > Developer Mode)
   - Right-click your username and select "Copy User ID" for OWNER_ID
   - Right-click your server name and select "Copy Server ID" for GUILD_ID (where owner-only commands will appear)

### 4. Deploy Slash Commands

Before running the bot, you need to register the slash commands with Discord:

```bash
npm run deploy
```

This will register all commands globally. Note that global commands may take up to 1 hour to appear in all servers.

### 5. Run the Bot

#### Option A: Run with Node (Development)

```bash
npm start
```

You should see output indicating the bot has logged in successfully.

#### Option B: Run with PM2 (Production)

For production environments, use PM2 for automatic restarts and process management:

```bash
npm run pm2:start
```

**PM2 Commands:**
- `npm run pm2:start` - Start the bot with PM2
- `npm run pm2:stop` - Stop the bot
- `npm run pm2:restart` - Restart the bot
- `npm run pm2:logs` - View bot logs
- `npm run pm2:delete` - Remove bot from PM2

**Benefits of PM2:**
- Automatic restarts on crashes
- The `/reload` command will fully restart the bot
- Log management in the `logs/` directory
- Process monitoring

### 6. Invite the Bot to Your Server

Use this URL format (replace `YOUR_CLIENT_ID` with your actual client ID):

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=0&scope=bot%20applications.commands
```

Or use the invite link that appears in the console when the bot starts.

## Project Structure

```
.
├── src/
│   ├── commands/           # Command categories
│   │   └── utility/        # Utility commands
│   │       ├── ping.js     # Ping command
│   │       └── reload.js   # Reload commands (owner only)
│   ├── utils/              # Utility functions
│   │   └── deployCommands.js  # Command deployment utility
│   ├── constants.js        # Bot constants (command contexts)
│   ├── index.js            # Main bot file
│   └── deploy-commands.js  # Command deployment script
├── logs/                   # PM2 log files
├── .env                    # Environment variables (create from .env.example)
├── .env.example            # Example environment variables
├── ecosystem.config.js     # PM2 configuration
├── package.json            # Project dependencies
└── README.md               # This file
```

## Creating New Commands

To create a new command:

1. Create a new file in the appropriate category folder (e.g., `src/commands/utility/mycommand.js`)
2. Use this template:

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	// Optional: Set cooldown in seconds (defaults to 3)
	cooldown: 5,

	// Command data for registration
	data: new SlashCommandBuilder()
		.setName('commandname')
		.setDescription('Command description')
		.setDMPermission(true), // Set to false if command shouldn't work in DMs

	// Execute function
	async execute(interaction) {
		await interaction.reply('Hello!');
	},
};
```

3. Run `npm run deploy` to register the new command with Discord
4. Restart the bot or use `/reload` (if you're the owner)

### Adding Command Options

You can add options to your commands using the SlashCommandBuilder methods:

```javascript
data: new SlashCommandBuilder()
	.setName('echo')
	.setDescription('Echoes your message')
	.addStringOption(option =>
		option
			.setName('message')
			.setDescription('The message to echo')
			.setRequired(true)
	),
```

Access options in the execute function:

```javascript
async execute(interaction) {
	const message = interaction.options.getString('message');
	await interaction.reply(message);
}
```

## Command Cooldowns

Each command can specify a cooldown period in seconds. Users must wait this amount of time between uses:

```javascript
module.exports = {
	cooldown: 10, // 10 seconds cooldown
	// ... rest of command
};
```

If not specified, the default cooldown is 3 seconds.

## Available Commands

### /ping
Displays the bot's latency information (roundtrip and WebSocket latency).

**Cooldown:** 5 seconds

### /reload
Reloads all bot commands and re-registers them with Discord, then fully restarts the bot. Owner only.

**Features:**
- Reloads command files from disk
- Re-registers commands with Discord API
- Fully restarts the bot process (when using PM2)

**Cooldown:** None (owner only)

## Logging

The bot includes comprehensive logging:

- `[INIT]` - Initialization messages
- `[LOAD]` - Command loading
- `[READY]` - Bot ready state
- `[COMMAND]` - Command usage
- `[COOLDOWN]` - Cooldown violations
- `[ERROR]` - Errors
- `[WARNING]` - Warnings

## Error Handling

The bot includes advanced error handling:

- Command execution errors are caught and reported to users
- Unhandled promise rejections are logged
- Uncaught exceptions are logged and cause graceful shutdown
- Discord client errors and warnings are logged
- Graceful shutdown on SIGINT/SIGTERM

## Tips

- Use ephemeral replies for sensitive information: `interaction.reply({ content: 'Secret!', ephemeral: true })`
- Always handle errors in command execution
- Test commands in DMs to ensure DM compatibility
- Use `interaction.deferReply()` for commands that take longer than 3 seconds
- Check the [discord.js documentation](https://discord.js.org/) for more features

## Troubleshooting

### Commands not appearing
- Make sure you ran `npm run deploy`
- Global commands can take up to 1 hour to appear
- Try using the bot in a different server or DM

### Bot not responding
- Check that the bot is online in Discord
- Verify your `.env` file has the correct token
- Check console for error messages

### Permission errors
- Ensure the bot has been invited with the correct scopes (`bot` and `applications.commands`)
- Check that required intents are enabled if you add new features

## License

ISC
