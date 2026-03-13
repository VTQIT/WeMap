import { Municipality } from "./types";

export const MUNICIPALITIES: Municipality[] = [
  {
    id: 'cantilan', name: 'Cantilan', province: 'Surigao del Sur',
    lat: 9.0281, lng: 125.9889, zoom: 13,
    bounds: [[8.94, 125.93], [9.10, 126.04]],
    color: '#4fc3f7', icon: '🏙️',
    desc: 'Capital of eastern Surigao del Sur',
    barangays: 22
  },
  {
    id: 'carascal', name: 'Carascal', province: 'Surigao del Sur',
    lat: 9.2083, lng: 125.9544, zoom: 13,
    bounds: [[9.14, 125.89], [9.27, 126.01]],
    color: '#7c6af7', icon: '🌊',
    desc: 'Coastal municipality north of Cantilan',
    barangays: 18
  },
  {
    id: 'madrid', name: 'Madrid', province: 'Surigao del Sur',
    lat: 8.8936, lng: 125.9822, zoom: 13,
    bounds: [[8.82, 125.92], [8.96, 126.03]],
    color: '#f77cbc', icon: '🌴',
    desc: 'Municipality south of Cantilan',
    barangays: 14
  },
  {
    id: 'carmen', name: 'Carmen', province: 'Surigao del Sur',
    lat: 8.7953, lng: 125.9733, zoom: 13,
    bounds: [[8.73, 125.90], [8.86, 126.00]],
    color: '#7cf7b8', icon: '🌾',
    desc: 'Agricultural municipality of SDdS',
    barangays: 16
  },
  {
    id: 'lanuza', name: 'Lanuza', province: 'Surigao del Sur',
    lat: 9.1608, lng: 126.0172, zoom: 13,
    bounds: [[9.10, 125.97], [9.22, 126.06]],
    color: '#f7c47c', icon: '🏄',
    desc: 'Famous surf destination of Mindanao',
    barangays: 12
  },
  {
    id: 'cortez', name: 'Cortez', province: 'Surigao del Sur',
    lat: 9.2500, lng: 125.9400, zoom: 13,
    bounds: [[9.20, 125.88], [9.30, 126.00]],
    color: '#f77c7c', icon: '⛰️',
    desc: 'Highland municipality of SDdS',
    barangays: 10
  }
];

export const CAT_COLORS: Record<string, string> = {
  '🛒': '#4fc3f7', '🍽️': '#f7a47c', '🏥': '#f77cbc', '🏨': '#7cf7b8',
  '⛽': '#f7e27c', '🏪': '#a47cf7', '💈': '#f77ca4', '🔧': '#7cf7f7',
  '🏦': '#7c9ff7', '📦': '#f7b47c', '🌾': '#b4f77c', '⚡': '#f7f07c',
  '🎓': '#bc7cf7', '🏛️': '#7cb4f7', '⛪': '#f7f7bc', '📌': '#aaaaaa'
};
