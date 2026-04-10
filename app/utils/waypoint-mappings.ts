export interface WaypointMapping {
  icon: string;
  label: string;
  color: string;
  tag: string;
  isRoadType?: boolean;
  roadColor?: string;
  roadLabel?: string;
  isNote?: boolean;
}

// SVGs inline dos ícones Lucide usados nos markers do mapa
const LUCIDE_SVGS: Record<string, string> = {
  Users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  ShoppingBag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  XCircle: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  StickyNote: '<path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/>',
  Building2: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
  AlertTriangle: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  Droplets: '<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>',
  Route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  Minus: '<path d="M5 12h14"/>',
  UtensilsCrossed: '<path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c1.7 1.7 4.3 1.7 6 0"/><path d="m2 22 5.5-5.5"/><path d="m22 2-5.5 5.5"/>',
  MapPin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
};

export function getLucideSvg(iconName: string, size: number, color: string): string {
  const paths = LUCIDE_SVGS[iconName] || LUCIDE_SVGS.MapPin;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

// Nomes exatos do OSMTracker (lowercase) → mapeamento
const MAPPINGS: Record<string, WaypointMapping> = {
  // Clientes / vendas
  'loja': { icon: 'Users', label: 'Clientes', color: '#3b82f6', tag: 'Clientes' },
  'marina': { icon: 'ShoppingBag', label: 'Cliente comprou', color: '#10b981', tag: 'Comprou' },
  'farmacia': { icon: 'ShoppingBag', label: 'Cliente comprou', color: '#10b981', tag: 'Comprou' },
  'farmácia': { icon: 'ShoppingBag', label: 'Cliente comprou', color: '#10b981', tag: 'Comprou' },
  'hospital': { icon: 'XCircle', label: 'Cliente não comprou', color: '#ef4444', tag: 'Não comprou' },
  'médicos': { icon: 'XCircle', label: 'Cliente não comprou', color: '#ef4444', tag: 'Não comprou' },
  'medicos': { icon: 'XCircle', label: 'Cliente não comprou', color: '#ef4444', tag: 'Não comprou' },

  // Nota
  'nota': { icon: 'StickyNote', label: 'Nota', color: '#f59e0b', tag: 'Nota', isNote: true },

  // Hospedagem
  'museu': { icon: 'Building2', label: 'Hotel', color: '#8b5cf6', tag: 'Hotel' },
  'hotel': { icon: 'Building2', label: 'Hotel', color: '#8b5cf6', tag: 'Hotel' },
  'hotel de estrada': { icon: 'Building2', label: 'Hotel', color: '#8b5cf6', tag: 'Hotel' },
  'hostel': { icon: 'Building2', label: 'Hotel', color: '#8b5cf6', tag: 'Hotel' },

  // Perigos
  'esporte': { icon: 'AlertTriangle', label: 'Buraco', color: '#ef4444', tag: 'Perigo' },
  'aterro': { icon: 'AlertTriangle', label: 'Buraco', color: '#ef4444', tag: 'Perigo' },
  'bacia': { icon: 'Droplets', label: 'Bacia d\'água', color: '#3b82f6', tag: 'Perigo' },
  'faixa de pedestres': { icon: 'AlertTriangle', label: 'Buraco', color: '#ef4444', tag: 'Perigo' },
  'faixa de pedestre': { icon: 'AlertTriangle', label: 'Buraco', color: '#ef4444', tag: 'Perigo' },
  'fazenda': { icon: 'Minus', label: 'Quebra-mola / Ponte', color: '#f59e0b', tag: 'Perigo' },
  'ponte': { icon: 'Minus', label: 'Quebra-mola', color: '#f59e0b', tag: 'Perigo' },

  // Tipos de via — OSMTracker usa esses nomes
  'estrada br': { icon: 'Route', label: 'Asfalto', color: '#9ca3af', tag: 'Via', isRoadType: true, roadColor: '#6b7280', roadLabel: 'Asfalto' },
  'via expressa': { icon: 'Route', label: 'Asfalto', color: '#9ca3af', tag: 'Via', isRoadType: true, roadColor: '#6b7280', roadLabel: 'Asfalto' },
  'primary': { icon: 'Route', label: 'Estrada de chão / Piçarra', color: '#a16207', tag: 'Via', isRoadType: true, roadColor: '#a16207', roadLabel: 'Piçarra / Chão' },
  'via primaria': { icon: 'Route', label: 'Estrada de chão / Piçarra', color: '#a16207', tag: 'Via', isRoadType: true, roadColor: '#a16207', roadLabel: 'Piçarra / Chão' },
  'secondary': { icon: 'Route', label: 'Estrada de areia', color: '#d4a574', tag: 'Via', isRoadType: true, roadColor: '#d4a574', roadLabel: 'Areia' },
  'via secundaria': { icon: 'Route', label: 'Estrada de areia', color: '#d4a574', tag: 'Via', isRoadType: true, roadColor: '#d4a574', roadLabel: 'Areia' },
  'tertiary': { icon: 'Route', label: 'Estrada de areia', color: '#d4a574', tag: 'Via', isRoadType: true, roadColor: '#d4a574', roadLabel: 'Areia' },

  // Restaurante
  'restaurante': { icon: 'UtensilsCrossed', label: 'Restaurante', color: '#f97316', tag: 'Restaurante' },
  'lanchonete': { icon: 'UtensilsCrossed', label: 'Restaurante', color: '#f97316', tag: 'Restaurante' },
  'fast food': { icon: 'UtensilsCrossed', label: 'Restaurante', color: '#f97316', tag: 'Restaurante' },
  'bar': { icon: 'UtensilsCrossed', label: 'Restaurante', color: '#f97316', tag: 'Restaurante' },
};

export function getWaypointMapping(name: string): WaypointMapping {
  const key = name.toLowerCase().trim();
  // Match exato
  if (MAPPINGS[key]) return MAPPINGS[key];
  // Sem acentos
  const keyNorm = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [k, v] of Object.entries(MAPPINGS)) {
    if (k.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === keyNorm) return v;
  }
  return { icon: 'MapPin', label: name, color: '#f59e0b', tag: 'Outro' };
}

/**
 * Resolve waypoints "fazenda" dinamicamente:
 * - 3+ pontos "fazenda" consecutivos com ≤3s entre si → "Ponte"
 * - Caso contrário → "Quebra-mola"
 * Retorna Map<índice do waypoint, label resolvido>
 */
export function resolveFazendaLabels(waypoints: { name: string; time?: string }[]): Map<number, string> {
  const result = new Map<number, string>();
  const isFazenda = (n: string) => n.toLowerCase().trim() === 'fazenda';

  // Coletar índices de fazendas com timestamp
  const fazendas: { idx: number; time: number }[] = [];
  for (let i = 0; i < waypoints.length; i++) {
    if (isFazenda(waypoints[i].name) && waypoints[i].time) {
      fazendas.push({ idx: i, time: new Date(waypoints[i].time!).getTime() });
    }
  }

  // Sem timestamp → todos ficam como "Quebra-mola"
  if (fazendas.length === 0) {
    for (let i = 0; i < waypoints.length; i++) {
      if (isFazenda(waypoints[i].name)) result.set(i, 'Quebra-mola');
    }
    return result;
  }

  // Agrupar por proximidade temporal (≤3s entre consecutivos)
  const groups: number[][] = [];
  let current = [fazendas[0].idx];
  for (let i = 1; i < fazendas.length; i++) {
    const diff = Math.abs(fazendas[i].time - fazendas[i - 1].time);
    if (diff <= 3000) {
      current.push(fazendas[i].idx);
    } else {
      groups.push(current);
      current = [fazendas[i].idx];
    }
  }
  groups.push(current);

  // 3+ no grupo → Ponte, senão → Quebra-mola
  for (const group of groups) {
    const label = group.length >= 3 ? 'Ponte' : 'Quebra-mola';
    for (const idx of group) result.set(idx, label);
  }

  return result;
}

export function getUniqueTags(waypointNames: string[]): string[] {
  const tags = new Set<string>();
  waypointNames.forEach(n => tags.add(getWaypointMapping(n).tag));
  return Array.from(tags);
}

export function isNoteWaypoint(name: string): boolean {
  return getWaypointMapping(name).isNote === true;
}

export function isRoadTypeWaypoint(name: string): boolean {
  return getWaypointMapping(name).isRoadType === true;
}
