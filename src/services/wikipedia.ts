// Wikipedia API for artist information

export interface WikipediaArtistInfo {
  title: string;
  extract: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  content_urls?: {
    desktop: { page: string };
    mobile: { page: string };
  };
}

// Cache for Wikipedia info
const wikiCache = new Map<string, WikipediaArtistInfo | null>();

export async function getArtistWikipediaInfo(artistName: string): Promise<WikipediaArtistInfo | null> {
  const cacheKey = artistName.toLowerCase();
  
  // Check cache
  if (wikiCache.has(cacheKey)) {
    return wikiCache.get(cacheKey) || null;
  }
  
  try {
    // Try exact match first
    let response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artistName)}`,
      { headers: { 'Accept': 'application/json' } }
    );
    
    // If not found, try with "(band)" suffix
    if (!response.ok) {
      response = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artistName + ' (band)')}`,
        { headers: { 'Accept': 'application/json' } }
      );
    }
    
    // If still not found, try with "(musician)" suffix
    if (!response.ok) {
      response = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artistName + ' (musician)')}`,
        { headers: { 'Accept': 'application/json' } }
      );
    }
    
    if (!response.ok) {
      wikiCache.set(cacheKey, null);
      return null;
    }
    
    const data = await response.json();
    
    // Check if it's a disambiguation page or not about music
    if (data.type === 'disambiguation') {
      wikiCache.set(cacheKey, null);
      return null;
    }
    
    const info: WikipediaArtistInfo = {
      title: data.title,
      extract: data.extract || '',
      thumbnail: data.thumbnail,
      content_urls: data.content_urls,
    };
    
    wikiCache.set(cacheKey, info);
    return info;
  } catch (error) {
    console.error('Error fetching Wikipedia info:', error);
    wikiCache.set(cacheKey, null);
    return null;
  }
}
