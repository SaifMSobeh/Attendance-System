function formatCredentialMessage(username, password) {
  return [
    "Welcome to Hossam Math.",
    "Your login details are:",
    `Username: ${username}`,
    `Password: ${password}`,
    "Please sign in with your username and password and keep your password private.",
    "Regards,",
    "Mr. Hossam Math",
  ].join("\n");
}

module.exports = { formatCredentialMessage };
