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
      // Fallback: Mock Data for Demonstration if exchange is blocked
      const mockPrice = 68000 + Math.random() * 1000;
      const data = {
        currentPrice: mockPrice,
        historicalData: Array.from({ length: 50 }, (_, i) => ({
          timestamp: Date.now() - (50 - i) * 3600000,
          open: mockPrice - 100,
          high: mockPrice + 100,
          low: mockPrice - 200,
          close: mockPrice + (Math.random() - 0.5) * 500,
          volume: 100
        })),
        symbol: symbol,
        isMock: true,
        error: error.message
      };
      return { event: 'ai-signal-generator.handleAction', data: data };
    }
  }
}
module.exports = MarketDataFetcherSkill;
