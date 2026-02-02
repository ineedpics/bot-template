# LLMs.md

## Project Overview

Biscuit is a Discord utility bot built with discord.js v14 and Node.js. It features a modular slash command system, a three-tier license management system (FREE, BASIC, PRO), and owner-only administrative commands. The bot uses CommonJS modules, stores license data in a local JSON file, and is deployed via PM2 in production.

### Key Features

- Slash command framework with dynamic loading and hot-reload
- License key generation, redemption, and revocation
- Per-command cooldowns and tier-based access control
- Owner-only guild commands separated from global commands
- Graceful shutdown and process error handling

### Tech Stack

- **Runtime:** Node.js (CommonJS)
- **Framework:** discord.js v14
- **Environment:** dotenv
- **Process Manager:** PM2
- **No database** — license data persists in `src/data/licenses.json`

### Structure

```
src/
  index.js              # Entry point, client setup, event handlers
  constants.js          # App-wide constants and configuration
  deploy-commands.js    # CLI script to register slash commands
  commands/
    owner/              # Owner-only commands (guild-scoped)
      owner.js
      subcommands/      # Individual subcommand handlers
    license/            # License and redemption commands
    utility/            # General-purpose commands (ping, etc.)
  utils/
    deployCommands.js   # Discord API deployment logic
    licenseManager.js   # License CRUD and persistence
  data/
    licenses.json       # License/user data (gitignored)
```

---

## Coding Conventions

### Formatting

- **Indentation:** Tabs, not spaces.
- **Semicolons:** Always used.
- **Quotes:** Double quotes (`"`) for all strings. Backticks only for template literals.
- **Trailing commas:** Used in multi-line objects and arrays.
- **Strings:** Typically lowercase unless a proper noun.

### Naming

| Element            | Convention        | Example                        |
|--------------------|-------------------|--------------------------------|
| Variables          | camelCase         | `userLicense`, `folderPath`    |
| Functions          | camelCase         | `loadCommands()`, `saveLicenses()` |
| Constants          | UPPER_SNAKE_CASE  | `LICENSE_TIERS`, `COMMAND_CONTEXTS` |
| Files              | camelCase         | `licenseManager.js`, `deployCommands.js` |
| Classes (external) | PascalCase        | `SlashCommandBuilder`, `Client` |

### Module System

- CommonJS throughout (`require()` / `module.exports`). No ES module syntax.
- Node built-ins use the `node:` prefix: `require("node:fs")`, `require("node:path")`, `require("node:crypto")`.
- Import order: environment setup, then Node built-ins, then third-party packages, then local modules.
- Exports are explicit objects: `module.exports = { fn1, fn2 };`

### Comments and Documentation

- JSDoc blocks (`/** ... */`) with `@param`, `@returns`, and `@throws` on non-trivial functions.
- Inline `//` comments for brief clarifications.
- Configuration objects include comments explaining each option.

### Logging

All console output follows a `[TAG] Message` pattern for easy filtering:

```
[INIT], [LOAD], [READY], [COMMAND], [COOLDOWN], [LICENSE],
[DEPLOY], [ERROR], [WARNING], [HINT], [SUCCESS], [INFO],
[RELOAD], [SHUTDOWN], [CLIENT ERROR], [CLIENT WARNING], [DETAILS]
```

### Error Handling

- Try-catch blocks with contextual `[ERROR]` logging.
- Guard clauses and early returns for invalid state (`if (!x) return null;`).
- Functions return status objects: `{ success: boolean, tier: string|null, message: string }`.
- Top-level process handlers for `unhandledRejection`, `uncaughtException`, `SIGINT`, `SIGTERM`.

### Async Patterns

- `async`/`await` for all asynchronous code.
- Command handlers are `async execute(interaction)`.
- Top-level async via IIFE: `(async () => { ... })();`
- Discord interactions use deferred replies for long operations and ephemeral replies for sensitive output.

### Command Structure

Every command module exports the same shape:

```js
module.exports = {
	context: COMMAND_CONTEXTS.GLOBAL,   // or OWNER_ONLY
	license: LICENSE_TIERS.FREE,        // minimum tier required
	cooldown: 5,                        // seconds
	data: new SlashCommandBuilder()..., // discord.js builder
	async execute(interaction) { ... }
};
```

Subcommands are split into individual files under a `subcommands/` directory and routed by the parent command.

### Discord Embeds

Built as plain objects (not the EmbedBuilder class), with hex integer colors:

```js
{ color: 0xFF0000, title: "Error", description: "...", fields: [...] }
```

### Other Habits

- Validation happens early, with guard clauses before main logic.
- Ephemeral responses for anything security-sensitive.
- Configurable constants centralized in `constants.js` rather than scattered magic values.
- `package-lock.json` is gitignored.
