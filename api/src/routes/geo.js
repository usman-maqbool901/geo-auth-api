const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$/;

function isValidIP(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const trimmed = ip.trim();
  return IPV4_REGEX.test(trimmed) || IPV6_REGEX.test(trimmed);
}

// In-memory cache for country centroids from REST Countries API (avoids repeated requests)
const countryCentroidCache = new Map();

const REST_COUNTRIES_BASE = 'https://restcountries.com/v3.1';

/**
 * Resolve country centroid via REST Countries API (free, no key).
 * Returns [lat, lng] or null. Results are cached in memory.
 */
async function getCountryCentroid(countryCode) {
  if (!countryCode || typeof countryCode !== 'string') return null;
  const key = countryCode.trim().toUpperCase().slice(0, 2);
  if (!/^[A-Z]{2}$/.test(key)) return null;

  const cached = countryCentroidCache.get(key);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(`${REST_COUNTRIES_BASE}/alpha/${encodeURIComponent(key)}?fields=latlng`);
    if (!res.ok) {
      countryCentroidCache.set(key, null);
      return null;
    }
    const data = await res.json();
    const latlng = Array.isArray(data?.latlng) && data.latlng.length >= 2
      ? [Number(data.latlng[0]), Number(data.latlng[1])]
      : null;
    if (latlng && Number.isFinite(latlng[0]) && Number.isFinite(latlng[1])) {
      countryCentroidCache.set(key, latlng);
      return latlng;
    }
  } catch (_) {
    // ignore fetch errors
  }
  countryCentroidCache.set(key, null);
  return null;
}

function parseLookupCoords(data) {
  if (!data) return null;
  if (data.loc && typeof data.loc === 'string') {
    const parts = data.loc.split(',');
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    }
  }
  const geo = data.geo;
  if (geo && typeof geo === 'object') {
    const lat = geo.latitude != null ? parseFloat(geo.latitude) : NaN;
    const lng = geo.longitude != null ? parseFloat(geo.longitude) : NaN;
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  }
  return null;
}

function flattenLookupResponse(data) {
  const flat = { ...data };
  if (data.geo && typeof data.geo === 'object') {
    Object.assign(flat, data.geo);
    delete flat.geo;
  }
  const coords = parseLookupCoords(data);
  if (coords) {
    flat.latitude = coords[0];
    flat.longitude = coords[1];
  }
  return flat;
}

router.get('/', auth, async (req, res) => {
  try {
    const ipParam = req.query.ip;
    const token = process.env.IPINFO_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'IPINFO_TOKEN not configured' });
    }

    let targetIp = 'me';
    if (ipParam) {
      if (!isValidIP(ipParam)) {
        return res.status(400).json({ error: 'Invalid IP address' });
      }
      targetIp = ipParam.trim();
    } else {
      const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip;
      if (clientIp && clientIp !== '::1' && clientIp !== '127.0.0.1') {
        const normalized = clientIp.replace(/^::ffff:/, '');
        if (isValidIP(normalized)) targetIp = normalized;
      }
    }

    const lookupUrl = `https://api.ipinfo.io/${encodeURIComponent(targetIp)}`;
    let response = await fetch(lookupUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    let data;
    if (response.ok) {
      data = await response.json();
      data = flattenLookupResponse(data);
      const hasCoords = Number.isFinite(data.latitude) && Number.isFinite(data.longitude);
      if (hasCoords) return res.json(data);
      const countryCode = data.country_code || data.country;
      const centroid = await getCountryCentroid(countryCode);
      if (centroid) {
        data.latitude = centroid[0];
        data.longitude = centroid[1];
        data.approximate = true;
        return res.json(data);
      }
    }

    const liteUrl = `https://api.ipinfo.io/lite/${encodeURIComponent(targetIp)}`;
    response = await fetch(liteUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: text || 'Failed to fetch geolocation',
      });
    }

    data = await response.json();
    const countryCode = data.country_code || data.country;
    const centroid = await getCountryCentroid(countryCode);
    if (centroid) {
      data.latitude = centroid[0];
      data.longitude = centroid[1];
      data.approximate = true;
    }
    res.json(data);
  } catch (err) {
    console.error('Geo error:', err);
    res.status(500).json({ error: 'Failed to fetch geolocation' });
  }
});

module.exports = router;
