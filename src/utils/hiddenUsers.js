const hiddenUsers = new Set();

function isHidden(userId) {
	return hiddenUsers.has(userId);
}

function toggleHidden(userId) {
	if (hiddenUsers.has(userId)) {
		hiddenUsers.delete(userId);
		return false;
	}
	hiddenUsers.add(userId);
	return true;
}

module.exports = { isHidden, toggleHidden };
