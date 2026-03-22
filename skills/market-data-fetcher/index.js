const ccxt = require("ccxt");

class MarketDataFetcherSkill {
  constructor(config) {
    this.exchangeId = config.exchange_id || 'binance';
    this.exchange = new ccxt[this.exchangeId]({
      enableRateLimit: true,
      timeout: 15000
    });
    this.timeframe = config.timeframe || '1h';
    this.limit = config.limit || 100;
  }

  async handleQuery(context) {
    let symbol = 'BTC/USDT';
    if (context.entities) {
      if (Array.isArray(context.entities) && context.entities[0]) {
        symbol = context.entities[0].value.toUpperCase();
      } else if (context.entities.symbol) {
        symbol = context.entities.symbol.toUpperCase();
      }
    }
    
    try {
      const ticker = await this.exchange.fetchTicker(symbol);
      const ohlcv = await this.exchange.fetchOHLCV(symbol, this.timeframe, undefined, this.limit);
      const data = {
        currentPrice: ticker.last,
        historicalData: ohlcv.map(c => ({ timestamp: c[0], open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5] })),
        symbol: symbol
      };
      return { event: 'ai-signal-generator.handleAction', data: data };
    } catch (error) {
      console.error(`❌ Market Data Error for ${symbol}: ${error.message}`);
      // Fail-Fast: Never return mock data for a professional bot
      throw new Error(`CRITICAL: Could not fetch real data for ${symbol}. Skipping cycle.`);
    }
  }
}
module.exports = MarketDataFetcherSkill;
