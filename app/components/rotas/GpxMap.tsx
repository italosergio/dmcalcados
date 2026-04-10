import { useEffect, useRef, useMemo, useState } from 'react';
import type { GpxData } from '~/utils/gpx-parser';
import { findClosestTrackIndex, haversine } from '~/utils/gpx-parser';
import { getWaypointMapping, getLucideSvg, resolveFazendaLabels } from '~/utils/waypoint-mappings';
import { Layers, Map, Satellite, Mountain, Moon, Sun, Thermometer, Crosshair } from 'lucide-react';

const TILE_LAYERS = {
  padrao: { name: 'Padrão', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: '© CartoDB', icon: Moon },
  ruas: { name: 'Ruas', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '© OpenStreetMap', icon: Map },
  claro: { name: 'Claro', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', attr: '© CartoDB', icon: Sun },
  satelite: { name: 'Satélite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '© Esri', icon: Satellite },
  topo: { name: 'Topográfico', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attr: '© OpenTopoMap', icon: Mountain },
} as const;

type TileKey = keyof typeof TILE_LAYERS;

// Escurece cor hex para tema escuro (reduz brilho mantendo matiz)
const darkenHex = (hex: string, factor = 0.6): string => {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.substring(0, 2), 16) * factor);
  const g = Math.round(parseInt(h.substring(2, 4), 16) * factor);
  const b = Math.round(parseInt(h.substring(4, 6), 16) * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

interface GpxMapProps {
  data: GpxData;
  hiddenTags?: Set<string>;
  onNoteClick?: (name: string, lat: number, lon: number) => void;
  onTrimRoute?: (startIdx: number, endIdx: number) => void;
  onWaypointClick?: (wpIdx: number, lat: number, lon: number, tag: string) => void;
  onUndoLast?: () => void;
  canUndo?: boolean;
  editing?: boolean;
  trechoMode?: boolean;
  trechoRange?: [number, number];
  onTrechoChange?: (start: number, end: number) => void;
  flyToIdx?: number | null;
  onDeleteWaypoint?: (wpIdx: number) => void;
  onEditWaypoint?: (wpIdx: number) => void;
  onTileChange?: (key: string) => void;
}

export function GpxMap({ data, hiddenTags, onNoteClick, onTrimRoute, onWaypointClick, onUndoLast, canUndo, editing, trechoMode, trechoRange, onTrechoChange, flyToIdx, onDeleteWaypoint, onEditWaypoint, onTileChange }: GpxMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const routeBoundsRef = useRef<any>(null);
  const onNoteClickRef = useRef(onNoteClick);
  onNoteClickRef.current = onNoteClick;
  const onTrimRouteRef = useRef(onTrimRoute);
  onTrimRouteRef.current = onTrimRoute;
  const onWaypointClickRef = useRef(onWaypointClick);
  onWaypointClickRef.current = onWaypointClick;
  const onDeleteWaypointRef = useRef(onDeleteWaypoint);
  onDeleteWaypointRef.current = onDeleteWaypoint;
  const onEditWaypointRef = useRef(onEditWaypoint);
  onEditWaypointRef.current = onEditWaypoint;
  const onTrechoChangeRef = useRef(onTrechoChange);
  onTrechoChangeRef.current = onTrechoChange;
  const trechoOverlayRef = useRef<any>(null);
  const trechoLRef = useRef<any>(null);
  const [tileKey, setTileKey] = useState<TileKey>(() => {
    if (typeof window === 'undefined') return 'padrao';
    return (localStorage.getItem('rotas_tileKey') as TileKey) || 'padrao';
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRecenter, setShowRecenter] = useState(false);
  const [heatSpeed, setHeatSpeed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('rotas_heatSpeed') === 'true';
  });
  const [playing, setPlaying] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('rotas_playing') === 'true';
  });
  const [speed, setSpeed] = useState(() => {
    if (typeof window === 'undefined') return 128;
    return parseInt(localStorage.getItem('rotas_speed') || '32') || 32;
  });
  const [elapsed, setElapsed] = useState({ h: '00', m: '00', s: '00' });
  const [realTime, setRealTime] = useState('');
  const animMarkerRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const animIdxRef = useRef(0);
  const seekFrameRef = useRef<number>(0);

  const smoothSeek = (targetIdx: number) => {
    if (seekFrameRef.current) cancelAnimationFrame(seekFrameRef.current);
    const tp = data.trackPoints;
    const startIdx = animIdxRef.current;
    const diff = targetIdx - startIdx;
    if (diff === 0) return;
    const steps = Math.min(Math.abs(diff), 30);
    let frame = 0;
    const tick = () => {
      frame++;
      const t = frame / steps;
      const eased = t * (2 - t); // ease-out
      const idx = Math.round(startIdx + diff * eased);
      animIdxRef.current = idx;
      const pos = tp[idx];
      animMarkerRef.current?.setLatLng([pos.lat, pos.lon]);
      mapInstanceRef.current?.panTo([pos.lat, pos.lon], { animate: false });
      if (frame < steps) seekFrameRef.current = requestAnimationFrame(tick);
    };
    seekFrameRef.current = requestAnimationFrame(tick);
  };

  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [draggingThumb, setDraggingThumb] = useState<'start' | 'end' | null>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const trimBarRef = useRef<HTMLDivElement>(null);

  const hasTrimChanges = editing && (trimStart > 0 || trimEnd < data.trackPoints.length - 1);

  useEffect(() => {
    if (!editing || data.trackPoints.length < 2) return;
    setTrimStart(0);
    setTrimEnd(data.trackPoints.length - 1);
  }, [editing, data.trackPoints.length]);

  const handleTrimStartChange = (idx: number) => {
    const clamped = Math.min(idx, trimEnd - 1);
    setTrimStart(clamped);
    const pos = data.trackPoints[clamped];
    startMarkerRef.current?.setLatLng([pos.lat, pos.lon]);
    mapInstanceRef.current?.panTo([pos.lat, pos.lon], { animate: true, duration: 0.3 });
  };

  const handleTrimEndChange = (idx: number) => {
    const clamped = Math.max(idx, trimStart + 1);
    setTrimEnd(clamped);
    const pos = data.trackPoints[clamped];
    endMarkerRef.current?.setLatLng([pos.lat, pos.lon]);
    mapInstanceRef.current?.panTo([pos.lat, pos.lon], { animate: true, duration: 0.3 });
  };

  const handleTrimBarInteraction = (clientX: number) => {
    if (!trimBarRef.current) return;
    const rect = trimBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const idx = Math.round(pct * (data.trackPoints.length - 1));
    if (draggingThumb === 'start') handleTrimStartChange(idx);
    else if (draggingThumb === 'end') handleTrimEndChange(idx);
  };

  useEffect(() => {
    if (!draggingThumb) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      handleTrimBarInteraction(x);
    };
    const onUp = () => setDraggingThumb(null);
    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [draggingThumb, trimStart, trimEnd]);

  // Trecho mode state
  const [trechoStart, setTrechoStart] = useState(0);
  const [trechoEnd, setTrechoEnd] = useState(0);
  const [draggingTrechoThumb, setDraggingTrechoThumb] = useState<'start' | 'end' | null>(null);
  const trechoStartMarkerRef = useRef<any>(null);
  const trechoEndMarkerRef = useRef<any>(null);
  const trechoBarRef = useRef<HTMLDivElement>(null);
  const trechoStartRef = useRef(0);
  const trechoEndRef = useRef(0);

  useEffect(() => {
    if (!trechoMode || data.trackPoints.length < 2) return;
    const s = trechoRange?.[0] ?? 0;
    const e = trechoRange?.[1] ?? data.trackPoints.length - 1;
    setTrechoStart(s); trechoStartRef.current = s;
    setTrechoEnd(e); trechoEndRef.current = e;
  }, [trechoMode, data.trackPoints.length]);

  // Sync external trechoRange prop → internal state (when parent resets)
  useEffect(() => {
    if (!trechoMode || !trechoRange) return;
    setTrechoStart(trechoRange[0]); trechoStartRef.current = trechoRange[0];
    setTrechoEnd(trechoRange[1]); trechoEndRef.current = trechoRange[1];
    const tp = data.trackPoints;
    if (trechoStartMarkerRef.current && tp[trechoRange[0]]) trechoStartMarkerRef.current.setLatLng([tp[trechoRange[0]].lat, tp[trechoRange[0]].lon]);
    if (trechoEndMarkerRef.current && tp[trechoRange[1]]) trechoEndMarkerRef.current.setLatLng([tp[trechoRange[1]].lat, tp[trechoRange[1]].lon]);
  }, [trechoRange?.[0], trechoRange?.[1]]);

  const handleTrechoStartChange = (idx: number) => {
    const clamped = Math.min(idx, trechoEndRef.current - 1);
    setTrechoStart(clamped);
    trechoStartRef.current = clamped;
    const pos = data.trackPoints[clamped];
    trechoStartMarkerRef.current?.setLatLng([pos.lat, pos.lon]);
    mapInstanceRef.current?.panTo([pos.lat, pos.lon], { animate: true, duration: 0.3 });
    onTrechoChangeRef.current?.(clamped, trechoEndRef.current);
  };

  const handleTrechoEndChange = (idx: number) => {
    const clamped = Math.max(idx, trechoStartRef.current + 1);
    setTrechoEnd(clamped);
    trechoEndRef.current = clamped;
    const pos = data.trackPoints[clamped];
    trechoEndMarkerRef.current?.setLatLng([pos.lat, pos.lon]);
    mapInstanceRef.current?.panTo([pos.lat, pos.lon], { animate: true, duration: 0.3 });
    onTrechoChangeRef.current?.(trechoStartRef.current, clamped);
  };

  const handleTrechoBarInteraction = (clientX: number) => {
    if (!trechoBarRef.current) return;
    const rect = trechoBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const idx = Math.round(pct * (data.trackPoints.length - 1));
    if (draggingTrechoThumb === 'start') handleTrechoStartChange(idx);
    else if (draggingTrechoThumb === 'end') handleTrechoEndChange(idx);
  };

  useEffect(() => {
    if (!draggingTrechoThumb) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      handleTrechoBarInteraction(x);
    };
    const onUp = () => setDraggingTrechoThumb(null);
    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [draggingTrechoThumb, trechoStart, trechoEnd]);

  const hiddenKey = useMemo(() => hiddenTags ? Array.from(hiddenTags).sort().join(',') : '', [hiddenTags]);

  // Persistir preferências
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('rotas_tileKey', tileKey); onTileChange?.(tileKey); }, [tileKey]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('rotas_heatSpeed', String(heatSpeed)); }, [heatSpeed]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('rotas_playing', String(playing)); }, [playing]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('rotas_speed', String(speed)); }, [speed]);

  // Trocar tile sem recriar o mapa
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const tile = TILE_LAYERS[tileKey];
    tileLayerRef.current.setUrl(tile.url);
  }, [tileKey]);

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return;

    let cancelled = false;

    (async () => {
      const L = await import('leaflet');

      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!document.querySelector('#gpx-popup-style')) {
        const style = document.createElement('style');
        style.id = 'gpx-popup-style';
        style.textContent = `
          .custom-dark-popup .leaflet-popup-content-wrapper {
            background: rgba(0,0,0,.75);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255,255,255,.15);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,.5);
            color: #f0f0f2;
          }
          .custom-dark-popup .leaflet-popup-tip {
            background: rgba(0,0,0,.75);
            border: 1px solid rgba(255,255,255,.15);
            border-top: none;
            border-right: none;
          }
          .custom-dark-popup .leaflet-popup-content { margin: 10px 12px; }
          .leaflet-control-zoom a {
            background: rgba(0,0,0,.55) !important;
            backdrop-filter: blur(8px);
            color: #fff !important;
            border-color: rgba(255,255,255,.15) !important;
          }
          .leaflet-control-zoom a:hover {
            background: rgba(0,0,0,.7) !important;
          }
          .leaflet-control-zoom {
            border: 1px solid rgba(255,255,255,.15) !important;
            border-radius: 12px !important;
            overflow: hidden;
            margin-top: 0 !important;
          }
          .leaflet-top.leaflet-left {
            top: 50% !important;
            transform: translateY(-50%) !important;
            bottom: auto !important;
            left: 10px !important;
          }
        `;
        document.head.appendChild(style);
      }

      if (cancelled || !mapRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapRef.current, { attributionControl: false });
      mapInstanceRef.current = map;

      const tile = TILE_LAYERS[tileKey];
      tileLayerRef.current = L.tileLayer(tile.url, {
        attribution: tile.attr,
      }).addTo(map);

      const bounds = L.latLngBounds([]);
      const hidden = hiddenTags || new Set<string>();
      const isDark = tileKey === 'padrao';
      const dc = (hex: string) => isDark ? darkenHex(hex) : hex;

      // Coletar mudanças de tipo de via — usa timestamp pra ordenar se disponível
      const roadChanges: { index: number; color: string; time?: string }[] = [];
      data.waypoints.forEach(wp => {
        const m = getWaypointMapping(wp.name);
        if (m.isRoadType && m.roadColor && data.trackPoints.length > 0) {
          const idx = findClosestTrackIndex(wp.lat, wp.lon, data.trackPoints);
          roadChanges.push({ index: idx, color: dc(m.roadColor), time: wp.time });
        }
      });
      roadChanges.sort((a, b) => a.index - b.index);

      // Desenhar track em segmentos
      if (data.trackPoints.length > 0) {
        const allCoords = data.trackPoints.map(p => [p.lat, p.lon] as [number, number]);
        allCoords.forEach(c => bounds.extend(c));
        const baseOpacity = trechoMode ? 0.15 : 0.8;
        const heatBaseOpacity = trechoMode ? 0.15 : 0.9;

        if (heatSpeed) {
          // Mapa de calor por velocidade
          const speedColor = (kmh: number): string => {
            const raw = kmh < 10 ? '#22c55e' : kmh < 25 ? '#4ade80' : kmh < 40 ? '#86efac' : kmh < 55 ? '#3b82f6' : kmh < 70 ? '#60a5fa' : kmh < 85 ? '#f59e0b' : kmh < 100 ? '#ef4444' : '#dc2626';
            return dc(raw);
          };
          const R = 6371;
          const hav = (a: number, b: number, c: number, d: number) => {
            const dLat = (c - a) * Math.PI / 180, dLon = (d - b) * Math.PI / 180;
            const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
          };
          for (let i = 1; i < data.trackPoints.length; i++) {
            const prev = data.trackPoints[i - 1];
            const curr = data.trackPoints[i];
            let color = '#6b7280';
            let spd = -1;
            if (prev.time && curr.time) {
              const dt = new Date(curr.time).getTime() - new Date(prev.time).getTime();
              if (dt > 0) {
                const d = hav(prev.lat, prev.lon, curr.lat, curr.lon);
                spd = d / (dt / 3600000);
                if (spd <= 130) color = speedColor(spd);
              }
            }
            const line = L.polyline([[prev.lat, prev.lon], [curr.lat, curr.lon]], { color, weight: 5, opacity: heatBaseOpacity });
            if (spd >= 0) line.bindTooltip(`${Math.round(spd)} km/h`, { sticky: true, className: 'speed-tooltip' });
            line.addTo(map);
          }
        } else if (roadChanges.length === 0) {
          L.polyline(allCoords, { color: dc('#3b82f6'), weight: 4, opacity: baseOpacity }).addTo(map);
        } else {
          let prevIdx = 0;
          let prevColor = dc('#3b82f6');
          for (const rc of roadChanges) {
            // Segmento do prevIdx até rc.index (inclusive, pra conectar)
            const seg = allCoords.slice(prevIdx, rc.index + 1);
            if (seg.length >= 2) {
              L.polyline(seg, { color: prevColor, weight: 4, opacity: baseOpacity }).addTo(map);
            }
            prevIdx = rc.index;
            prevColor = rc.color;
          }
          // Segmento final
          const lastSeg = allCoords.slice(prevIdx);
          if (lastSeg.length >= 2) {
            L.polyline(lastSeg, { color: prevColor, weight: 4, opacity: baseOpacity }).addTo(map);
          }
        }

        // Trecho overlay
        if (trechoMode) {
          trechoLRef.current = L;
          const ts = trechoRange?.[0] ?? 0;
          const te = trechoRange?.[1] ?? allCoords.length - 1;
          trechoOverlayRef.current = L.polyline(allCoords.slice(ts, te + 1), { color: dc('#10b981'), weight: 5, opacity: 0.9 }).addTo(map);
        }
      }

      // Waypoints — escalam com zoom
      const fazendaLabels = resolveFazendaLabels(data.waypoints);
      const waypointMarkers: any[] = [];

      const getIconSize = (zoom: number) => Math.max(10, Math.min(20, 6 + zoom));

      data.waypoints.forEach((wp, wpIdx) => {
        let m = getWaypointMapping(wp.name);
        if (m.tag === 'Outro' || hidden.has(m.tag)) return;

        const dynLabel = fazendaLabels.get(wpIdx);
        if (dynLabel) m = { ...m, label: dynLabel };

        if (m.isRoadType) {
          const roadIcon = L.divIcon({
            className: '',
            html: `<div style="width:8px;height:8px;background:${dc(m.color)};border:1.5px solid ${isDark ? '#555' : '#fff'};border-radius:50%;opacity:0.7"></div>`,
            iconSize: [8, 8],
            iconAnchor: [4, 4],
          });
          L.marker([wp.lat, wp.lon], { icon: roadIcon })
            .bindTooltip(m.label, { direction: 'top', offset: [0, -6] })
            .addTo(map);
          bounds.extend([wp.lat, wp.lon]);
          return;
        }

        const mkIcon = (size: number) => L.divIcon({
          className: '',
          html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;background:${dc(m.color)};border:1.5px solid ${isDark ? '#555' : '#fff'};border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,.5)">${getLucideSvg(m.icon, Math.round(size * 0.6), isDark ? '#ccc' : '#fff')}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([wp.lat, wp.lon], { icon: mkIcon(getIconSize(map.getZoom())) });

        // Tooltip simples no hover
        marker.bindTooltip(m.isNote ? wp.name : m.label, { direction: 'top', offset: [0, -8] });

        // Popup estilizado
        const timeStr = wp.time ? new Date(wp.time).toLocaleString('pt-BR') : '';
        const coordStr = `${wp.lat.toFixed(5)}, ${wp.lon.toFixed(5)}`;
        const eleStr = wp.ele !== undefined ? `${wp.ele.toFixed(0)}m` : '';
        const editBtnId = `wp-edit-${wpIdx}`;
        const delBtnId = `wp-del-${wpIdx}`;

        const popupHtml = `
          <div style="font-family:system-ui;min-width:160px">
            <div style="font-weight:600;font-size:13px;margin-bottom:4px;color:#f0f0f2">${m.label}</div>
            ${m.isNote ? `<div style="font-size:11px;color:#a0a0a8;margin-bottom:4px;font-style:italic">${wp.name}</div>` : ''}
            ${timeStr ? `<div style="font-size:11px;color:#a0a0a8">🕐 ${timeStr}</div>` : ''}
            <div style="font-size:10px;color:#707078;margin-top:2px">📍 ${coordStr}</div>
            ${eleStr ? `<div style="font-size:10px;color:#707078">⛰ ${eleStr}</div>` : ''}
            <div style="display:flex;gap:6px;margin-top:8px;border-top:1px solid rgba(255,255,255,.1);padding-top:6px">
              <button id="${editBtnId}" style="flex:1;padding:4px 8px;font-size:10px;font-weight:600;border-radius:6px;border:none;cursor:pointer;background:rgba(59,130,246,.6);color:#fff">Editar</button>
              <button id="${delBtnId}" style="flex:1;padding:4px 8px;font-size:10px;font-weight:600;border-radius:6px;border:none;cursor:pointer;background:rgba(239,68,68,.6);color:#fff">Apagar</button>
            </div>
          </div>`;

        const popup = L.popup({
          className: 'custom-dark-popup',
          closeButton: false,
          offset: [0, -8],
        }).setContent(popupHtml);

        marker.bindPopup(popup);

        marker.on('click', () => {
          map.flyTo([wp.lat, wp.lon], Math.max(map.getZoom(), 16), { duration: 0.8 });
        });

        marker.on('popupopen', () => {
          document.getElementById(editBtnId)?.addEventListener('click', () => {
            marker.closePopup();
            onEditWaypointRef.current?.(wpIdx);
          });
          document.getElementById(delBtnId)?.addEventListener('click', () => {
            marker.closePopup();
            onDeleteWaypointRef.current?.(wpIdx);
          });
        });

        marker.addTo(map);
        bounds.extend([wp.lat, wp.lon]);
        waypointMarkers.push({ marker, mapping: m, mkIcon });
      });

      // Atualizar tamanho dos ícones ao mudar zoom
      map.on('zoomend', () => {
        const size = getIconSize(map.getZoom());
        waypointMarkers.forEach(({ marker, mkIcon }) => marker.setIcon(mkIcon(size)));
      });

      // Start/end — arrastáveis apenas no modo edição
      if (data.trackPoints.length > 0) {
        const mkEndpointIcon = (color: string) => L.divIcon({
          className: '',
          html: `<div style="width:14px;height:14px;background:${dc(color)};border:2px solid ${isDark ? '#555' : '#fff'};border-radius:50%;box-shadow:0 0 6px rgba(0,0,0,.5);${editing ? 'cursor:grab' : ''}"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const first = data.trackPoints[0];
        const last = data.trackPoints[data.trackPoints.length - 1];
        let startIdx = 0;
        let endIdx = data.trackPoints.length - 1;

        const startMarker = L.marker([first.lat, first.lon], { icon: mkEndpointIcon('#10b981'), draggable: !!editing })
          .bindTooltip(editing ? 'Arraste para cortar o início' : 'Início da rota', { direction: 'top', offset: [0, -10] })
          .addTo(map);
        startMarkerRef.current = startMarker;

        const endMarker = L.marker([last.lat, last.lon], { icon: mkEndpointIcon('#ef4444'), draggable: !!editing })
          .bindTooltip(editing ? 'Arraste para cortar o fim' : 'Fim da rota', { direction: 'top', offset: [0, -10] })
          .addTo(map);
        endMarkerRef.current = endMarker;

        if (editing) {
          const snapTo = (marker: any, isStart: boolean) => {
            const pos = marker.getLatLng();
            const idx = findClosestTrackIndex(pos.lat, pos.lng, data.trackPoints);
            const snapped = data.trackPoints[idx];
            marker.setLatLng([snapped.lat, snapped.lon]);
            if (isStart) { startIdx = Math.min(idx, endIdx - 1); setTrimStart(startIdx); }
            else { endIdx = Math.max(idx, startIdx + 1); setTrimEnd(endIdx); }
          };

          startMarker.on('drag', () => snapTo(startMarker, true));
          endMarker.on('drag', () => snapTo(endMarker, false));
        }

        // Trecho markers — arrastáveis no modo trecho
        if (trechoMode) {
          const mkTrechoIcon = (color: string) => L.divIcon({
            className: '',
            html: `<div style="width:14px;height:14px;background:${dc(color)};border:2px solid ${isDark ? '#555' : '#fff'};border-radius:50%;box-shadow:0 0 6px rgba(0,0,0,.5);cursor:grab"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          });
          const ts = trechoRange?.[0] ?? 0;
          const te = trechoRange?.[1] ?? data.trackPoints.length - 1;
          const tsPos = data.trackPoints[ts];
          const tePos = data.trackPoints[te];

          const tsMarker = L.marker([tsPos.lat, tsPos.lon], { icon: mkTrechoIcon('#10b981'), draggable: true })
            .bindTooltip('Início do trecho', { direction: 'top', offset: [0, -10] }).addTo(map);
          trechoStartMarkerRef.current = tsMarker;

          const teMarker = L.marker([tePos.lat, tePos.lon], { icon: mkTrechoIcon('#10b981'), draggable: true })
            .bindTooltip('Fim do trecho', { direction: 'top', offset: [0, -10] }).addTo(map);
          trechoEndMarkerRef.current = teMarker;

          const snapTrecho = (marker: any, isStart: boolean) => {
            const pos = marker.getLatLng();
            const idx = findClosestTrackIndex(pos.lat, pos.lng, data.trackPoints);
            const snapped = data.trackPoints[idx];
            marker.setLatLng([snapped.lat, snapped.lon]);
            if (isStart) handleTrechoStartChange(Math.min(idx, trechoEndRef.current - 1));
            else handleTrechoEndChange(Math.max(idx, trechoStartRef.current + 1));
          };
          tsMarker.on('drag', () => snapTrecho(tsMarker, true));
          teMarker.on('drag', () => snapTrecho(teMarker, false));
        }
      }

      if (bounds.isValid()) {
        routeBoundsRef.current = bounds;
        const infoH = parseInt(getComputedStyle(mapRef.current!.parentElement!).getPropertyValue('--info-bottom') || '0') || 120;
        map.fitBounds(bounds, { paddingTopLeft: [40, infoH + 20], paddingBottomRight: [40, 40] });
        const initialZoom = map.getZoom();
        const initialCenter = map.getCenter();
        map.on('moveend zoomend', () => {
          const zoomChanged = map.getZoom() !== initialZoom;
          const center = map.getCenter();
          const panDist = center.distanceTo(initialCenter);
          setShowRecenter(zoomChanged || panDist > 100);
        });
      }
    })();

    return () => {
      cancelled = true;
      stopPlayback();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [data, hiddenKey, editing, heatSpeed, trechoMode, tileKey]);

  // Update trecho overlay when range changes
  useEffect(() => {
    if (!trechoMode || !mapInstanceRef.current || !trechoLRef.current || data.trackPoints.length < 2) return;
    const L = trechoLRef.current;
    const allCoords = data.trackPoints.map(p => [p.lat, p.lon] as [number, number]);
    if (trechoOverlayRef.current) mapInstanceRef.current.removeLayer(trechoOverlayRef.current);
    const color = tileKey === 'padrao' ? darkenHex('#10b981') : '#10b981';
    trechoOverlayRef.current = L.polyline(allCoords.slice(trechoStart, trechoEnd + 1), { color, weight: 5, opacity: 0.9 }).addTo(mapInstanceRef.current);
  }, [trechoStart, trechoEnd, trechoMode, tileKey]);

  const recenter = () => {
    if (mapInstanceRef.current && routeBoundsRef.current) {
      const infoH = mapRef.current?.parentElement ? parseInt(getComputedStyle(mapRef.current.parentElement).getPropertyValue('--info-bottom') || '0') || 120 : 120;
      mapInstanceRef.current.fitBounds(routeBoundsRef.current, { paddingTopLeft: [40, infoH + 20], paddingBottomRight: [40, 40] });
      setShowRecenter(false);
    }
  };

  const [paused, setPaused] = useState(false);

  const stopPlayback = () => {
    setPlaying(false);
    setPaused(false);
    setElapsed({ h: '00', m: '00', s: '00' });
    setRealTime('');
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (animMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(animMarkerRef.current);
      animMarkerRef.current = null;
    }
    animIdxRef.current = 0;
  };

  // Parar player ao entrar em edição
  useEffect(() => { if (editing) stopPlayback(); }, [editing]);

  // Fly to specific trackpoint (ex: velocidade máxima)
  useEffect(() => {
    if (flyToIdx == null || !mapInstanceRef.current || !data.trackPoints[flyToIdx]) return;
    const tp = data.trackPoints[flyToIdx];
    (async () => {
      const L = await import('leaflet');
      mapInstanceRef.current.flyTo([tp.lat, tp.lon], 16, { duration: 1.2 });
      // Posicionar animação nesse ponto, pausado
      animIdxRef.current = flyToIdx;
      if (!animMarkerRef.current) {
        const icon = L.divIcon({
          className: '',
          html: '<div style="width:16px;height:16px;background:#10b981;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(16,185,129,.8)"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        animMarkerRef.current = L.marker([tp.lat, tp.lon], { icon, zIndexOffset: 1000 }).addTo(mapInstanceRef.current);
      } else {
        animMarkerRef.current.setLatLng([tp.lat, tp.lon]);
      }
      playingRef.current = false;
      setPlaying(false);
      setPaused(true);
    })();
  }, [flyToIdx]);

  const pausePlayback = () => {
    playingRef.current = false;
    setPlaying(false);
    setPaused(true);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  const resumePlayback = () => {
    setPaused(false);
    setPlaying(true);
  };

  const fmtElapsed = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return { h: String(h).padStart(2, '0'), m: String(m).padStart(2, '0'), s: String(s).padStart(2, '0') };
  };

  const playingRef = useRef(false);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    playingRef.current = playing;
    if (!playing || !mapInstanceRef.current || data.trackPoints.length < 2) return;
    const map = mapInstanceRef.current;
    const tp = data.trackPoints;

    (async () => {
      const L = await import('leaflet');
      const icon = L.divIcon({
        className: '',
        html: '<div style="width:16px;height:16px;background:#10b981;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(16,185,129,.8)"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      if (!animMarkerRef.current) {
        animMarkerRef.current = L.marker([tp[0].lat, tp[0].lon], { icon, zIndexOffset: 1000 }).addTo(map);
        animMarkerRef.current.bindTooltip('0 km/h', { permanent: true, direction: 'top', offset: [0, -14], className: 'speed-hud' });
      }

      let accum = 0;
      let lastTime = performance.now();

      const step = (now: number) => {
        if (!playingRef.current) return;
        const dt = now - lastTime;
        lastTime = now;
        accum += dt * speedRef.current;

        let i = animIdxRef.current;
        let frac = 0;

        while (i < tp.length - 1) {
          if (tp[i].time && tp[i + 1].time) {
            const realMs = new Date(tp[i + 1].time!).getTime() - new Date(tp[i].time!).getTime();
            if (accum < realMs) {
              frac = realMs > 0 ? accum / realMs : 0;
              break;
            }
            accum -= realMs;
          } else {
            accum = 0;
          }
          i++;
        }
        animIdxRef.current = i;

        // Interpolar posição entre i e i+1
        const curr = tp[i];
        let lat = curr.lat, lon = curr.lon;
        if (i < tp.length - 1 && frac > 0) {
          const next = tp[i + 1];
          lat = curr.lat + (next.lat - curr.lat) * frac;
          lon = curr.lon + (next.lon - curr.lon) * frac;
        }

        animMarkerRef.current?.setLatLng([lat, lon]);
        map.panTo([lat, lon], { animate: true, duration: 0.1, easeLinearity: 1 });
        if (tp[0].time && curr.time) {
          setElapsed(fmtElapsed(new Date(curr.time).getTime() - new Date(tp[0].time).getTime()));
          setRealTime(new Date(curr.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        }

        // Velocidade atual com cor
        if (i > 0 && tp[i - 1].time && curr.time) {
          const d = haversine(tp[i - 1].lat, tp[i - 1].lon, curr.lat, curr.lon);
          const dtMs = new Date(curr.time).getTime() - new Date(tp[i - 1].time!).getTime();
          const spd = dtMs > 0 ? Math.round(d / (dtMs / 3600000)) : 0;
          // Verde (parado/lento) → Azul (médio) → Vermelho claro (rápido)
          const clamp = Math.min(spd, 120);
          const r = clamp < 60 ? Math.round(100 + (clamp / 60) * 80) : Math.round(180 + ((clamp - 60) / 60) * 75);
          const g = clamp < 60 ? Math.round(210 - (clamp / 60) * 60) : Math.round(150 - ((clamp - 60) / 60) * 80);
          const b = clamp < 60 ? Math.round(180 + (clamp / 60) * 55) : Math.round(235 - ((clamp - 60) / 60) * 100);
          const color = `rgb(${r},${g},${b})`;
          const tooltip = animMarkerRef.current?.getTooltip();
          if (tooltip) {
            const el = tooltip.getElement();
            if (el) { el.style.color = color; el.style.fontWeight = '700'; el.style.fontSize = '13px'; el.style.textShadow = '0 1px 3px rgba(0,0,0,.6)'; }
          }
          animMarkerRef.current?.setTooltipContent(`${spd} km/h`);
        }

        if (i >= tp.length - 1) {
          stopPlayback();
          return;
        }
        animFrameRef.current = requestAnimationFrame(step);
      };

      animFrameRef.current = requestAnimationFrame(step);
    })();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [playing]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className={`w-full h-full ${tileKey === 'padrao' ? 'dark-map' : ''}`} />
      {/* Barra de trim temporal */}
      {editing && data.trackPoints.length > 1 && data.trackPoints[0]?.time && (
        <div
          className="absolute bottom-2 left-3 right-3 z-[1000] flex flex-col gap-1.5 px-3 py-2 rounded-xl shadow-lg backdrop-blur-sm"
          style={{ background: 'rgba(0,0,0,.6)', border: '1px solid rgba(255,255,255,.15)' }}
        >
          <div className="flex items-center justify-between text-[10px] text-white/70">
            <span className="text-green-400">{data.trackPoints[trimStart]?.time ? new Date(data.trackPoints[trimStart].time!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
            <span>Arraste para definir início / fim do corte</span>
            <span className="text-red-400">{data.trackPoints[trimEnd]?.time ? new Date(data.trackPoints[trimEnd].time!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
          </div>
          {/* Custom range bar */}
          <div
            ref={trimBarRef}
            className="relative h-5 cursor-pointer select-none touch-none"
            onMouseDown={(e) => {
              const rect = trimBarRef.current!.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              const idx = Math.round(pct * (data.trackPoints.length - 1));
              const distStart = Math.abs(idx - trimStart);
              const distEnd = Math.abs(idx - trimEnd);
              setDraggingThumb(distStart <= distEnd ? 'start' : 'end');
            }}
            onTouchStart={(e) => {
              const rect = trimBarRef.current!.getBoundingClientRect();
              const pct = (e.touches[0].clientX - rect.left) / rect.width;
              const idx = Math.round(pct * (data.trackPoints.length - 1));
              const distStart = Math.abs(idx - trimStart);
              const distEnd = Math.abs(idx - trimEnd);
              setDraggingThumb(distStart <= distEnd ? 'start' : 'end');
            }}
          >
            {/* Track background */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-white/15" />
            {/* Active range */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-blue-400/50"
              style={{
                left: `${(trimStart / (data.trackPoints.length - 1)) * 100}%`,
                right: `${100 - (trimEnd / (data.trackPoints.length - 1)) * 100}%`,
              }}
            />
            {/* Trimmed zones */}
            {trimStart > 0 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-l-full bg-red-500/30"
                style={{ left: 0, width: `${(trimStart / (data.trackPoints.length - 1)) * 100}%` }}
              />
            )}
            {trimEnd < data.trackPoints.length - 1 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-r-full bg-red-500/30"
                style={{ right: 0, width: `${100 - (trimEnd / (data.trackPoints.length - 1)) * 100}%` }}
              />
            )}
            {/* Start thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-lg cursor-grab active:cursor-grabbing"
              style={{ left: `${(trimStart / (data.trackPoints.length - 1)) * 100}%` }}
            />
            {/* End thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-lg cursor-grab active:cursor-grabbing"
              style={{ left: `${(trimEnd / (data.trackPoints.length - 1)) * 100}%` }}
            />
          </div>
          {/* Trim / Undo buttons */}
          <div className="flex items-center justify-center gap-2">
            {hasTrimChanges && (
              <button
                onClick={() => { if (trimStart < trimEnd) onTrimRouteRef.current?.(trimStart, trimEnd); }}
                className="px-4 py-1 text-xs font-semibold rounded-lg transition-all bg-red-500 hover:bg-red-400 text-white"
              >
                Cortar rota
              </button>
            )}
            {canUndo && (
              <button
                onClick={() => onUndoLast?.()}
                className="px-4 py-1 text-xs font-semibold rounded-lg transition-all bg-yellow-500 hover:bg-yellow-400 text-black"
              >
                Desfazer corte
              </button>
            )}
          </div>
        </div>
      )}
      {/* Barra de trecho */}
      {trechoMode && data.trackPoints.length > 1 && data.trackPoints[0]?.time && (
        <div
          className="absolute bottom-2 left-3 right-3 z-[1000] flex flex-col gap-1.5 px-3 py-2 rounded-xl shadow-lg backdrop-blur-sm"
          style={{ background: 'rgba(0,0,0,.6)', border: '1px solid rgba(16,185,129,.3)' }}
        >
          <div className="flex items-center justify-between text-[10px] text-white/70">
            <span className="text-green-400">{data.trackPoints[trechoStart]?.time ? new Date(data.trackPoints[trechoStart].time!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
            <span className="text-green-300">Trecho</span>
            <span className="text-green-400">{data.trackPoints[trechoEnd]?.time ? new Date(data.trackPoints[trechoEnd].time!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
          </div>
          <div
            ref={trechoBarRef}
            className="relative h-5 cursor-pointer select-none touch-none"
            onMouseDown={(e) => {
              const rect = trechoBarRef.current!.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              const idx = Math.round(pct * (data.trackPoints.length - 1));
              setDraggingTrechoThumb(Math.abs(idx - trechoStart) <= Math.abs(idx - trechoEnd) ? 'start' : 'end');
            }}
            onTouchStart={(e) => {
              const rect = trechoBarRef.current!.getBoundingClientRect();
              const pct = (e.touches[0].clientX - rect.left) / rect.width;
              const idx = Math.round(pct * (data.trackPoints.length - 1));
              setDraggingTrechoThumb(Math.abs(idx - trechoStart) <= Math.abs(idx - trechoEnd) ? 'start' : 'end');
            }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-white/15" />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-green-500/50"
              style={{
                left: `${(trechoStart / (data.trackPoints.length - 1)) * 100}%`,
                right: `${100 - (trechoEnd / (data.trackPoints.length - 1)) * 100}%`,
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-lg cursor-grab active:cursor-grabbing"
              style={{ left: `${(trechoStart / (data.trackPoints.length - 1)) * 100}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-lg cursor-grab active:cursor-grabbing"
              style={{ left: `${(trechoEnd / (data.trackPoints.length - 1)) * 100}%` }}
            />
          </div>
        </div>
      )}
      {showRecenter && !playing && null}
      {/* Playback controls */}
      {!editing && !trechoMode && <div className="absolute bottom-4 left-3 z-[1000] flex flex-col sm:flex-row items-start sm:items-center gap-1.5">
        <div className="flex items-center gap-1.5">
        {!playing && !paused ? (
          <button
            onClick={() => {
              animIdxRef.current = 0;
              setSpeed(32);
              const first = data.trackPoints[0];
              if (mapInstanceRef.current) {
                mapInstanceRef.current.flyTo([first.lat, first.lon], 15, { duration: 1.5 });
                setTimeout(() => setPlaying(true), 1600);
              } else {
                setPlaying(true);
              }
            }}
            className="w-8 h-8 flex items-center justify-center rounded-xl shadow-lg backdrop-blur-sm transition-all"
            style={{ background: 'rgba(16,185,129,.6)', color: '#fff', border: '1px solid rgba(255,255,255,.15)' }}
            title="Iniciar animação"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                const newIdx = Math.max(0, animIdxRef.current - Math.floor(data.trackPoints.length * 0.05));
                smoothSeek(newIdx);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-xl shadow-lg backdrop-blur-sm transition-all"
              style={{ background: 'rgba(0,0,0,.55)', color: '#fff', border: '1px solid rgba(255,255,255,.15)' }}
              title="Voltar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="19,21 5,12 19,3" /><rect x="3" y="3" width="3" height="18" /></svg>
            </button>
            <button
              onClick={paused ? resumePlayback : pausePlayback}
              className="w-8 h-8 flex items-center justify-center rounded-xl shadow-lg backdrop-blur-sm transition-all"
              style={{ background: paused ? 'rgba(16,185,129,.6)' : 'rgba(245,158,11,.6)', color: '#fff', border: '1px solid rgba(255,255,255,.15)' }}
              title={paused ? 'Continuar' : 'Pausar'}
            >
              {paused
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
              }
            </button>
            <button
              onClick={stopPlayback}
              className="w-8 h-8 flex items-center justify-center rounded-xl shadow-lg backdrop-blur-sm transition-all"
              style={{ background: 'rgba(239,68,68,.6)', color: '#fff', border: '1px solid rgba(255,255,255,.15)' }}
              title="Parar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" /></svg>
            </button>
            <button
              onClick={() => {
                const newIdx = Math.min(data.trackPoints.length - 1, animIdxRef.current + Math.floor(data.trackPoints.length * 0.05));
                smoothSeek(newIdx);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-xl shadow-lg backdrop-blur-sm transition-all"
              style={{ background: 'rgba(0,0,0,.55)', color: '#fff', border: '1px solid rgba(255,255,255,.15)' }}
              title="Avançar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /><rect x="18" y="3" width="3" height="18" /></svg>
            </button>
          </>
        )}
        </div>
        {(playing || paused) && (
          <div className="flex gap-0.5">
            {[32, 64, 128, 500].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className="px-2 py-1 text-[10px] font-bold rounded-lg backdrop-blur-sm shadow-lg transition-all"
                style={{
                  background: speed === s ? 'rgba(212,175,55,.7)' : 'rgba(0,0,0,.55)',
                  color: speed === s ? '#000' : 'rgba(255,255,255,.7)',
                  border: '1px solid rgba(255,255,255,.15)',
                }}
              >
                {s}x
              </button>
            ))}
          </div>
        )}
      </div>}
      {!editing && (playing || paused) && (
        <div
          className="absolute right-0 z-[950] flex flex-col items-end px-2.5 py-1 rounded-bl-xl shadow-lg backdrop-blur-md"
          style={{ background: 'rgba(0,0,0,.55)', borderLeft: '1px solid rgba(255,255,255,.1)', borderBottom: '1px solid rgba(255,255,255,.1)', top: 'var(--info-bottom, 36px)' }}
        >
          <div className="flex items-center gap-0.5">
            <span className="text-sm font-mono font-bold text-white tracking-wider">{elapsed.h}</span>
            <span className="text-sm font-mono font-bold text-white/40 animate-pulse">:</span>
            <span className="text-sm font-mono font-bold text-white tracking-wider">{elapsed.m}</span>
            <span className="text-sm font-mono font-bold text-white/40 animate-pulse">:</span>
            <span className="text-sm font-mono font-bold text-white tracking-wider">{elapsed.s}</span>
          </div>
          {realTime && <span className="text-[10px] font-mono text-white/50">{realTime}</span>}
        </div>
      )}
      <div className="absolute top-1/2 -translate-y-1/2 right-3 z-[1000] flex flex-col items-center gap-1.5">
        {menuOpen && <div className="fixed inset-0" onClick={() => setMenuOpen(false)} />}
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="relative w-8 h-8 flex items-center justify-center rounded-xl shadow-lg backdrop-blur-sm transition-all"
          style={{ background: 'rgba(0,0,0,.55)', color: '#fff', border: '1px solid rgba(255,255,255,.15)' }}
        >
          <Layers size={16} />
        </button>
        {showRecenter && !playing && (
          <button
            onClick={recenter}
            className="w-8 h-8 flex items-center justify-center rounded-xl shadow-lg backdrop-blur-sm transition-all"
            style={{ background: 'rgba(0,0,0,.55)', color: '#fff', border: '1px solid rgba(255,255,255,.15)' }}
            title="Centralizar rota"
          >
            <Crosshair size={16} strokeWidth={2.5} />
          </button>
        )}
        {menuOpen && (
          <div
            className="absolute top-10 right-0 flex flex-col gap-0.5 rounded-xl shadow-lg backdrop-blur-sm p-1 min-w-[120px] max-h-[60vh] overflow-y-auto"
            style={{ background: 'rgba(0,0,0,.55)', border: '1px solid rgba(255,255,255,.15)' }}
          >
            {(Object.keys(TILE_LAYERS) as TileKey[]).map(key => {
              const Icon = TILE_LAYERS[key].icon;
              return (
                <button
                  key={key}
                  onClick={() => { setTileKey(key); setMenuOpen(false); }}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-lg transition-all"
                  style={{
                    background: tileKey === key ? 'rgba(212,175,55,.7)' : 'transparent',
                    color: tileKey === key ? '#000' : 'rgba(255,255,255,.7)',
                  }}
                >
                  <Icon size={13} />
                  {TILE_LAYERS[key].name}
                </button>
              );
            })}
            <div className="border-t my-0.5" style={{ borderColor: 'rgba(255,255,255,.15)' }} />
            <button
              onClick={() => { setHeatSpeed(v => !v); setMenuOpen(false); }}
              className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-lg transition-all"
              style={{
                background: heatSpeed ? 'rgba(212,175,55,.7)' : 'transparent',
                color: heatSpeed ? '#000' : 'rgba(255,255,255,.7)',
              }}
            >
              <Thermometer size={13} />
              Velocidade
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
