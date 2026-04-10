import { ref, push, get, remove, set } from 'firebase/database';
import { db } from './firebase';
import type { GpxData, GpxTrackPoint } from '~/utils/gpx-parser';

export interface RotaStats {
  distanciaKm: number;
  tempoTotal: string;
  velMediaMovimento: number | null;
  velMaxima: number | null;
  tempoParado: string | null;
}

export interface RotaLocal {
  localInicio?: string;
  localFim?: string;
  trajeto?: string[]; // cidades/localidades em sequência
}

export interface RotaMeta {
  id: string;
  name: string;
  usuarioId: string;
  usuarioNome: string;
  waypointCount: number;
  trackPointCount: number;
  stats?: RotaStats;
  locais?: RotaLocal;
  visualizada?: boolean;
  createdAt: string;
}

export interface RotaSalva extends RotaMeta {
  gpxData: GpxData;
}

export async function getRotas(): Promise<RotaMeta[]> {
  const snap = await get(ref(db, 'rotas_meta'));
  if (!snap.exists()) return [];
  const data = snap.val();
  return Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v }));
}

export async function getRotaGpx(id: string): Promise<GpxData | null> {
  const snap = await get(ref(db, `rotas_gpx/${id}`));
  return snap.exists() ? snap.val() : null;
}

function calcListStats(tp: GpxTrackPoint[]): RotaStats {
  const R = 6371;
  const hav = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  let totalDist = 0, movDist = 0, movMs = 0, stopMs = 0, maxSpd = 0;
  let wasMoving = true, currentStopMs = 0, stopCount = 0;
  const MIN_STOP = 300000; // 5 min
  const MAX_PLAUSIBLE_SPEED = 130;
  for (let i = 1; i < tp.length; i++) {
    const d = hav(tp[i - 1].lat, tp[i - 1].lon, tp[i].lat, tp[i].lon);
    if (tp[i - 1].time && tp[i].time) {
      const dt = new Date(tp[i].time!).getTime() - new Date(tp[i - 1].time!).getTime();
      if (dt > 0) {
        const spd = d / (dt / 3600000);
        if (spd > MAX_PLAUSIBLE_SPEED) continue;
        totalDist += d;
        if (spd >= 2) {
          if (!wasMoving && currentStopMs >= MIN_STOP) { stopMs += currentStopMs; stopCount++; }
          currentStopMs = 0;
          movDist += d; movMs += dt; if (spd > maxSpd) maxSpd = spd;
          wasMoving = true;
        } else {
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
  if (!wasMoving && currentStopMs >= MIN_STOP) { stopMs += currentStopMs; stopCount++; }
  const fmtMs = (ms: number) => {
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h${m.toString().padStart(2, '0')}min` : `${m}min`;
  };
  const totalMs = tp.length >= 2 && tp[0].time && tp[tp.length - 1].time
    ? new Date(tp[tp.length - 1].time!).getTime() - new Date(tp[0].time!).getTime() : 0;
  return {
    distanciaKm: Math.round(totalDist * 10) / 10,
    tempoTotal: totalMs > 0 ? fmtMs(totalMs) : '—',
    velMediaMovimento: movMs > 0 ? Math.round(movDist / (movMs / 3600000)) : null,
    velMaxima: maxSpd > 0 ? Math.round(maxSpd) : null,
    tempoParado: stopMs > 0 ? fmtMs(stopMs) : null,
  };
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&accept-language=pt-BR`, {
      headers: { 'User-Agent': 'DMCalcados/1.0' },
    });
    const data = await res.json();
    const a = data.address;
    return a?.city || a?.town || a?.village || a?.municipality || a?.county || 'Desconhecido';
  } catch { return 'Desconhecido'; }
}

async function calcLocais(tp: GpxTrackPoint[]): Promise<RotaLocal> {
  if (tp.length < 2) return {};
  const first = tp[0], last = tp[tp.length - 1];

  // Pontos intermediários espaçados pra montar trajeto (a cada ~20% da rota)
  const sampleIdxs = [0];
  const step = Math.floor(tp.length / 5);
  for (let i = step; i < tp.length - step; i += step) sampleIdxs.push(i);
  sampleIdxs.push(tp.length - 1);

  const names: string[] = [];
  for (const idx of sampleIdxs) {
    // Delay entre requests pra respeitar rate limit do Nominatim
    if (names.length > 0) await new Promise(r => setTimeout(r, 1100));
    const name = await reverseGeocode(tp[idx].lat, tp[idx].lon);
    names.push(name);
  }

  // Remover duplicatas consecutivas
  const trajeto = names.filter((n, i) => i === 0 || n !== names[i - 1]);

  return {
    localInicio: trajeto[0],
    localFim: trajeto[trajeto.length - 1],
    trajeto,
  };
}

export async function saveRota(
  gpxData: GpxData,
  usuarioId: string,
  usuarioNome: string,
  onProgress?: (step: string) => void
): Promise<{ id: string; stats: RotaStats; locais: RotaLocal }> {
  const newRef = push(ref(db, 'rotas_meta'));
  const id = newRef.key!;

  onProgress?.('Calculando estatísticas...');
  const stats = calcListStats(gpxData.trackPoints);

  onProgress?.('Salvando no servidor...');
  const meta: Omit<RotaMeta, 'id'> = {
    name: gpxData.name,
    usuarioId,
    usuarioNome,
    waypointCount: gpxData.waypoints.length,
    trackPointCount: gpxData.trackPoints.length,
    stats,
    createdAt: new Date().toISOString(),
  };
  await Promise.all([
    set(newRef, meta),
    set(ref(db, `rotas_gpx/${id}`), gpxData),
  ]);

  onProgress?.('Localizando cidades do trajeto...');
  const locais = await calcLocais(gpxData.trackPoints);
  await set(ref(db, `rotas_meta/${id}/locais`), locais);

  return { id, stats, locais };
}

export async function deleteRota(id: string): Promise<void> {
  await Promise.all([
    remove(ref(db, `rotas_meta/${id}`)),
    remove(ref(db, `rotas_gpx/${id}`)),
  ]);
}

export async function marcarVisualizada(id: string): Promise<void> {
  await set(ref(db, `rotas_meta/${id}/visualizada`), true);
}

export async function deleteAllRotas(): Promise<void> {
  await Promise.all([
    remove(ref(db, 'rotas_meta')),
    remove(ref(db, 'rotas_gpx')),
    remove(ref(db, 'rotas')),
  ]);
}
