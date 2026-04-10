export interface GpxWaypoint {
  lat: number;
  lon: number;
  name: string;
  ele?: number;
  time?: string;
}

export interface GpxTrackPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
  speed?: number;
}

export interface GpxData {
  name: string;
  waypoints: GpxWaypoint[];
  trackPoints: GpxTrackPoint[];
}

export function parseGpx(xmlString: string): GpxData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  const name = doc.querySelector('metadata > name')?.textContent || 'Rota sem nome';

  const waypoints: GpxWaypoint[] = Array.from(doc.querySelectorAll('wpt')).map(wpt => ({
    lat: parseFloat(wpt.getAttribute('lat') || '0'),
    lon: parseFloat(wpt.getAttribute('lon') || '0'),
    name: wpt.querySelector('name')?.textContent || 'Ponto',
    ele: wpt.querySelector('ele') ? parseFloat(wpt.querySelector('ele')!.textContent!) : undefined,
    time: wpt.querySelector('time')?.textContent || undefined,
  }));

  const trackPoints: GpxTrackPoint[] = Array.from(doc.querySelectorAll('trkpt')).map(pt => ({
    lat: parseFloat(pt.getAttribute('lat') || '0'),
    lon: parseFloat(pt.getAttribute('lon') || '0'),
    ele: pt.querySelector('ele') ? parseFloat(pt.querySelector('ele')!.textContent!) : undefined,
    time: pt.querySelector('time')?.textContent || undefined,
    speed: pt.querySelector('speed') ? parseFloat(pt.querySelector('speed')!.textContent!) : undefined,
  }));

  return { name, waypoints, trackPoints: simplifyTrack(trackPoints, 0.1) };
}

/** Reduz trackPoints mantendo primeiro, último e amostragem uniforme */
function simplifyTrack(points: GpxTrackPoint[], ratio: number): GpxTrackPoint[] {
  if (points.length <= 2) return points;
  const target = Math.max(2, Math.round(points.length * ratio));
  const step = (points.length - 1) / (target - 1);
  const result: GpxTrackPoint[] = [];
  for (let i = 0; i < target; i++) result.push(points[Math.round(i * step)]);
  return result;
}

/** Acha o índice do trackpoint mais próximo de uma coordenada */
export function findClosestTrackIndex(lat: number, lon: number, trackPoints: GpxTrackPoint[]): number {
  let minDist = Infinity;
  let idx = 0;
  for (let i = 0; i < trackPoints.length; i++) {
    const d = (trackPoints[i].lat - lat) ** 2 + (trackPoints[i].lon - lon) ** 2;
    if (d < minDist) { minDist = d; idx = i; }
  }
  return idx;
}

/** Distância em km entre dois pontos (Haversine) */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface RoadTypeStats {
  km: number;
  velMedia: number;
}

export interface RouteStats {
  distanciaKm: number;
  tempoTotal: string;
  velMediaAsfalto: number | null;
  velMediaEstrada: number | null;
  velMaxima: number | null;
  velMaximaIdx: number | null;
  tempoMovimento: string | null;
  tempoParado: string | null;
  tempoMedioParado: string | null;
  totalParadas: number;
  paradaMaisLonga: string | null;
  paradaMaisCurta: string | null;
  porTipoVia: Record<string, RoadTypeStats>;
}

/**
 * Calcula estatísticas da rota.
 * roadSegments: lista de { index, roadLabel } ordenada por index (vem dos waypoints de tipo de via)
 */
export function calcRouteStats(
  trackPoints: GpxTrackPoint[],
  roadSegments: { index: number; roadLabel: string }[]
): RouteStats {
  let totalDist = 0;
  const viaKm: Record<string, number> = {};
  const viaMs: Record<string, number> = {};

  // Determinar tipo de via por segmento
  const sorted = [...roadSegments].sort((a, b) => a.index - b.index);
  const getRoadType = (idx: number): string => {
    let tipo = 'desconhecido';
    for (const s of sorted) {
      if (s.index <= idx) tipo = s.roadLabel; else break;
    }
    return tipo;
  };

  const MAX_PLAUSIBLE_SPEED = 130; // km/h — acima disso é salto de GPS
  let movMs = 0, stopMs = 0, stopCount = 0;
  let maxSpd = 0, maxSpdIdx = 0;
  let wasMoving = true;
  let currentStopMs = 0;
  let longestStop = 0, shortestStop = Infinity;

  for (let i = 1; i < trackPoints.length; i++) {
    const prev = trackPoints[i - 1];
    const curr = trackPoints[i];
    const d = haversine(prev.lat, prev.lon, curr.lat, curr.lon);

    if (prev.time && curr.time) {
      const dt = new Date(curr.time).getTime() - new Date(prev.time).getTime();
      if (dt > 0) {
        const spd = d / (dt / 3600000);
        if (spd > MAX_PLAUSIBLE_SPEED) continue; // salto de GPS
        totalDist += d;
        if (spd >= 2) {
          if (!wasMoving && currentStopMs > 0) {
            if (currentStopMs >= 300000) { // só conta parada >= 5 min
              stopCount++;
              if (currentStopMs > longestStop) longestStop = currentStopMs;
              if (currentStopMs < shortestStop) shortestStop = currentStopMs;
            }
            currentStopMs = 0;
          }
          movMs += dt;
          if (spd > maxSpd) { maxSpd = spd; maxSpdIdx = i; }
          wasMoving = true;
          // Velocidade por tipo de via — só em movimento
          const tipo = getRoadType(i);
          if (tipo !== 'desconhecido') {
            viaKm[tipo] = (viaKm[tipo] || 0) + d;
            viaMs[tipo] = (viaMs[tipo] || 0) + dt;
          }
        } else {
          stopMs += dt;
          currentStopMs += dt;
          wasMoving = false;
        }
      } else {
        totalDist += d;
      }
    } else {
      totalDist += d;
    }
  }

  // Última parada pendente
  if (!wasMoving && currentStopMs >= 300000) {
    stopCount++;
    if (currentStopMs > longestStop) longestStop = currentStopMs;
    if (currentStopMs < shortestStop) shortestStop = currentStopMs;
  }

  // Tempo total
  let tempoTotal = '—';
  if (trackPoints.length >= 2 && trackPoints[0].time && trackPoints[trackPoints.length - 1].time) {
    const ms = new Date(trackPoints[trackPoints.length - 1].time!).getTime() - new Date(trackPoints[0].time!).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    tempoTotal = h > 0 ? `${h}h${m.toString().padStart(2, '0')}min` : `${m}min`;
  }

  const fmtMs = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h${m.toString().padStart(2, '0')}min` : `${m}min`;
  };

  const porTipoVia: Record<string, RoadTypeStats> = {};
  for (const tipo of Object.keys(viaKm)) {
    if (viaMs[tipo] > 0) {
      porTipoVia[tipo] = { km: Math.round(viaKm[tipo] * 10) / 10, velMedia: Math.round(viaKm[tipo] / (viaMs[tipo] / 3600000)) };
    }
  }

  return {
    distanciaKm: totalDist,
    tempoTotal,
    velMediaAsfalto: porTipoVia['Asfalto'] ? porTipoVia['Asfalto'].velMedia : null,
    velMediaEstrada: (() => { const e = Object.entries(porTipoVia).find(([k]) => k !== 'Asfalto'); return e ? e[1].velMedia : null; })(),
    velMaxima: maxSpd > 0 ? Math.round(maxSpd) : null,
    velMaximaIdx: maxSpd > 0 ? maxSpdIdx : null,
    tempoMovimento: movMs > 0 ? fmtMs(movMs) : null,
    tempoParado: stopMs > 0 ? fmtMs(stopMs) : null,
    tempoMedioParado: stopCount > 0 ? fmtMs(stopMs / stopCount) : null,
    totalParadas: stopCount,
    paradaMaisLonga: longestStop > 0 ? fmtMs(longestStop) : null,
    paradaMaisCurta: shortestStop < Infinity ? fmtMs(shortestStop) : null,
    porTipoVia,
  };
}
