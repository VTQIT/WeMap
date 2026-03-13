import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, Marker, Popup, Rectangle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Search, 
  Map as MapIcon, 
  Store, 
  MapPin, 
  Download, 
  Settings, 
  Plus, 
  X, 
  Navigation, 
  Trash2, 
  Check, 
  AlertCircle,
  ChevronRight,
  Clock,
  Phone,
  Info,
  Sun,
  Moon,
  Eye,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MUNICIPALITIES, CAT_COLORS } from './constants';
import { Business, Municipality, PanelType } from './types';
import OfflineTileLayer from './components/OfflineTileLayer';
import { dbClear, dbCount, dbSet, dbGet, dbGetTotalSize, dbDelete } from './db';
import { latLngToTile, getOsmTileUrl } from './utils/geo.ts';

const DL_ZOOM_LEVELS = [10, 11, 12, 13, 14, 15];
const CONCURRENT_DOWNLOADS = 6;
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    const isValid = (c: any) => c && typeof c[0] === 'number' && !isNaN(c[0]) && typeof c[1] === 'number' && !isNaN(c[1]);
    const isZoomValid = typeof zoom === 'number' && !isNaN(zoom);
    if (isValid(center) && isZoomValid) {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function App() {
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [businesses, setBusinesses] = useState<Business[]>(() => {
    try {
      const saved = localStorage.getItem('wemap_biz');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse wemap_biz', e);
    }
    
    // Default sample data
    return [
      { id: '1', name: 'Cantilan Public Market', cat: '🛒', muniName: 'Cantilan', lat: 9.0270, lng: 125.9885, addr: 'Poblacion, Cantilan', hours: 'Daily 5am–6pm', ts: Date.now() },
      { id: '2', name: 'Lanuza Surf Resort', cat: '🏨', muniName: 'Lanuza', lat: 9.1600, lng: 126.0165, phone: '+63 912 345 6789', addr: 'Barangay Buenavista, Lanuza', hours: 'Open 24hrs', ts: Date.now() },
      { id: '3', name: 'Madrid Rural Health Unit', cat: '🏥', muniName: 'Madrid', lat: 8.8930, lng: 125.9820, phone: '+63 908 123 4567', addr: 'Poblacion, Madrid', hours: 'Mon–Fri 8am–5pm', ts: Date.now() },
      { id: '4', name: 'Carascal Gas Station', cat: '⛽', muniName: 'Carascal', lat: 9.2075, lng: 125.9540, addr: 'National Highway, Carascal', hours: '6am–9pm', ts: Date.now() },
      { id: '5', name: 'Carmen Municipal Hall', cat: '🏛️', muniName: 'Carmen', lat: 8.7950, lng: 125.9730, phone: '+63 917 000 0001', addr: 'Poblacion, Carmen', hours: 'Mon–Fri 8am–5pm', ts: Date.now() },
      { id: '6', name: 'WeMap Café & Co-Work', cat: '🍽️', muniName: 'Cantilan', lat: 9.0295, lng: 125.9900, phone: '+63 912 000 1111', addr: 'J.P. Rizal St., Cantilan', hours: '8am–10pm daily', ts: Date.now() },
    ];
  });
  const [cachedMunis, setCachedMunis] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('wemap_cached');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse wemap_cached', e);
      return [];
    }
  });
  const [mapCenter, setMapCenter] = useState<[number, number]>([9.0281, 125.9889]);
  const [mapZoom, setMapZoom] = useState(11);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheInfo, setCacheInfo] = useState('Calculating...');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [toast, setToast] = useState<string | null>(null);
  const [selectedMuniId, setSelectedMuniId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [mapBrightness, setMapBrightness] = useState(100);
  const [isNightMode, setIsNightMode] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form states for adding business
  const [newBiz, setNewBiz] = useState<Partial<Business>>({
    cat: '🛒',
    muniName: 'Cantilan'
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    updateCacheInfo();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('wemap_biz', JSON.stringify(businesses));
  }, [businesses]);

  useEffect(() => {
    localStorage.setItem('wemap_cached', JSON.stringify(cachedMunis));
  }, [cachedMunis]);

  const handleSync = async () => {
    if (!isOnline) {
      showToast('⚠️ Offline: Cannot sync data');
      return;
    }
    setIsSyncing(true);
    // Simulate background sync with a server
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSyncing(false);
    showToast('🔄 Data synced successfully');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const updateCacheInfo = async () => {
    const count = await dbCount();
    const totalSize = await dbGetTotalSize();
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(1);
    setCacheInfo(`${count} tiles cached (${sizeInMB} MB total)`);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const results: any[] = [];
    MUNICIPALITIES.forEach(m => {
      if (m.name.toLowerCase().includes(q.toLowerCase())) {
        results.push({ type: 'Municipality', id: m.id, label: m.name, sub: m.province, lat: m.lat, lng: m.lng, zoom: m.zoom });
      }
    });
    businesses.forEach((b, i) => {
      if ((b.name.toLowerCase().includes(q.toLowerCase()) || (b.addr && b.addr.toLowerCase().includes(q.toLowerCase()))) && 
          typeof b.lat === 'number' && !isNaN(b.lat) && typeof b.lng === 'number' && !isNaN(b.lng)) {
        results.push({ type: 'Business', label: b.name, sub: b.muniName + ' · ' + b.cat, lat: b.lat, lng: b.lng, zoom: 16, bizIdx: i });
      }
    });
    setSearchResults(results.slice(0, 6));
  };

  const selectResult = (r: any) => {
    const isValid = (loc: any) => loc && typeof loc.lat === 'number' && !isNaN(loc.lat) && typeof loc.lng === 'number' && !isNaN(loc.lng);
    if (!isValid(r)) {
      showToast('⚠️ Invalid location data');
      return;
    }
    setSearchQuery(r.label);
    setSearchResults([]);
    if (r.type === 'Municipality') {
      setSelectedMuniId(r.id);
    } else {
      setSelectedMuniId(null);
    }
    setMapCenter([r.lat, r.lng]);
    setMapZoom(r.zoom || 14);
    setActivePanel(null);
  };

  const saveBusiness = () => {
    if (!newBiz.name) {
      showToast('⚠️ Enter a business name');
      return;
    }
    const muni = MUNICIPALITIES.find(m => m.name === newBiz.muniName) || MUNICIPALITIES[0];
    
    // Ensure coordinates are valid numbers
    const lat = typeof newBiz.lat === 'number' && !isNaN(newBiz.lat) ? newBiz.lat : muni.lat + (Math.random() - 0.5) * 0.02;
    const lng = typeof newBiz.lng === 'number' && !isNaN(newBiz.lng) ? newBiz.lng : muni.lng + (Math.random() - 0.5) * 0.02;

    const biz: Business = {
      id: Math.random().toString(36).substr(2, 9),
      name: newBiz.name,
      lat,
      lng,
      cat: newBiz.cat || '📌',
      muniName: newBiz.muniName || 'Cantilan',
      phone: newBiz.phone,
      addr: newBiz.addr,
      hours: newBiz.hours,
      ts: Date.now()
    };
    setBusinesses([biz, ...businesses]);
    setNewBiz({ cat: '🛒', muniName: 'Cantilan' });
    setActivePanel(null);
    setMapCenter([biz.lat, biz.lng]);
    setMapZoom(16);
    showToast('✅ Business added to map');
  };

  const deleteBiz = (id: string) => {
    setBusinesses(businesses.filter(b => b.id !== id));
    showToast('🗑️ Business removed');
  };

  const clearCache = async () => {
    await dbClear();
    setCachedMunis([]);
    updateCacheInfo();
    showToast('🗑️ All tile cache cleared');
  };

  const deleteMuniCache = async (muni: Municipality) => {
    const bounds = muni.bounds;
    const [s, w, n, e] = [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]];
    
    const keysToDelete: string[] = [];
    DL_ZOOM_LEVELS.forEach(z => {
      const [x1, y1] = latLngToTile(n, w, z);
      const [x2, y2] = latLngToTile(s, e, z);
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
          keysToDelete.push(`tile_${z}_${x}_${y}`);
        }
      }
    });

    await Promise.all(keysToDelete.map(key => dbDelete(key)));
    setCachedMunis(prev => prev.filter(id => id !== muni.id));
    updateCacheInfo();
    showToast(`🗑️ ${muni.name} cache removed`);
  };

  const downloadMuni = async (muni: Municipality) => {
    if (downloadingId) return;
    if (!navigator.onLine) {
      showToast('⚠️ Internet connection required for download');
      return;
    }
    
    setDownloadingId(muni.id);
    showToast(`📥 Starting download for ${muni.name}...`);

    const bounds = muni.bounds;
    const [s, w, n, e] = [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]];
    
    const queue: { z: number; x: number; y: number }[] = [];
    DL_ZOOM_LEVELS.forEach(z => {
      const [x1, y1] = latLngToTile(n, w, z);
      const [x2, y2] = latLngToTile(s, e, z);
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
          queue.push({ z, x, y });
        }
      }
    });

    const total = queue.length;
    setDownloadProgress({ done: 0, total });
    let done = 0;

    const downloadTile = async (tile: { z: number; x: number; y: number }) => {
      const key = `tile_${tile.z}_${tile.x}_${tile.y}`;
      const existing = await dbGet(key);
      if (existing) return;

      const url = getOsmTileUrl(tile.z, tile.x, tile.y);
      try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) return;
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        await dbSet(key, dataUrl);
      } catch (err) {
        console.error('Tile download failed', err);
      }
    };

    // Process queue with concurrency
    const workers = Array.from({ length: CONCURRENT_DOWNLOADS }, async () => {
      while (queue.length > 0) {
        const tile = queue.shift();
        if (!tile) break;
        await downloadTile(tile);
        done++;
        setDownloadProgress({ done, total });
      }
    });

    await Promise.all(workers);

    setCachedMunis(prev => [...new Set([...prev, muni.id])]);
    setDownloadingId(null);
    updateCacheInfo();
    showToast(`✅ ${muni.name} ready offline`);
  };

  const handleMuniClick = (m: Municipality) => {
    setSelectedMuniId(m.id);
    setMapCenter([m.lat, m.lng]);
    setMapZoom(m.zoom);
    showToast(`📍 Exploring ${m.name}`);
  };

  const createBizIcon = (cat: string) => {
    const color = CAT_COLORS[cat] || '#aaa';
    return L.divIcon({
      className: '',
      html: `<div style="
        width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        background:${color}22;border:2px solid ${color};
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 3px 12px ${color}44;
      "><span style="transform:rotate(45deg);font-size:13px;line-height:1">${cat}</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -34]
    });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a0a12] text-white font-['Exo_2']">
      {/* Map */}
      <div 
        className="absolute inset-0 z-0 transition-all duration-500"
        style={{ 
          filter: `${isNightMode ? 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)' : ''} brightness(${mapBrightness}%)` 
        }}
      >
        <MapContainer 
          center={(typeof mapCenter[0] === 'number' && !isNaN(mapCenter[0]) && typeof mapCenter[1] === 'number' && !isNaN(mapCenter[1])) ? mapCenter : [9.0281, 125.9889]} 
          zoom={!isNaN(mapZoom) ? mapZoom : 11} 
          zoomControl={false} 
          className="w-full h-full"
          attributionControl={false}
          style={{ touchAction: 'none' }}
        >
          <OfflineTileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
            onTileCached={updateCacheInfo}
          />
          <MapController center={mapCenter} zoom={mapZoom} />
          
          {MUNICIPALITIES.filter(m => 
            m.bounds && 
            m.bounds[0] && !isNaN(m.bounds[0][0]) && !isNaN(m.bounds[0][1]) &&
            m.bounds[1] && !isNaN(m.bounds[1][0]) && !isNaN(m.bounds[1][1])
          ).map(m => (
            <Rectangle 
              key={m.id}
              bounds={m.bounds}
              eventHandlers={{
                click: () => handleMuniClick(m)
              }}
              pathOptions={{
                color: m.color,
                weight: selectedMuniId === m.id ? 3 : 1,
                opacity: selectedMuniId === m.id ? 0.8 : 0.4,
                fillColor: m.color,
                fillOpacity: selectedMuniId === m.id ? 0.15 : 0.04,
                dashArray: selectedMuniId === m.id ? '0' : '4 6'
              }}
            />
          ))}

          {businesses.filter(b => 
            (currentFilter === 'all' || b.cat === currentFilter) && 
            typeof b.lat === 'number' && !isNaN(b.lat) && 
            typeof b.lng === 'number' && !isNaN(b.lng)
          ).map(biz => (
            <Marker 
              key={biz.id} 
              position={[biz.lat, biz.lng]} 
              icon={createBizIcon(biz.cat)}
            >
              <Popup className="biz-popup-container">
                <div className="min-w-[200px] p-1">
                  <div className="text-[9px] font-extralight tracking-[2px] uppercase mb-1" style={{ color: CAT_COLORS[biz.cat] }}>
                    {biz.cat} {biz.muniName}
                  </div>
                  <h3 className="text-[13px] font-light tracking-wide mb-1">{biz.name}</h3>
                  {biz.phone && (
                    <div className="flex items-center gap-2 mt-1 text-[11px] font-extralight text-white/70">
                      <Phone size={11} />
                      <a href={`tel:${biz.phone}`} className="hover:text-white">{biz.phone}</a>
                    </div>
                  )}
                  {biz.addr && (
                    <div className="flex items-center gap-2 mt-1 text-[11px] font-extralight text-white/70">
                      <MapPin size={11} />
                      <span>{biz.addr}</span>
                    </div>
                  )}
                  {biz.hours && (
                    <div className="flex items-center gap-2 mt-1 text-[11px] font-extralight text-white/70">
                      <Clock size={11} />
                      <span>{biz.hours}</span>
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={() => window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${biz.lat},${biz.lng}`, '_blank')}
                      className="flex-1 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[9px] font-light tracking-widest uppercase hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye size={10} />
                      Street View
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${biz.lat},${biz.lng}`, '_blank')}
                      className="flex-1 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[9px] font-light tracking-widest uppercase hover:bg-white/10 transition-colors"
                    >
                      Navigate
                    </button>
                    <button 
                      onClick={() => deleteBiz(biz.id)}
                      className="px-2 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 bg-[#0f0f19]/72 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="text-[22px] font-thin tracking-[8px] uppercase">
            WE<span className="font-light text-[#4fc3f7]">MAP</span>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={14} />
            <input 
              type="text" 
              placeholder="Search places, businesses..."
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-[13px] font-light focus:outline-none focus:border-[#4fc3f7] transition-all"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-[#12121e]/85 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden z-[2000]"
                >
                  {searchResults.map((r, i) => (
                    <div 
                      key={i} 
                      className="p-3 border-b border-white/5 last:border-none hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => selectResult(r)}
                    >
                      <div className="text-[10px] font-extralight text-white/40 tracking-[2px] uppercase">{r.type}</div>
                      <div className="text-[13px] font-light mt-0.5">{r.label}</div>
                      <div className="text-[10px] font-extralight text-white/40 mt-0.5">{r.sub}</div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="absolute top-[85px] left-4 right-4 z-[999] pointer-events-none flex gap-2">
        <div className="inline-flex items-center gap-1.5 bg-[#12121e]/85 backdrop-blur-md border border-white/5 rounded-full px-3 py-1.5 text-[10px] font-light tracking-wider uppercase text-white/40 pointer-events-auto">
          <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_6px] ${isOnline ? 'bg-[#7cf7b8] shadow-[#7cf7b8]' : 'bg-[#f77c7c] shadow-[#f77c7c]'}`} />
          {isOnline ? 'Online' : 'Offline'}
        </div>
        <div className="inline-flex items-center gap-1.5 bg-[#12121e]/85 backdrop-blur-md border border-white/5 rounded-full px-3 py-1.5 text-[10px] font-light tracking-wider uppercase text-white/40 pointer-events-auto">
          <MapPin size={10} />
          Surigao del Sur
        </div>
        <button 
          onClick={handleSync}
          className={`inline-flex items-center gap-1.5 bg-[#12121e]/85 backdrop-blur-md border border-white/5 rounded-full px-3 py-1.5 text-[10px] font-light tracking-wider uppercase text-white/40 pointer-events-auto transition-all active:scale-95 ${isSyncing ? 'text-[#4fc3f7]' : ''}`}
        >
          <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Syncing...' : 'Sync'}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-[100px] right-4 z-[999] flex flex-col gap-3">
        <button 
          onClick={() => {
            window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${mapCenter[0]},${mapCenter[1]}`, '_blank');
          }}
          className="w-10 h-10 rounded-full border border-white/10 bg-[#0f0f19]/72 backdrop-blur-md flex items-center justify-center text-white/60 hover:text-[#4fc3f7] hover:border-[#4fc3f7] transition-all"
          title="Open Street View"
        >
          <Eye size={18} />
        </button>
        <button 
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(pos => {
                const { latitude, longitude } = pos.coords;
                if (typeof latitude === 'number' && !isNaN(latitude) && typeof longitude === 'number' && !isNaN(longitude)) {
                  setMapCenter([latitude, longitude]);
                  setMapZoom(15);
                  showToast('📍 Centered to your location');
                } else {
                  showToast('⚠️ Could not determine precise location');
                }
              }, () => showToast('⚠️ Location access denied'));
            }
          }}
          className="w-10 h-10 rounded-full border border-white/10 bg-[#0f0f19]/72 backdrop-blur-md flex items-center justify-center text-white/60 hover:text-[#4fc3f7] hover:border-[#4fc3f7] transition-all"
        >
          <Navigation size={18} />
        </button>
        <button 
          onClick={() => setActivePanel('add-biz')}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-[#4fc3f7] to-[#7c6af7] flex items-center justify-center shadow-[0_4px_24px_rgba(79,195,247,0.35)] hover:scale-105 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-[#0f0f19]/72 backdrop-blur-xl border-t border-white/5 flex justify-around items-center px-2 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
        {[
          { id: null, icon: MapIcon, label: 'Map' },
          { id: 'biz', icon: Store, label: 'Business' },
          { id: 'muni', icon: MapPin, label: 'Areas' },
          { id: 'offline', icon: Download, label: 'Offline' },
          { id: 'settings', icon: Settings, label: 'Settings' }
        ].map(item => (
          <button 
            key={item.label}
            onClick={() => setActivePanel(item.id as PanelType)}
            className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors ${activePanel === item.id ? 'text-[#4fc3f7]' : 'text-white/40'}`}
          >
            <item.icon size={20} className={activePanel === item.id ? 'opacity-100' : 'opacity-40'} />
            <span className="text-[9px] font-light tracking-[1.5px] uppercase">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Panels Overlay */}
      <AnimatePresence>
        {activePanel && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePanel(null)}
              className="absolute inset-0 z-[1999] bg-black/50"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 z-[2000] bg-[#12121e]/85 backdrop-blur-3xl border-t border-white/10 rounded-t-[20px] max-h-[88vh] overflow-y-auto"
            >
              <div className="w-9 h-1 bg-white/15 rounded-full mx-auto mt-3" />
              
              {/* Add Business Panel */}
              {activePanel === 'add-biz' && (
                <div className="p-5">
                  <div className="flex justify-between items-center mb-6">
                    <div className="text-[11px] font-extralight tracking-[4px] uppercase text-white/40">Add Business</div>
                    <button onClick={() => setActivePanel(null)} className="p-1.5 rounded-full bg-white/5"><X size={14} /></button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-light tracking-[2px] uppercase text-white/40 mb-1.5">Business Name</label>
                      <input 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[13px] font-light focus:border-[#4fc3f7] outline-none"
                        placeholder="e.g. Cantilan General Merchandise"
                        value={newBiz.name || ''}
                        onChange={e => setNewBiz({...newBiz, name: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-light tracking-[2px] uppercase text-white/40 mb-1.5">Category</label>
                        <select 
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[13px] font-light focus:border-[#4fc3f7] outline-none appearance-none"
                          value={newBiz.cat}
                          onChange={e => setNewBiz({...newBiz, cat: e.target.value})}
                        >
                          {Object.keys(CAT_COLORS).map(cat => (
                            <option key={cat} value={cat}>{cat} {cat === '🛒' ? 'Retail' : cat === '🍽️' ? 'Food' : cat === '🏥' ? 'Health' : 'Other'}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-light tracking-[2px] uppercase text-white/40 mb-1.5">Municipality</label>
                        <select 
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[13px] font-light focus:border-[#4fc3f7] outline-none appearance-none"
                          value={newBiz.muniName}
                          onChange={e => setNewBiz({...newBiz, muniName: e.target.value})}
                        >
                          {MUNICIPALITIES.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-light tracking-[2px] uppercase text-white/40 mb-1.5">Phone / Contact</label>
                      <input 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[13px] font-light focus:border-[#4fc3f7] outline-none"
                        placeholder="+63 9XX XXX XXXX"
                        value={newBiz.phone || ''}
                        onChange={e => setNewBiz({...newBiz, phone: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-light tracking-[2px] uppercase text-white/40 mb-1.5">Address / Location Notes</label>
                      <textarea 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[13px] font-light focus:border-[#4fc3f7] outline-none h-20 resize-none"
                        placeholder="Street, barangay, near landmark..."
                        value={newBiz.addr || ''}
                        onChange={e => setNewBiz({...newBiz, addr: e.target.value})}
                      />
                    </div>
                    <p className="text-[10px] font-extralight text-white/40 tracking-wider">
                      📍 The business will be placed near the municipality center. You can move it later.
                    </p>
                    <button 
                      onClick={saveBusiness}
                      className="w-full py-4 rounded-full bg-gradient-to-r from-[#4fc3f7] to-[#7c6af7] text-[12px] font-light tracking-[2px] uppercase shadow-lg shadow-[#4fc3f7]/20"
                    >
                      Save to Map
                    </button>
                  </div>
                </div>
              )}

              {/* Business List Panel */}
              {activePanel === 'biz' && (
                <div className="pb-10">
                  <div className="p-5 pb-2 flex justify-between items-center">
                    <div className="text-[11px] font-extralight tracking-[4px] uppercase text-white/40">Businesses</div>
                    <button onClick={() => setActivePanel(null)} className="p-1.5 rounded-full bg-white/5"><X size={14} /></button>
                  </div>
                  <div className="flex gap-2 px-5 py-3 overflow-x-auto no-scrollbar">
                    {['all', '🛒', '🍽️', '🏥', '🏨', '⛽', '🏦', '🔧'].map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setCurrentFilter(cat)}
                        className={`flex-shrink-0 px-4 py-1.5 rounded-full border text-[10px] font-light tracking-widest uppercase transition-all ${currentFilter === cat ? 'border-[#4fc3f7] text-[#4fc3f7] bg-[#4fc3f7]/10' : 'border-white/10 text-white/40'}`}
                      >
                        {cat === 'all' ? 'All' : cat}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2">
                    {businesses.filter(b => currentFilter === 'all' || b.cat === currentFilter).length === 0 ? (
                      <div className="py-20 text-center text-white/20">
                        <Store size={48} className="mx-auto mb-4 opacity-10" />
                        <p className="text-[11px] font-extralight tracking-widest">No businesses found</p>
                      </div>
                    ) : (
                      businesses.filter(b => currentFilter === 'all' || b.cat === currentFilter).map(biz => (
                        <div 
                          key={biz.id} 
                          className="flex items-center gap-4 px-5 py-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                          onClick={() => {
                            if (typeof biz.lat === 'number' && !isNaN(biz.lat) && typeof biz.lng === 'number' && !isNaN(biz.lng)) {
                              setMapCenter([biz.lat, biz.lng]);
                              setMapZoom(16);
                              setActivePanel(null);
                            } else {
                              showToast('⚠️ Business location is invalid');
                            }
                          }}
                        >
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-white/5 border border-white/10" style={{ borderColor: `${CAT_COLORS[biz.cat]}33`, color: CAT_COLORS[biz.cat] }}>
                            {biz.cat}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[14px] font-light truncate">{biz.name}</h4>
                            <p className="text-[10px] font-extralight text-white/40 mt-0.5">{biz.muniName} {biz.addr && `· ${biz.addr}`}</p>
                          </div>
                          <ChevronRight size={14} className="opacity-20" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Municipalities Panel */}
              {activePanel === 'muni' && (
                <div className="p-5 pb-10">
                  <div className="flex justify-between items-center mb-6">
                    <div className="text-[11px] font-extralight tracking-[4px] uppercase text-white/40">Municipalities</div>
                    <button onClick={() => setActivePanel(null)} className="p-1.5 rounded-full bg-white/5"><X size={14} /></button>
                  </div>
                  <div className="space-y-3">
                    {MUNICIPALITIES.map(m => (
                      <div key={m.id} className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                        <div 
                          className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5 transition-colors"
                          onClick={() => handleMuniClick(m)}
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-xl">
                            {m.icon}
                          </div>
                          <div className="flex-1">
                            <div className="text-[14px] font-light">{m.name}</div>
                            <div className="text-[10px] font-extralight text-white/40 mt-0.5">{m.desc} · {m.barangays} brgys</div>
                          </div>
                          <ChevronRight size={14} className="opacity-20" />
                        </div>
                        <div className="flex gap-2 p-3 pt-0">
                          <button 
                            onClick={() => handleMuniClick(m)}
                            className="flex-1 py-2 rounded-lg border border-white/10 text-[9px] font-light tracking-widest uppercase text-white/60 hover:text-[#4fc3f7] hover:border-[#4fc3f7] transition-all"
                          >
                            Explore
                          </button>
                          <button 
                            onClick={() => {
                              setNewBiz({...newBiz, muniName: m.name});
                              setActivePanel('add-biz');
                            }}
                            className="flex-1 py-2 rounded-lg border border-white/10 text-[9px] font-light tracking-widest uppercase text-white/60 hover:text-[#4fc3f7] hover:border-[#4fc3f7] transition-all"
                          >
                            Add Biz
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Offline Panel */}
              {activePanel === 'offline' && (
                <div className="p-5 pb-10">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-[11px] font-extralight tracking-[4px] uppercase text-white/40">Offline Maps</div>
                    <button onClick={() => setActivePanel(null)} className="p-1.5 rounded-full bg-white/5"><X size={14} /></button>
                  </div>
                  <div className="bg-[#4fc3f7]/5 border border-[#4fc3f7]/10 rounded-2xl p-4 mb-6 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-light tracking-[2px] uppercase text-[#4fc3f7]/60 mb-1">Storage Used</div>
                      <div className="text-[16px] font-light text-[#4fc3f7]">{cacheInfo.split('(')[1]?.replace(')', '') || '0.0 MB'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-light tracking-[2px] uppercase text-white/20 mb-1">Total Tiles</div>
                      <div className="text-[16px] font-light text-white/40">{cacheInfo.split(' ')[0] || '0'}</div>
                    </div>
                  </div>
                  <p className="text-[11px] font-extralight text-white/40 leading-relaxed tracking-wide mb-6">
                    Download map tiles for each municipality to use WeMap without internet connection. Tiles are stored on your device.
                  </p>
                  <div className="space-y-3">
                    {MUNICIPALITIES.map(m => {
                      const isCached = cachedMunis.includes(m.id);
                      return (
                        <div key={m.id} className="relative bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl">
                            {m.icon}
                          </div>
                          <div className="flex-1">
                            <div className="text-[14px] font-light">{m.name}</div>
                            <div className="text-[10px] font-extralight text-white/40 mt-0.5">
                              {isCached ? <span className="text-[#7cf7b8]">✅ Offline Ready</span> : '~12 MB · z10–z15'}
                            </div>
                          </div>
                          <button 
                            disabled={!!downloadingId}
                            onClick={() => {
                              if (isCached) {
                                deleteMuniCache(m);
                              } else {
                                downloadMuni(m);
                              }
                            }}
                            className={`p-2.5 rounded-xl border transition-all ${isCached ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-[#4fc3f7]/30 text-[#4fc3f7] bg-[#4fc3f7]/10'} ${downloadingId === m.id ? 'animate-pulse' : ''}`}
                          >
                            {isCached ? <Trash2 size={16} /> : <Download size={16} />}
                          </button>
                          
                          {downloadingId === m.id && (
                            <div className="absolute bottom-0 left-0 right-0 px-4 pb-1">
                              <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                  className="h-full bg-[#4fc3f7]"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(downloadProgress.done / downloadProgress.total) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Settings Panel */}
              {activePanel === 'settings' && (
                <div className="p-5 pb-10">
                  <div className="flex justify-between items-center mb-6">
                    <div className="text-[11px] font-extralight tracking-[4px] uppercase text-white/40">Settings</div>
                    <button onClick={() => setActivePanel(null)} className="p-1.5 rounded-full bg-white/5"><X size={14} /></button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between py-4 border-b border-white/5">
                      <div>
                        <div className="text-[14px] font-light">Night Mode</div>
                        <div className="text-[10px] font-extralight text-white/40 mt-0.5 tracking-wider">Invert map colors for low light</div>
                      </div>
                      <button 
                        onClick={() => setIsNightMode(!isNightMode)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${isNightMode ? 'bg-[#4fc3f7]' : 'bg-white/10'}`}
                      >
                        <motion.div 
                          className="absolute top-1 left-1 w-3 h-3 rounded-full bg-white"
                          animate={{ x: isNightMode ? 20 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>

                    <div className="py-4 border-b border-white/5">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <div className="text-[14px] font-light">Map Brightness</div>
                          <div className="text-[10px] font-extralight text-white/40 mt-0.5 tracking-wider">Adjust light levels</div>
                        </div>
                        <div className="text-[12px] font-light text-[#4fc3f7]">{mapBrightness}%</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Sun size={14} className="text-white/20" />
                        <input 
                          type="range" 
                          min="50" 
                          max="150" 
                          value={mapBrightness} 
                          onChange={(e) => setMapBrightness(parseInt(e.target.value))}
                          className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4fc3f7]"
                        />
                        <Sun size={18} className="text-white/60" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-4 border-b border-white/5">
                      <div>
                        <div className="text-[14px] font-light">Cache Size</div>
                        <div className="text-[10px] font-extralight text-white/40 mt-0.5 tracking-wider">{cacheInfo}</div>
                      </div>
                    </div>
                    <div className="py-4 border-b border-white/5">
                      <div className="text-[14px] font-light">App Version</div>
                      <div className="text-[10px] font-extralight text-white/40 mt-0.5 tracking-wider">WeMap v1.0 · Surigao del Sur Edition</div>
                    </div>
                  </div>
                  <div className="mt-8 space-y-3">
                    <button 
                      onClick={clearCache}
                      className="w-full py-3.5 rounded-full border border-red-500/30 bg-red-500/5 text-red-400 text-[11px] font-light tracking-[2px] uppercase flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} /> Clear All Cache
                    </button>
                    <button 
                      onClick={() => {
                        setBusinesses([]);
                        showToast('🗑️ All businesses cleared');
                      }}
                      className="w-full py-3.5 rounded-full border border-red-500/30 bg-red-500/5 text-red-400 text-[11px] font-light tracking-[2px] uppercase flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} /> Clear All Businesses
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="absolute bottom-24 left-1/2 z-[3000] bg-[#12121e]/90 backdrop-blur-xl border border-white/10 rounded-full px-5 py-2.5 text-[11px] font-light tracking-widest text-white shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
