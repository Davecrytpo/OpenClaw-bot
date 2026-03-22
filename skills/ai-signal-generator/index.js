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
    const { currentPrice, historicalData, symbol } = context.data;
    
    // Improved Analysis context for 30 points
    const last30 = historicalData.slice(-30);
    const last30Closes = last30.map(d => d.close).join(', ');
    const last30Volumes = last30.map(d => d.volume).join(', ');

    // More Professional and Quantitative Prompt
    const prompt = `
    MARKET ANALYSIS FOR ${symbol}:
    Current Price: ${currentPrice}
    Current Account Balance: $${this.balance}

    Historical Prices (Last 30 Closes):
    ${last30Closes}

    Volumes (Last 30 periods):
    ${last30Volumes}

    GOAL: Professional Risk-Adjusted Trading.
    1. Analyze the trend, support/resistance, and volume momentum.
    2. Given our capital of $${this.balance}, determine if there is a high-probability trade. 
    3. Note: If capital is low (e.g., <$50), we should be more selective with entries.
    
    You MUST respond in this JSON format:
    {
      "decision": "BUY" | "SELL" | "HOLD",
      "confidence": 0-100,
      "take_profit": number,
      "stop_loss": number,
      "reasoning": "1-sentence professional explanation"
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
