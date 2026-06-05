// Tiny hand-rolled sentiment lexicon. lean = (pos - neg) / (pos + neg), in [-1, 1].
// Intentionally small and tunable per the spec ("a positive/negative keyword list").
// Swap in AFINN-165 (~15KB, words scored -5..+5) if you want higher fidelity.
// Note: words are matched against tokens of length >= 2, so single-char "W"/"L" are not here.

export const POSITIVE_WORDS = new Set([
  'love', 'loved', 'loving', 'like', 'liked', 'great', 'good', 'nice', 'awesome', 'amazing',
  'epic', 'beautiful', 'best', 'better', 'win', 'wins', 'winning', 'won', 'clutch', 'insane',
  'incredible', 'goat', 'goated', 'fire', 'lit', 'hype', 'hyped', 'happy', 'glad', 'fun',
  'funny', 'lol', 'lmao', 'haha', 'cool', 'wow', 'pog', 'poggers', 'dub', 'clean', 'smooth',
  'perfect', 'legend', 'king', 'queen', 'wholesome', 'cute', 'sweet', 'thank', 'thanks',
  'blessed', 'vibe', 'vibes', 'yay', 'congrats', 'respect', 'strong', 'banger', 'cracked',
  'sheesh', 'based', 'gigachad', 'ggs',
])

export const NEGATIVE_WORDS = new Set([
  'hate', 'hated', 'bad', 'worse', 'worst', 'awful', 'terrible', 'horrible', 'trash',
  'garbage', 'cringe', 'lose', 'loses', 'losing', 'lost', 'fail', 'failed', 'fails', 'rip',
  'dead', 'sad', 'angry', 'mad', 'annoying', 'annoyed', 'boring', 'bored', 'toxic', 'scam',
  'cheat', 'cheater', 'cheating', 'hack', 'hacker', 'hacking', 'rigged', 'broken', 'buggy',
  'lag', 'laggy', 'stupid', 'dumb', 'idiot', 'ugly', 'disgusting', 'gross', 'sucks', 'suck',
  'sucked', 'wtf', 'smh', 'nope', 'yikes', 'malding', 'mald', 'copium', 'flop', 'choke',
  'choked', 'overrated', 'disappointing', 'ratio', 'clown',
])
