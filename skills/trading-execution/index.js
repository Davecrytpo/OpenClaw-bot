const ccxt = require("ccxt");

class TradingExecutionSkill {
  constructor(config) {
    this.exchange = new ccxt[config.exchange_id || 'binance']({
      apiKey: config.exchange_api_key,
      secret: config.exchange_secret,
      enableRateLimit: true
    });
  }

  async handleAction(context) {
    const { symbol, decision, tradeAmount, currentPrice, isMock } = context.data;
    const amount = tradeAmount / currentPrice;
    
    if (isMock) {
      console.log(`[MOCK] Simulated ${decision} for ${amount.toFixed(6)} ${symbol}`);
      return { event: 'notification-reporting.handleAction', data: { ...context.data, order: { id: 'MOCK-123', status: 'closed' }, response: "Simulated Trade Complete (Mock Mode)" } };
    }

    try {
      let order;
      if (decision === "BUY") order = await this.exchange.createMarketBuyOrder(symbol, amount);
      if (decision === "SELL") order = await this.exchange.createMarketSellOrder(symbol, amount);
      return { event: 'notification-reporting.handleAction', data: { ...context.data, order, response: "Trade Complete!" } };
    } catch (error) {
      console.warn(`⚠️ Trade Execution Failed: ${error.message}`);
      // Even if real trade fails due to IP blocks, let's report it so user knows.
      return { event: 'notification-reporting.handleAction', data: { ...context.data, response: `Trade Failed: ${error.message}` } };
    }
  }
}
module.exports = TradingExecutionSkill;
