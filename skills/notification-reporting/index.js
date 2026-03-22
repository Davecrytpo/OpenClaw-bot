const https = require('https');

class NotificationReportingSkill {
  constructor(config) {
    this.token = config.telegram_token;
    this.chatId = config.telegram_chat_id;
  }

  async handleAction(context) {
    const { symbol, decision, response, reasoning, confidence, takeProfit, stopLoss } = context.data;
    
    let message = `🤖 Bot Update [${symbol}]\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `Decision: ${decision}\n`;
    message += `Reason: ${reasoning || "N/A"}\n`;
    
    if (decision !== "HOLD") {
      message += `Confidence: ${confidence}%\n`;
      message += `Take Profit: ${takeProfit || "N/A"}\n`;
      message += `Stop Loss: ${stopLoss || "N/A"}\n`;
    }
    
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `Status: ${response}`;
    
    const postData = JSON.stringify({ chat_id: this.chatId, text: message });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${this.token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            console.error(`Telegram Error: ${res.statusCode} - ${responseBody}`);
          } else {
            console.log(`Telegram Notification Sent: ${res.statusCode}`);
          }
          resolve({ response: "Notification sent." });
        });
      });

      req.on('error', (error) => {
        console.error("Failed to send telegram notification:", error.message);
        resolve({ response: "Notification failed: " + error.message });
      });

      req.write(postData);
      req.end();
    });
  }
}
module.exports = NotificationReportingSkill;
