const fs = require("fs");
const path = require("path");

const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFilePath = path.join(logsDir, "security.log");

const logEvent = (eventType, details) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${eventType}] ${JSON.stringify(details)}\n`;

  // Write to console
  console.log(`🔒 [SECURITY AUDIT] [${eventType}]`, details);

  // Append to local log file
  fs.appendFile(logFilePath, logMessage, (err) => {
    if (err) {
      console.error("❌ Failed to write to security log file:", err);
    }
  });
};

module.exports = {
  logEvent
};
