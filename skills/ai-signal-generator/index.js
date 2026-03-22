const OpenAI = require("openai");

class AISignalGeneratorSkill {
  constructor(config) {
    this.groq = new OpenAI({
      apiKey: config.groq_api_key,
      baseURL: "https://api.groq.com/openai/v1"
    });
    this.model = config.model_name || "llama-3.3-70b-versatile";
    this.balance = config.balance || 100;
  }

  async handleAction(context) {
    const { currentPrice, historical15m, historical1h, symbol } = context.data;
    
    // Formatting data for the AI
    const last30_15m = historical15m.slice(-30).map(d => d.close).join(', ');
    const last30_1h = historical1h.slice(-30).map(d => d.close).join(', ');

    const prompt = `
    PROFESSIONAL MARKET ANALYSIS FOR ${symbol}:
    Current Price: ${currentPrice}
    Account Balance: $${this.balance}

    15-MINUTE TREND (Last 30 Closes):
    ${last30_15m}

    1-HOUR TREND (Last 30 Closes):
    ${last30_1h}

    GOAL: Professional Multi-Timeframe Trading.
    1. Confirm the 1-hour trend before looking for entries on the 15-minute chart.
    2. Look for price-action patterns (reversals, breakouts, or momentum).
    3. Determine if there is a high-probability trade opportunity.
    
    You MUST respond in this JSON format:
    {
      "decision": "BUY" | "SELL" | "HOLD",
      "confidence": 0-100,
      "take_profit": number,
      "stop_loss": number,
      "reasoning": "1-sentence professional explanation incorporating BOTH timeframes"
    }
    `;

    try {
      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "You are a professional quantitative crypto trader. You analyze market structure and volume to make high-confidence decisions. Only output valid JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });
      
      const response = JSON.parse(completion.choices[0].message.content);
      const decision = response.decision || "HOLD";

      return { 
        event: 'risk-management.handleAction', 
        data: { 
          ...context.data, 
          decision, 
          reasoning: response.reasoning,
          confidence: response.confidence,
          takeProfit: response.take_profit,
          stopLoss: response.stop_loss
        } 
      };
    } catch (error) {
      return { response: `Groq AI Error: ${error.message}` };
    }
  }
}
module.exports = AISignalGeneratorSkill;
