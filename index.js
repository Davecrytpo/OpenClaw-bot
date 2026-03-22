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
  
  // Optimized for Small Capital ($20-$100)
  // Focusing on the TOP 3 High-Liquidity / High-Momentum pairs
  const TRADING_PAIRS = ['SOL/USDT', 'BTC/USDT', 'ETH/USDT'];
  const INTERVAL_MS = 15 * 60 * 1000; // 15 Minutes

  async function runTradingCycle() {
    const currentBalance = await getRealBalance();
    console.log(`\n--- 🤖 Cycle Started | Balance: ${currentBalance.toFixed(2)} USDT ---`);

    const config = {
      market: { exchange_id: 'binance', timeframe: '15m', limit: 50 },
      ai: {
        groq_api_key: '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',
        model_name: 'llama-3.3-70b-versatile',
        balance: currentBalance // Pass balance to AI
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
        const marketResult = await marketFetcher.handleQuery({ entities: [{ value: symbol }] });
        
        if (marketResult.event === 'ai-signal-generator.handleAction') {
          const signalResult = await signalGenerator.handleAction({ data: marketResult.data });
          console.log(`[${symbol}] AI Decision: ${signalResult.data.decision}`);
          
          if (signalResult.event === 'risk-management.handleAction') {
            const riskResult = await riskManager.handleAction({ data: signalResult.data });
            
            if (riskResult.event === 'trading-execution.handleAction') {
              console.log(`[${symbol}] Risk Approved. Executing Trade...`);
              const executionResult = await tradeExecutor.handleAction({ data: riskResult.data });
              await reporter.handleAction({ data: executionResult.data });
            } else {
              // Report HOLD/Neutral decisions to Telegram too
              await reporter.handleAction({ data: riskResult.data });
            }
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
