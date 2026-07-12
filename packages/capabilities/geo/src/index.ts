import { StructuredAddress } from "./types.js";
import { logger } from "@money-matters/core";

const PLACE_CACHE = new Map<string, { data: StructuredAddress; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1_000; // 5 minutes

function setCacheEntry(placeId: string, data: StructuredAddress) {
  PLACE_CACHE.set(placeId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  if (PLACE_CACHE.size > 500) {
    const now = Date.now();
    for (const [key, entry] of PLACE_CACHE.entries()) {
      if (entry.expiresAt < now) PLACE_CACHE.delete(key);
    }
  }
}

function getCacheEntry(placeId: string): StructuredAddress | null {
  const entry = PLACE_CACHE.get(placeId);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    PLACE_CACHE.delete(placeId);
    return null;
  }
  return entry.data;
}

const PHOTON_BASE = 'https://photon.komoot.io';
const AU_BBOX = '113.338953078,-43.6345972634,153.569469029,-10.6681857235';

const STATE_LONG_TO_SHORT: Record<string, string> = {
  'New South Wales': 'NSW',
  'Victoria': 'VIC',
  'Queensland': 'QLD',
  'Western Australia': 'WA',
  'South Australia': 'SA',
  'Tasmania': 'TAS',
  'Australian Capital Territory': 'ACT',
  'Northern Territory': 'NT',
};

function normaliseState(raw: string): string {
  if (!raw) return 'NSW';
  const upper = raw.toUpperCase();
  if (['NSW','VIC','QLD','WA','SA','TAS','ACT','NT'].includes(upper)) return upper;
  return STATE_LONG_TO_SHORT[raw] ?? raw;
}

function parsePhotonFeature(feature: any, index: number): StructuredAddress {
  const props = feature.properties ?? {};
  const [lng, lat] = feature.geometry?.coordinates ?? [null, null];

  const streetNumber = props.housenumber ?? '';
  const streetName   = props.street ?? props.name ?? '';
  const street       = [streetNumber, streetName].filter(Boolean).join(' ');
  const suburb       = props.city ?? props.locality ?? props.district ?? props.name ?? '';
  const state        = normaliseState(props.state ?? '');
  const postcode     = props.postcode ?? '';
  const country      = props.country ?? 'Australia';

  const osmId  = `${props.osm_type ?? 'N'}${props.osm_id ?? index}`;
  const placeId = `photon_${osmId}`;

  const formattedAddress = [street, suburb, state, postcode, country]
    .filter(Boolean)
    .join(', ');

  return {
    street,
    suburb,
    state,
    postcode,
    country,
    formattedAddress,
    placeId,
    lat: typeof lat === 'number' ? lat : null,
    lng: typeof lng === 'number' ? lng : null,
  };
}

export async function getPlaceSuggestionsHandler(input: { query: string; countries: string[] }) {
  const isAuMode = input.countries.some((c) =>
    c.toUpperCase() === 'AU' || c.toUpperCase() === 'NZ'
  );

  const params = new URLSearchParams({
    q: input.query,
    limit: '5',
    lang: 'en',
  });

  if (isAuMode) {
    params.set('bbox', AU_BBOX);
  }

  try {
    const response = await fetch(
      `${PHOTON_BASE}/api/?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'MoneyMatters/1.0 (address-autocomplete)',
        },
        signal: AbortSignal.timeout(5_000),
      }
    );

    if (!response.ok) {
      logger.error(`Photon API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const features: any[] = data.features ?? [];

    const parsed = features
      .map((f, i) => parsePhotonFeature(f, i))
      .filter((p) => p.street || p.suburb)
      .slice(0, 5);

    for (const place of parsed) {
      if (place.placeId) setCacheEntry(place.placeId, place);
    }

    return parsed.map((p) => ({
      placeId: p.placeId ?? '',
      description: p.formattedAddress ?? '',
    }));
  } catch (error) {
    logger.error('Photon suggestions error:', error as any);
    return [];
  }
}

export async function getPlaceDetailsHandler(placeId: string) {
  if (!placeId) {
    throw new Error('placeIdRequired');
  }

  const cached = getCacheEntry(placeId);
  if (cached) return cached;

  throw new Error('addressDetailsNotFound');
}

export * from "./types.js";
