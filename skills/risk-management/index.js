class RiskManagementSkill {
  constructor(config) {
    this.maxRisk = config.max_risk_per_trade_percent || 2.0;
    this.balance = config.total_balance || 100;
    this.minConfidence = 75; 
    this.minTradeUsdt = 5.5; // Binance minimum is usually 5 USDT; 5.5 is safer.
  }

  async handleAction(context) {
    const { decision, symbol, currentPrice, confidence } = context.data;
    
    if ((decision === "BUY" || decision === "SELL") && confidence >= this.minConfidence) {
      // Calculate amount based on % risk
      let tradeAmount = (this.balance * this.maxRisk) / 100;
      
      // Smart Handling for Small Capital:
      // If our risk amount is too small for the exchange, we must increase it to the minimum.
      if (tradeAmount < this.minTradeUsdt) {
        if (this.balance >= this.minTradeUsdt) {
          tradeAmount = this.minTradeUsdt;
          console.log(`💡 [Small Cap Mode]: Increasing trade to minimum of $${tradeAmount} for ${symbol}`);
        } else {
          console.warn(`❌ [Insufficient Capital]: Balance $${this.balance} is below minimum trade requirement of $${this.minTradeUsdt}.`);
          return { 
            event: 'notification-reporting.handleAction', 
            data: { ...context.data, decision: "HOLD", response: "Error: Balance too low for exchange minimums." } 
          };
        }
      }
      
      console.log(`🛡️ Risk Check [${symbol}]: Decision ${decision} approved with ${confidence}% confidence. Risking $${tradeAmount.toFixed(2)}.`);
      
      return { 
        event: 'trading-execution.handleAction', 
        data: { ...context.data, tradeAmount } 
      };
    }
    
    let reason = "Market neutrality.";
    if (decision !== "HOLD" && confidence < this.minConfidence) {
      reason = `Confidence too low (${confidence}% < ${this.minConfidence}%).`;
    }

    return { 
      event: 'notification-reporting.handleAction', 
      data: { ...context.data, decision: "HOLD", response: `Risk Filter: ${reason}` } 
    };
  }
}
module.exports = RiskManagementSkill;
