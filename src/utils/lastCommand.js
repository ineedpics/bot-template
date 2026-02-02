const lastCommands = new Map();

function setLastCommand(userId, data) {
	lastCommands.set(userId, data);
}

function getLastCommand(userId) {
	return lastCommands.get(userId);
}

module.exports = { setLastCommand, getLastCommand };
