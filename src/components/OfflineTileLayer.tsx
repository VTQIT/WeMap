import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { dbGet, dbSet } from '../db';

interface Props {
  url: string;
  attribution: string;
  onTileCached?: () => void;
}

export default function OfflineTileLayer({ url, attribution, onTileCached }: Props) {
  const map = useMap();

  useEffect(() => {
    const CustomLayer = L.TileLayer.extend({
      createTile(coords: any, done: any) {
        const tile = document.createElement('img');
        tile.setAttribute('role', 'presentation');
        tile.setAttribute('alt', '');
        tile.setAttribute('loading', 'lazy');
        
        if (isNaN(coords.x) || isNaN(coords.y) || isNaN(coords.z)) {
          tile.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
          done(null, tile);
          return tile;
        }

        const tileUrl = this.getTileUrl(coords);
        const key = `tile_${coords.z}_${coords.x}_${coords.y}`;

        dbGet(key).then((cached) => {
          if (cached) {
            tile.src = cached;
            done(null, tile);
          } else {
            fetch(tileUrl, { mode: 'cors' })
              .then((r) => r.blob())
              .then((blob) => {
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result as string;
                  dbSet(key, dataUrl).then(() => {
                    if (onTileCached) onTileCached();
                  }).catch(() => {});
                  tile.src = dataUrl;
                  done(null, tile);
                };
                reader.readAsDataURL(blob);
              })
              .catch(() => {
                // Fallback to transparent pixel if offline and not cached
                tile.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                done(null, tile);
              });
          }
        });

        return tile;
      },
    });

    const layer = new (CustomLayer as any)(url, {
      attribution,
      maxZoom: 19,
      crossOrigin: true,
    });

    layer.addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [map, url, attribution]);

  return null;
}
