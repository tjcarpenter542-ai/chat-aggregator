// Themed keyword categories for highlight-only coloring of the trending bar. These do NOT
// filter anything — every word still trends; categorized words just get a themed color.

export const CATEGORY_TERMS = {
  crypto: new Set([
    'hodl', 'fomo', 'fud', 'wagmi', 'ngmi', 'gm', 'dyor', 'rekt', 'degen', 'ape', 'apeing',
    'bagholder', 'ath', 'moon', 'lambo', 'alpha', 'pump', 'dump', 'rug', 'rugpull', 'safu',
    'btfd', 'tendies', 'hodler', 'altseason', 'memecoin', 'solana', 'sol', 'btc', 'eth', 'zec',
    'hype', 'bitcoin', 'ethereum', 'xrp', 'doge', 'bonk', 'wif', 'pepe', 'popcat',
  ]),
  ai: new Set([
    'slop', 'hallucination', 'agentic', 'agent', 'agents', 'jailbreak', 'llm', 'grok', 'rag',
    'prompt', 'multimodal', 'finetune', 'modelops', 'mlops', 'claude', 'gpt', 'openai',
    'anthropic', 'vibecoding',
  ]),
  prediction: new Set([
    'polymarket', 'kalshi', 'mogged', 'fudded', 'implied', 'liquidity', 'volume', 'contracts',
    'odds',
  ]),
  markets: new Set([
    'calls', 'puts', 'leverage', 'liquidation', 'macro', 'gamma', 'squeeze', 'diamond', 'paper',
    'hands', 'fed', 'rates', 'spy', 'qqq', 'nvda',
  ]),
  politics: new Set([
    'maga', 'woke', 'based', 'cringe', 'redpill', 'deepstate', 'establishment', 'rino', 'shill',
    'ratio', 'election', 'polls', 'landslide',
  ]),
  sports: new Set([
    'goat', 'clutch', 'choke', 'brick', 'cook', 'parlay', 'prop', 'underdog', 'overrated',
    'finals',
  ]),
  culture: new Set([
    'delulu', 'rizz', 'aura', 'mid', 'nocap', 'ick', 'opp', 'crashout', 'cap',
  ]),
}

// category -> highlight color. `cashtags` and `uncategorized` are handled by categorize()/UI.
export const CATEGORY_COLORS = {
  cashtags: '#f0b90b',
  crypto: '#f7931a',
  ai: '#00d4ff',
  prediction: '#a855f7',
  markets: '#22c55e',
  politics: '#ef4444',
  sports: '#f97316',
  culture: '#ec4899',
  uncategorized: 'var(--text)',
}

// Categories shown in the legend, in display order (uncategorized intentionally omitted).
export const LEGEND_CATEGORIES = [
  'cashtags', 'crypto', 'ai', 'prediction', 'markets', 'politics', 'sports', 'culture',
]

// Flatten term sets into one lookup map (word -> category) for O(1) categorization.
const WORD_TO_CATEGORY = new Map()
for (const [category, terms] of Object.entries(CATEGORY_TERMS)) {
  for (const term of terms) if (!WORD_TO_CATEGORY.has(term)) WORD_TO_CATEGORY.set(term, category)
}

// Return the category for a trending word. Cashtags (e.g. "$SOL") are always `cashtags`.
export function categorize(word) {
  if (!word) return 'uncategorized'
  if (word.startsWith('$')) return 'cashtags'
  return WORD_TO_CATEGORY.get(word.toLowerCase()) || 'uncategorized'
}
