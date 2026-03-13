/**
 * Converts latitude and longitude to tile coordinates for a given zoom level.
 * Based on the Slippy Map Tilenames algorithm used by OpenStreetMap.
 */
export function latLngToTile(lat: number, lng: number, zoom: number): [number, number] {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  // Clamp latitude to avoid infinity at poles
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const latRad = (clampedLat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return [x, y];
}

/**
 * Returns the OSM tile URL for given coordinates.
 */
export function getOsmTileUrl(z: number, x: number, y: number): string {
  const subdomains = ['a', 'b', 'c'];
  const s = subdomains[(x + y) % 3];
  return `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
}
