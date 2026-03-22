require('dotenv').config();
const MarketDataFetcher = require('./skills/market-data-fetcher');
const AISignalGenerator = require('./skills/ai-signal-generator');
const RiskManagement = require('./skills/risk-management');
const TradingExecution = require('./skills/trading-execution');
const NotificationReporting = require('./skills/notification-reporting');
const ccxt = require('ccxt');

// Fetch real balance from Binance
async function getRealBalance() {
  try {
    const exchange = new ccxt.binance({
      apiKey: process.env.BINANCE_API_KEY,
      secret: process.env.BINANCE_SECRET_KEY
    });
    const balance = await exchange.fetchBalance();
    return balance.total.USDT || 0;
  } catch (error) {
    console.warn("⚠️ Balance Fetch Error:", error.message);
    return 100; // Default to $100 as requested
  }
}

async function startBot() {
  console.log('🚀 OpenClaw Trading Bot is Wake... Starting 24/7 Mode');
  
    const TRADING_PAIRS = ['SOL/USDT', 'BTC/USDT', 'ETH/USDT'];
    const INTERVAL_MS = 15 * 60 * 1000;

    async function runTradingCycle() {
      const currentBalance = await getRealBalance();
      console.log(`\n--- 🤖 Cycle Started | Balance: ${currentBalance.toFixed(2)} USDT ---`);

      const config = {
        market: { exchange_id: 'binance', limit: 30 },
        ai: {
          groq_api_key: process.env.GROQ_API_KEY,
          model_name: 'llama-3.3-70b-versatile',
          balance: currentBalance 
        },
        risk: {
          max_risk_per_trade_percent: 2.0,
          total_balance: currentBalance 
        },
        execution: {
          exchange_id: 'binance',
          exchange_api_key: process.env.BINANCE_API_KEY,
          exchange_secret: process.env.BINANCE_SECRET_KEY
        },
        notification: {
          telegram_token: process.env.TELEGRAM_BOT_TOKEN,
          telegram_chat_id: process.env.TELEGRAM_CHAT_ID
        }
      };

      const marketFetcher = new MarketDataFetcher(config.market);
      const signalGenerator = new AISignalGenerator(config.ai);
      const riskManager = new RiskManagement(config.risk);
      const tradeExecutor = new TradingExecution(config.execution);
      const reporter = new NotificationReporting(config.notification);

      for (const symbol of TRADING_PAIRS) {
        try {
          console.log(`\n[${symbol}] Analyzing...`);
          
          // Fetch Multi-Timeframe Data (15m and 1h)
          marketFetcher.timeframe = '15m';
          const market15m = await marketFetcher.handleQuery({ entities: [{ value: symbol }] });
          
          marketFetcher.timeframe = '1h';
          const market1h = await marketFetcher.handleQuery({ entities: [{ value: symbol }] });

          const combinedData = {
            ...market15m.data,
            historical15m: market15m.data.historicalData,
            historical1h: market1h.data.historicalData
          };

          const signalResult = await signalGenerator.handleAction({ data: combinedData });
          console.log(`[${symbol}] AI Decision: ${signalResult.data.decision}`);
          
          if (signalResult.event === 'risk-management.handleAction') {
            const riskResult = await riskManager.handleAction({ data: signalResult.data });
            
            if (riskResult.event === 'trading-execution.handleAction') {
              console.log(`[${symbol}] Risk Approved. Executing Trade...`);
              const executionResult = await tradeExecutor.handleAction({ data: riskResult.data });
              await reporter.handleAction({ data: executionResult.data });
            } else {
              await reporter.handleAction({ data: riskResult.data });
            }
          }
        } catch (error) {
          console.error(`❌ Error with ${symbol}:`, error.message);
        }
      }
      console.log(`\n--- ⏳ Cycle Complete. Sleeping for 15 Minutes... ---`);
    }

  // Run immediately on start
  await runTradingCycle();

  // Set to run every 15 minutes
  setInterval(async () => {
    try {
      await runTradingCycle();
    } catch (err) {
      console.error("Critical Loop Error:", err.message);
    }
  }, INTERVAL_MS);
}

// Keep the process alive
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startBot();
