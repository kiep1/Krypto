'use strict';

const LESSONS = [
  {
    "slug": "chart-basics",
    "number": 1,
    "access": "free",
    "title": "Chart Basics: Price, Pairs, and Evidence",
    "summary": "Learn what a chart can show, how a trading pair is read, and how to separate an observation from an explanation.",
    "content": "# Chart Basics: Price, Pairs, and Evidence\n\n## What a chart records\nA price chart organizes past trades by time. It can show the price at which trades occurred and, depending on the display, volume or other data. It cannot tell you why every participant traded or what price will come next. Treat the image as a limited record, not a complete picture of a market.\n\n## Read the trading pair\nA pair such as BTC/USD compares the value of one unit of the first asset with the second. The quote currency matters: BTC/USD and BTC/EUR can move differently because both the crypto asset and the exchange rate between currencies can change. Always confirm the symbol, quote currency, venue, and units before interpreting levels.\n\n## Observation versus hypothesis\nAn observation is directly visible: “the last three completed candles have lower highs.” A hypothesis explains it: “selling pressure may be increasing.” Keep those statements separate. A hypothesis is uncertain and should be compared with alternatives, such as a temporary pullback inside a wider upward move.\n\n## A careful first pass\n1. Read the symbol and quote currency.\n2. Identify the chart type and visible timeframe.\n3. Check whether the latest candle is still forming.\n4. Describe the clearest visible movement without naming a pattern yet.\n5. Note what is missing or unreadable.\n\n### Check your understanding\nIf a chart does not show its symbol or quote currency, what should you do? Record that the context is unknown; do not guess it from the shape of the chart.",
    "tutorPrompt": "Teach the learner to identify visible facts, distinguish them from interpretations, and note missing chart context. Do not provide a trade recommendation."
  },
  {
    "slug": "candlesticks-timeframes",
    "number": 2,
    "access": "free",
    "title": "Candlesticks and Timeframes",
    "summary": "Understand candle ranges, wicks, open candles, and why the same market can look different across timeframes.",
    "content": "# Candlesticks and Timeframes\n\n## The four candle prices\nA standard candle summarizes four values for its interval: open, high, low, and close. The body spans the open and close. Wicks show the highest and lowest traded prices during the interval. Candle color is a display convention; check the chart legend if it is unclear.\n\nA long wick means price travelled farther from the open/close area during that interval. It does not, by itself, prove that buyers or sellers have taken control. Volume, liquidity, the candle's location, and what happens next all affect interpretation.\n\n## Completed and forming candles\nAn unfinished candle can change shape and direction before its interval ends. Avoid treating its current appearance as a completed signal. When reviewing a screenshot, note whether the final candle may still be forming and whether the displayed time is clear.\n\n## Timeframe changes the view\nA one-hour candle compresses a different amount of activity than a daily candle. A short-term move can appear as noise inside a larger move. Conversely, a wide chart can hide a sharp short-term change. Use a consistent timeframe for each question and state the timeframe explicitly.\n\n## A comparison exercise\nLook at the same symbol on two timeframes. Write one neutral sentence about the broad view, then one about the recent view. If they differ, describe the difference instead of forcing them into a single story.\n\n### Check your understanding\nWhy can a candle that is currently green later close red? Because the interval has not ended; its close is still changing with new trades.",
    "tutorPrompt": "Explain OHLC candles, wicks, forming versus completed candles, and timeframe context. Do not interpret a specific live market or predict a price."
  },
  {
    "slug": "market-structure",
    "number": 3,
    "access": "free",
    "title": "Market Structure: Trends and Ranges",
    "summary": "Describe swings with higher highs, lower lows, and ranges without assuming that a trend must continue.",
    "content": "# Market Structure: Trends and Ranges\n\n## Describe the swings\nA simple way to describe a chart is to compare visible swing highs and lows. A sequence of higher highs and higher lows is commonly called an upward structure. Lower highs and lower lows are commonly called a downward structure. Similar highs and lows can describe a range.\n\nThese labels summarize the past part of the chart you can see. They do not guarantee continuation or reversal. A single apparent swing can be revised when the chart is zoomed or when a candle has not closed.\n\n## Separate the broad and recent view\nA chart can show a broad upward structure and a recent downward pullback at the same time. State both: “the wider view has rising swing lows; the most recent segment is falling.” This is more useful than calling the whole chart simply bullish or bearish.\n\n## Transitions are uncertain\nA range may break, continue, or produce a false break. A potential structure change becomes more meaningful when it is visible on completed candles and is consistent with the timeframe being studied. Even then it remains a hypothesis, not a promise.\n\n## Practice with neutral language\nMark two or three clear swing highs and lows. Describe their order, then write one alternative explanation. If the screenshot does not show enough history, say so instead of filling in the missing swings.\n\n### Check your understanding\nCan an upward structure experience a decline? Yes. The label describes a sequence of swings, not a straight path or a guarantee about the next move.",
    "tutorPrompt": "Teach the learner to describe higher highs/higher lows, lower highs/lower lows, ranges, and conflicting timeframes as uncertain chart observations."
  },
  {
    "slug": "support-resistance-zones",
    "number": 4,
    "access": "premium",
    "title": "Support and Resistance as Zones",
    "summary": "Use repeated reactions as areas of interest, and learn why a line is not a guaranteed barrier."
  },
  {
    "slug": "order-types-execution",
    "number": 5,
    "access": "premium",
    "title": "Order Types, Liquidity, and Slippage",
    "summary": "Compare market, limit, and stop orders, including fills, spread, slippage, and execution uncertainty."
  },
  {
    "slug": "indicators-in-context",
    "number": 6,
    "access": "premium",
    "title": "Indicators in Context",
    "summary": "Learn what moving averages, RSI, and volatility measures summarize, and why no indicator works alone."
  },
  {
    "slug": "risk-and-position-sizing",
    "number": 7,
    "access": "premium",
    "title": "Risk Plans and Position Sizing",
    "summary": "Connect an invalidation idea to a hypothetical risk calculation without offering personal allocation advice."
  },
  {
    "slug": "backtesting-and-paper-trading",
    "number": 8,
    "access": "premium",
    "title": "Backtesting Without Overfitting",
    "summary": "Create clear rules, separate development from evaluation data, and account for costs and selection bias."
  },
  {
    "slug": "trading-journal",
    "number": 9,
    "access": "premium",
    "title": "Build a Useful Trading Journal",
    "summary": "Use screenshots, hypotheses, context, and review notes to evaluate decision quality rather than one outcome."
  },
  {
    "slug": "crypto-market-risks",
    "number": 10,
    "access": "premium",
    "title": "Crypto Market, Custody, and Platform Risks",
    "summary": "Separate market risk from custody, counterparty, technology, and operational risks in crypto."
  },
  {
    "slug": "trading-psychology",
    "number": 11,
    "access": "premium",
    "title": "Decision Hygiene: FOMO, Loss-Chasing, and Breaks",
    "summary": "Recognize emotional pressure and use written rules, pauses, and review instead of impulsive decisions."
  }
];
const LESSON_BY_SLUG = new Map(LESSONS.map((lesson) => [lesson.slug, lesson]));
module.exports = { LESSONS, LESSON_BY_SLUG };
