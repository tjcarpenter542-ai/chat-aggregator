// Common English stopwords + chat-specific noise. Tokens in this set are excluded from the
// trending-words and spike views (but can still count toward sentiment). Tune freely.
const WORDS = [
  // articles / conjunctions / prepositions / pronouns / aux verbs
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'than', 'that', 'this', 'these',
  'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am', "i'm", 'im', 'you',
  'your', "you're", 'youre', 'yours', 'he', 'she', 'it', 'its', "it's", 'they', 'them',
  'their', 'there', "there's", 'theres', 'we', 'us', 'our', 'ours', 'me', 'my', 'mine',
  'him', 'her', 'his', 'hers', 'who', 'whom', 'whose', 'what', 'which', 'when', 'where',
  'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'nor', 'not', 'only', 'own', 'same', 'too', 'very', 'can', 'will', 'just',
  'dont', "don't", 'should', 'now', 'also', 'about', 'above', 'after', 'again', 'against',
  'because', 'before', 'below', 'between', 'down', 'during', 'for', 'from', 'further',
  'here', 'into', 'off', 'once', 'out', 'over', 'under', 'until', 'with', 'without',
  'doing', 'does', 'did', 'have', 'has', 'had', 'having', 'would', 'could', 'get', 'got',
  'gonna', 'wanna', 'really', 'one', 'two', 'want', 'make', 'see', 'know', 'think',
  'going', 'yeah', 'okay', 'much', 'even', 'still', 'back', 'right', 'well', 'time',
  // chat noise / common stream slang that isn't sentiment-bearing
  'brb', 'idk', 'imo', 'tbh', 'nvm', 'xd', 'hey', 'bro', 'dude', 'man', 'chat', 'stream',
  'streamer', 'guys', 'plz', 'pls', 'thx', 'np', 'sus',
]

export const STOPWORDS = new Set(WORDS)
