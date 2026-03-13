export interface Municipality {
  id: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  zoom: number;
  bounds: [[number, number], [number, number]];
  color: string;
  icon: string;
  desc: string;
  barangays: number;
}

export interface Business {
  id: string;
  name: string;
  lat: number;
  lng: number;
  cat: string;
  muniName: string;
  phone?: string;
  addr?: string;
  hours?: string;
  ts: number;
}

export type PanelType = 'biz' | 'muni' | 'offline' | 'settings' | 'add-biz' | null;
