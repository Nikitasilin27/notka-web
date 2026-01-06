// Wikipedia API for artist information
import { logger } from '../utils/logger';

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

export async function getArtistWikipediaInfo(
  artistName: string, 
  lang: 'ru' | 'en' = 'en'
): Promise<WikipediaArtistInfo | null> {
  const cacheKey = `${artistName.toLowerCase()}_${lang}`;
  
  // Check cache
  if (wikiCache.has(cacheKey)) {
    return wikiCache.get(cacheKey) || null;
  }
  
  const baseUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary`;
  
  try {
    // Try exact match first
    let response = await fetch(
      `${baseUrl}/${encodeURIComponent(artistName)}`,
      { headers: { 'Accept': 'application/json' } }
    );
    
    // If not found, try with "(band)" suffix
    if (!response.ok) {
      const bandSuffix = lang === 'ru' ? ' (группа)' : ' (band)';
      response = await fetch(
        `${baseUrl}/${encodeURIComponent(artistName + bandSuffix)}`,
        { headers: { 'Accept': 'application/json' } }
      );
    }
    
    // If still not found, try with "(musician)" suffix
    if (!response.ok) {
      const musicianSuffix = lang === 'ru' ? ' (музыкант)' : ' (musician)';
      response = await fetch(
        `${baseUrl}/${encodeURIComponent(artistName + musicianSuffix)}`,
        { headers: { 'Accept': 'application/json' } }
      );
    }
    
    // If Russian not found, fallback to English
    if (!response.ok && lang === 'ru') {
      return getArtistWikipediaInfo(artistName, 'en');
    }
    
    if (!response.ok) {
      wikiCache.set(cacheKey, null);
      return null;
    }
    
    const data = await response.json();
    
    // Check if it's a disambiguation page
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
    logger.error('Error fetching Wikipedia info:', error);
    wikiCache.set(cacheKey, null);
    return null;
  }
}
