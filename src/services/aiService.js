const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const PRIMARY_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemma-4-26b-a4b-it';

const aiSearchCache = new Map();
let discoveredFallbackModels = null;

async function getAvailableFallbackModels() {
  if (discoveredFallbackModels) return discoveredFallbackModels;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(GEMINI_API_KEY)}`
    );
    if (!res.ok) return ['gemini-3.8-flash'];
    const data = await res.json();
    const valid = (data.models || [])
      .filter(
        (m) =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent') &&
          (m.name.includes('flash') || m.name.includes('gemma'))
      )
      .map((m) => m.name.replace('models/', ''))
      .filter((name) => name !== PRIMARY_MODEL);

    discoveredFallbackModels = valid.length > 0 ? valid.slice(0, 2) : ['gemini-3.8-flash'];
    return discoveredFallbackModels;
  } catch {
    return ['gemini-3.8-flash'];
  }
}

function levenshtein(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

// 0ms local manual + fuzzy search
export function runManualFuzzySearch(query, accessibleLinks, folderMap) {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

  return accessibleLinks
    .map((link) => {
      const folderName = link.folderId ? folderMap[link.folderId] || '' : 'Instant Links';
      const titleLower = (link.title || '').toLowerCase();
      const urlLower = (link.url || '').toLowerCase();
      const tagsLower = (link.tags || []).map((t) => t.toLowerCase());
      const combinedText = `${titleLower} ${urlLower} ${tagsLower.join(' ')} ${folderName.toLowerCase()}`;
      const words = combinedText.split(/[^a-z0-9]+/).filter((w) => w.length >= 2);

      let score = 0;
      let matchType = '';

      if (titleLower.includes(cleanQuery)) {
        score += 100;
        matchType = 'Title match';
      } else if (urlLower.includes(cleanQuery) || tagsLower.some((t) => t.includes(cleanQuery))) {
        score += 80;
        matchType = 'URL / tag match';
      }

      for (const token of queryTokens) {
        if (combinedText.includes(token)) {
          score += 35;
          if (!matchType) matchType = `Matched "${token}"`;
        } else if (token.length >= 3) {
          const maxAllowedTypos = token.length <= 4 ? 1 : 2;
          const closeWord = words.find(
            (w) => Math.abs(w.length - token.length) <= maxAllowedTypos && levenshtein(token, w) <= maxAllowedTypos
          );
          if (closeWord) {
            score += 25;
            if (!matchType) matchType = `Matched ~${closeWord}`;
          }
        }
      }

      return { link, score, reason: matchType };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ link, reason }) => ({
      ...link,
      matchReason: reason,
      matchSource: 'manual'
    }));
}

async function callGeminiModel(modelName, prompt, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(new Error(`Timeout after ${timeoutMs}ms`)),
    timeoutMs
  );

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 512
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function searchLinksWithAI(query, accessibleLinks, folderMap) {
  if (!GEMINI_API_KEY || !accessibleLinks || accessibleLinks.length === 0) {
    return [];
  }

  const cacheKey = `${query.trim().toLowerCase()}::${accessibleLinks.length}`;
  if (aiSearchCache.has(cacheKey)) {
    return aiSearchCache.get(cacheKey);
  }

  // Compact catalog payload for faster token ingestion
  const catalog = accessibleLinks.slice(0, 150).map((l) => ({
    i: l.id,
    t: l.title,
    u: l.url,
    g: l.tags || [],
    f: l.folderId ? folderMap[l.folderId] || '' : 'Instant'
  }));

  const prompt = `Match bookmarks for query: "${query}". Handle typos & concepts. Return ONLY a JSON array (max 12): [{"id":"...","reason":"3-5 word match reason"}]. If none: [].
Data:${JSON.stringify(catalog)}`;

  const modelsToTry = [PRIMARY_MODEL];

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    try {
      const data = await callGeminiModel(model, prompt, i === 0 ? 4500 : 4000);
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      if (!Array.isArray(parsed)) return [];

      const linkById = new Map(accessibleLinks.map((l) => [l.id, l]));
      const results = [];

      for (const item of parsed) {
        const matchedLink = linkById.get(item.id);
        if (matchedLink) {
          results.push({
            ...matchedLink,
            matchReason: item.reason || 'Smart match',
            matchSource: 'ai'
          });
        }
      }

      aiSearchCache.set(cacheKey, results);
      return results;
    } catch {
      if (i === 0) {
        const fallbacks = await getAvailableFallbackModels();
        modelsToTry.push(...fallbacks);
      }
    }
  }

  // Silently return empty array so local fuzzy results display seamlessly with zero error banners
  return [];
}