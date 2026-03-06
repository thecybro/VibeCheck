let patterns = null;
// LOading our words library
async function loadPatterns() {
  const response = await fetch(chrome.runtime.getURL('src/patterns.json'));
  patterns = await response.json();
}

loadPatterns();

const DEFAULT_SETTINGS = {
  enabled: true,
  apiKey: '',
  blockedEmotions: {
    anger: true,
    toxicity: true,
    sadness: false,
    fear: false,
    negativity: true,
    aggression: true,
    spam: false
  },
  whitelist: [],
  stats: {
    blocked: 0,
    analyzed: 0,
    revealed: 0
  },
  sensitivity: 'medium' // Defaults to medium
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('vibecheck_settings', (result) => {
    if (!result.vibecheck_settings) {
      chrome.storage.sync.set({ vibecheck_settings: DEFAULT_SETTINGS });
    }
  });
});

const analysisCache = new Map();
const CACHE_MAX_SIZE = 500;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_TEXT') {
    handleAnalysis(message.text, message.author, sendResponse);
    return true; 
  }

  if (message.type === 'GET_SETTINGS') {
    chrome.storage.sync.get('vibecheck_settings', (result) => {
      sendResponse(result.vibecheck_settings || DEFAULT_SETTINGS);
    });
    return true;
  }

  if (message.type === 'UPDATE_STATS') {
    updateStats(message.statType);
    sendResponse({ success: true });
    return true;
  }
});

async function handleAnalysis(text, author, sendResponse) {
  let settings = null; 
  try {
    settings = await getSettings();

    if (!settings.enabled) {
      sendResponse({ blocked: false, reason: 'Extension disabled' });
      return;
    }

    if (author && settings.whitelist.some(w =>
      w.toLowerCase() === author.toLowerCase()
    )) {
      sendResponse({ blocked: false, reason: 'Whitelisted user' });
      return;
    }

    const cacheKey = text.substring(0, 100);
    if (analysisCache.has(cacheKey)) {
      const cached = analysisCache.get(cacheKey);
      sendResponse(evaluateResult(cached, settings));
      return;
    }

    const apiKey = settings.apiKey;
    if (!apiKey) {
      const result = localAnalysis(text);
      cacheResult(cacheKey, result);
      sendResponse(evaluateResult(result, settings));
      return;
    }

    const result = await analyzeWithAI(text, apiKey);
    cacheResult(cacheKey, result);
    sendResponse(evaluateResult(result, settings));

  } catch (error) {
    console.error('VibeCheck analysis error:', error);
    if (settings && patterns) {
      const result = localAnalysis(text);
      sendResponse(evaluateResult(result, settings));
    } else {
      sendResponse({ blocked: false, reason: 'Analysis unavailable' });
    }
  }
}

async function analyzeWithAI(text, apiKey) {
  console.log('Using API key:', JSON.stringify(apiKey));

  const prompt = `Analyze the emotional tone and content of this social media post. Return ONLY a JSON object with no markdown, no explanation:

  Post: "${text.substring(0, 500)}"

  Return this exact JSON structure:
  {
    "emotions": {
      "anger": 0-100,
      "toxicity": 0-100,
      "sadness": 0-100,
      "fear": 0-100,
      "negativity": 0-100,
      "aggression": 0-100,
      "spam": 0-100
    },
    "overall": "positive|neutral|negative",
    "dominant": "the single most prominent emotion/quality",
    "confidence": 0-100
  }`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
  const errBody = await response.json();
  console.error('Anthropic API error:', response.status, JSON.stringify(errBody));
  throw new Error('API request failed');
}

  const data = await response.json();
  const rawText = data.content[0].text;

  try {
    return JSON.parse(rawText.replace(/```json|```/g, '').trim());
  } catch {
    return localAnalysis(text);
  }
}

// If API Key is not given
function localAnalysis(text) {
  if (!patterns) return { emotions: {}, overall: 'neutral', dominant: 'neutral', confidence: 0 };
  
  const lower = text.toLowerCase();
  const emotions = {};
  for (const [emotion, words] of Object.entries(patterns)) {
    const matches = words.filter(w => lower.includes(w)).length;
    emotions[emotion] = matches <= 1 ? 0: Math.min(100, matches * 25);
  }

  const maxScore = Math.max(...Object.values(emotions));
  const dominant = Object.entries(emotions).find(([, v]) => v === maxScore)?.[0] || 'neutral';
  const overall = maxScore > 60 ? 'negative' : maxScore > 30 ? 'neutral' : 'positive';

  return { emotions, overall, dominant, confidence: 70 };
}

function evaluateResult(result, settings) {
  const sensitivity = { low: 70, medium: 50, high: 30 }[settings.sensitivity] || 50;
  const blocked = settings.blockedEmotions;

  for (const [emotion, score] of Object.entries(result.emotions || {})) {
    if (blocked[emotion] && score >= sensitivity) {
      return {
        blocked: true,
        emotion: emotion,
        score: score,
        overall: result.overall,
        dominant: result.dominant
      };
    }
  }

  return { blocked: false, overall: result.overall };
}

function cacheResult(key, result) {
  if (analysisCache.size >= CACHE_MAX_SIZE) {
    const firstKey = analysisCache.keys().next().value;
    analysisCache.delete(firstKey);
  }
  analysisCache.set(key, result);
}

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('vibecheck_settings', (result) => {
      resolve(result.vibecheck_settings || DEFAULT_SETTINGS);
    });
  });
}

function updateStats(statType) {
  chrome.storage.sync.get('vibecheck_settings', (result) => {
    const settings = result.vibecheck_settings || DEFAULT_SETTINGS;
    if (settings.stats[statType] !== undefined) {
      settings.stats[statType]++;
      chrome.storage.sync.set({ vibecheck_settings: settings });
    }
  });
}
