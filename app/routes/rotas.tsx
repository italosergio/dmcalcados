import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { useNavigate } from 'react-router';
import { getUserRoles } from '~/models';
import { Card } from '~/components/common/Card';
import { parseGpx, findClosestTrackIndex, calcRouteStats, type GpxData } from '~/utils/gpx-parser';
import { getWaypointMapping, getUniqueTags, resolveFazendaLabels } from '~/utils/waypoint-mappings';
import { Upload, MapPin, Navigation, Clock, Mountain, X, Filter, Users, ShoppingBag, XCircle, StickyNote, Building2, AlertTriangle, Route, Minus, UtensilsCrossed, Save, Trash2, FolderOpen, Loader2, Droplets, Pencil, Undo2, Check, Link2, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { getRotas, getRotaGpx, saveRota, deleteRota, deleteAllRotas, marcarVisualizada, type RotaMeta } from '~/services/rotas.service';
import { getClientes, updateCliente } from '~/services/clientes.service';
import type { Cliente } from '~/models';

const ICON_MAP: Record<string, typeof MapPin> = {
  Users, ShoppingBag, XCircle, StickyNote, Building2, AlertTriangle, Route, Minus, UtensilsCrossed, MapPin, Droplets,
};

// Cor representativa de cada tag para o badge
const TAG_COLORS: Record<string, string> = {
  'Clientes': '#3b82f6',
  'Comprou': '#10b981',
  'Não comprou': '#ef4444',
  'Nota': '#f59e0b',
  'Hotel': '#8b5cf6',
  'Perigo': '#ef4444',
  'Restaurante': '#f97316',
};

const DEFAULT_VISIBLE_TAGS = new Set(['Clientes', 'Restaurante']);
const HIDDEN_TAGS = new Set(['Outro', 'Via']);

export default function Rotas() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [gpxData, setGpxData] = useState<GpxData | null>(null);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<any> | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [noteModal, setNoteModal] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [hiddenTags, setHiddenTags] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try { const v = localStorage.getItem('rotas_hiddenTags'); return v ? new Set(JSON.parse(v)) : new Set(); } catch { return new Set(); }
  });
  const [editing, setEditing] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('rotas_editing') === 'true';
  });
  const [gpxBackup, setGpxBackup] = useState<GpxData | null>(null);
  const [editHistory, setEditHistory] = useState<GpxData[]>([]);
  const [undoTimer, setUndoTimer] = useState(0);
  const undoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isFromList, setIsFromList] = useState(false);
  const [deleteClicks, setDeleteClicks] = useState<Record<string, number>>({});
  const deleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [openRotaId, setOpenRotaId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('rotas_openId') || null;
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const infoOverlayRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = infoOverlayRef.current;
    const container = mapContainerRef.current;
    if (!el || !container) return;
    const ro = new ResizeObserver(() => {
      container.style.setProperty('--info-bottom', `${el.offsetHeight}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  });
  const [rotasSalvas, setRotasSalvas] = useState<RotaMeta[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingRotas, setLoadingRotas] = useState(true);
  const [filtroData, setFiltroData] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState<'7dias' | '30dias' | '60dias' | 'mes' | 'ano' | 'tudo'>('tudo');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [loadingGpx, setLoadingGpx] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [wpModal, setWpModal] = useState<{ idx: number; lat: number; lon: number; tag: string } | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSearch, setClienteSearch] = useState('');
  const [clientesLoaded, setClientesLoaded] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [trechoMode, setTrechoMode] = useState(false);
  const [flyToIdx, setFlyToIdx] = useState<number | null>(null);
  const [darkMap, setDarkMap] = useState(() => {
    if (typeof window === 'undefined') return true;
    return (localStorage.getItem('rotas_tileKey') || 'padrao') === 'padrao';
  });
  const [trechoRange, setTrechoRange] = useState<[number, number] | null>(null);
  const [infoMinimized, setInfoMinimized] = useState(true);
  const [infoVisible, setInfoVisible] = useState(false);

  // Auto-expand info after 2s
  useEffect(() => {
    if (!gpxData) return;
    setInfoMinimized(true);
    setInfoVisible(false);
    const t1 = setTimeout(() => setInfoVisible(true), 300);
    const t2 = setTimeout(() => setInfoMinimized(false), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [gpxData]);

  // Persistir preferências
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('rotas_hiddenTags', JSON.stringify([...hiddenTags])); }, [hiddenTags]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('rotas_editing', String(editing)); }, [editing]);
  useEffect(() => { if (typeof window !== 'undefined') { if (openRotaId) localStorage.setItem('rotas_openId', openRotaId); else localStorage.removeItem('rotas_openId'); } }, [openRotaId]);

  // Reabrir rota salva no localStorage
  useEffect(() => {
    if (!openRotaId || gpxData || loadingRotas) return;
    const rota = rotasSalvas.find(r => r.id === openRotaId);
    if (rota) handleLoad(rota);
    else if (!loadingRotas) setOpenRotaId(null);
  }, [openRotaId, rotasSalvas, loadingRotas]);

  const localidades = useMemo(() => {
    const set = new Set<string>();
    rotasSalvas.forEach(r => r.locais?.trajeto?.forEach(l => set.add(l)));
    return Array.from(set).sort();
  }, [rotasSalvas]);

  const availableTags = useMemo(() => {
    if (!gpxData) return [];
    return getUniqueTags(gpxData.waypoints.map(w => w.name)).filter(t => !HIDDEN_TAGS.has(t));
  }, [gpxData]);

  const getDefaultHidden = (data: GpxData) => {
    const all = getUniqueTags(data.waypoints.map(w => w.name)).filter(t => !HIDDEN_TAGS.has(t));
    return new Set(all.filter(t => !DEFAULT_VISIBLE_TAGS.has(t)));
  };

  const toggleTag = (tag: string) => {
    setHiddenTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  };

  const fazendaLabels = useMemo(() => {
    if (!gpxData) return new Map<number, string>();
    return resolveFazendaLabels(gpxData.waypoints);
  }, [gpxData]);

  const routeStats = useMemo(() => {
    if (!gpxData || gpxData.trackPoints.length < 2) return null;
    const roadSegments = gpxData.waypoints
      .map(wp => {
        const m = getWaypointMapping(wp.name);
        if (!m.isRoadType || !m.roadLabel) return null;
        return { index: findClosestTrackIndex(wp.lat, wp.lon, gpxData.trackPoints), roadLabel: m.roadLabel };
      })
      .filter(Boolean) as { index: number; roadLabel: string }[];
    return calcRouteStats(gpxData.trackPoints, roadSegments);
  }, [gpxData]);

  const trechoStats = useMemo(() => {
    if (!gpxData || !trechoRange || gpxData.trackPoints.length < 2) return null;
    const [s, e] = trechoRange;
    const sliced = gpxData.trackPoints.slice(s, e + 1);
    if (sliced.length < 2) return null;
    const roadSegments = gpxData.waypoints
      .map(wp => {
        const m = getWaypointMapping(wp.name);
        if (!m.isRoadType || !m.roadLabel) return null;
        const idx = findClosestTrackIndex(wp.lat, wp.lon, gpxData.trackPoints);
        if (idx < s || idx > e) return null;
        return { index: idx - s, roadLabel: m.roadLabel };
      })
      .filter(Boolean) as { index: number; roadLabel: string }[];
    return calcRouteStats(sliced, roadSegments);
  }, [gpxData, trechoRange]);

  const filteredWaypoints = useMemo(() => {
    if (!gpxData) return [];
    return gpxData.waypoints
      .map((wp, idx) => ({ wp, idx }))
      .filter(({ wp }) => {
        const m = getWaypointMapping(wp.name);
        return m.tag !== 'Outro' && !hiddenTags.has(m.tag);
      });
  }, [gpxData, hiddenTags]);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
    if (!loading && user) {
      const roles = getUserRoles(user);
      const allowed = roles.some(r => ['superadmin', 'admin', 'financeiro', 'desenvolvedor'].includes(r));
      if (!allowed) navigate('/vendas');
    }
  }, [user, loading]);

  useEffect(() => {
    import('~/components/rotas/GpxMap').then(m => setMapComponent(() => m.GpxMap));
  }, []);

  useEffect(() => {
    getRotas().then(r => { setRotasSalvas(r); setLoadingRotas(false); }).catch(() => setLoadingRotas(false));
  }, []);

  const handleSave = async () => {
    if (!gpxData || !user) return;
    setSaving(true);
    try {
      const { id, stats, locais } = await saveRota(gpxData, user.id, user.nome);
      setRotasSalvas(prev => [...prev, { id, name: gpxData.name, usuarioId: user.id, usuarioNome: user.nome, waypointCount: gpxData.waypoints.length, trackPointCount: gpxData.trackPoints.length, stats, locais, createdAt: new Date().toISOString() }]);
    } finally { setSaving(false); }
  };

  const handleDeleteClick = (id: string) => {
    const clicks = (deleteClicks[id] || 0) + 1;
    clearTimeout(deleteTimers.current[id]);
    if (clicks >= 3) {
      setDeleteClicks(prev => { const n = { ...prev }; delete n[id]; return n; });
      handleDelete(id);
    } else {
      setDeleteClicks(prev => ({ ...prev, [id]: clicks }));
      deleteTimers.current[id] = setTimeout(() => {
        setDeleteClicks(prev => { const n = { ...prev }; delete n[id]; return n; });
      }, 3000);
    }
  };

  const deleteLabel = (id: string) => {
    const c = deleteClicks[id] || 0;
    return c === 0 ? 'Apagar' : c === 1 ? 'Tem certeza?' : 'Confirmar!';
  };

  const handleDeleteAllClick = () => {
    const clicks = (deleteClicks['__all__'] || 0) + 1;
    clearTimeout(deleteTimers.current['__all__']);
    if (clicks >= 3) {
      setDeleteClicks(prev => { const n = { ...prev }; delete n['__all__']; return n; });
      handleDeleteAll();
    } else {
      setDeleteClicks(prev => ({ ...prev, ['__all__']: clicks }));
      deleteTimers.current['__all__'] = setTimeout(() => {
        setDeleteClicks(prev => { const n = { ...prev }; delete n['__all__']; return n; });
      }, 3000);
    }
  };

  const deleteAllLabel = () => {
    const c = deleteClicks['__all__'] || 0;
    return c === 0 ? 'Apagar todas' : c === 1 ? 'Tem certeza?' : 'Confirmar!';
  };

  const handleDelete = async (id: string) => {
    await deleteRota(id);
    setRotasSalvas(prev => prev.filter(r => r.id !== id));
    if (openRotaId === id) {
      setGpxData(null); setHiddenTags(new Set()); setEditing(false); setGpxBackup(null); setEditHistory([]); setIsFromList(false); setOpenRotaId(null);
    }
  };

  const handleDeleteAll = async () => {
    await deleteAllRotas();
    setRotasSalvas([]);
  };

  const handleLoad = async (rota: RotaMeta) => {
    setLoadingGpx(rota.id);
    try {
      const gpx = await getRotaGpx(rota.id);
      if (gpx) { setGpxData(gpx); setIsFromList(true); setOpenRotaId(rota.id); setHiddenTags(getDefaultHidden(gpx)); }
      if (!rota.visualizada) {
        await marcarVisualizada(rota.id);
        setRotasSalvas(prev => prev.map(r => r.id === rota.id ? { ...r, visualizada: true } : r));
      }
    } finally { setLoadingGpx(null); }
  };

  const handleFiles = async (files: FileList) => {
    if (!user) return;
    const gpxFiles = Array.from(files).filter(f => f.name.endsWith('.gpx'));
    if (gpxFiles.length === 0) return;
    setUploading(true);
    setShowUpload(false);
    try {
      for (let fi = 0; fi < gpxFiles.length; fi++) {
        const file = gpxFiles[fi];
        const prefix = gpxFiles.length > 1 ? `[${fi + 1}/${gpxFiles.length}] ` : '';

        setUploadStatus(`${prefix}Lendo ${file.name}...`);
        const text = await file.text();

        setUploadStatus(`${prefix}Processando ${file.name}...`);
        const parsed = parseGpx(text);

        // Formatar título: 2026-04-07_09-33-12 → 07/04/2026 09:33:12
        const nameMatch = parsed.name.match(/(\d{4})-(\d{2})-(\d{2})[_T](\d{2})-(\d{2})-(\d{2})/);
        if (nameMatch) {
          const [, y, mo, d, h, mi, s] = nameMatch;
          parsed.name = `${d}/${mo}/${y} ${h}:${mi}:${s}`;
        }

        const { id, stats, locais } = await saveRota(parsed, user.id, user.nome, (step) => {
          setUploadStatus(`${prefix}${parsed.name} — ${step}`);
        });

        setUploadStatus(`${prefix}${parsed.name} — Salva!`);
        setRotasSalvas(prev => [...prev, { id, name: parsed.name, usuarioId: user.id, usuarioNome: user.nome, waypointCount: parsed.waypoints.length, trackPointCount: parsed.trackPoints.length, stats, locais, createdAt: new Date().toISOString() }]);
      }
    } finally { setUploading(false); setUploadStatus(''); }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
  };

  const startUndoTimer = () => {
    setUndoTimer(5);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    undoIntervalRef.current = setInterval(() => {
      setUndoTimer(prev => {
        if (prev <= 1) {
          clearInterval(undoIntervalRef.current!);
          undoIntervalRef.current = null;
          setGpxBackup(null);
          setEditHistory([]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleUndo = () => {
    if (gpxBackup) setGpxData(gpxBackup);
    setGpxBackup(null);
    setEditHistory([]);
    setUndoTimer(0);
    if (undoIntervalRef.current) { clearInterval(undoIntervalRef.current); undoIntervalRef.current = null; }
  };

  const handleUndoLast = () => {
    if (editHistory.length === 0) return;
    const prev = editHistory[editHistory.length - 1];
    setEditHistory(h => h.slice(0, -1));
    setGpxData(prev);
  };

  const handleTrimRoute = (startIdx: number, endIdx: number) => {
    if (!gpxData) return;
    setEditHistory(h => [...h, gpxData]);
    const trimmedTrack = gpxData.trackPoints.slice(startIdx, endIdx + 1);
    const trimmedWaypoints = gpxData.waypoints.filter(wp => {
      const idx = findClosestTrackIndex(wp.lat, wp.lon, gpxData.trackPoints);
      return idx >= startIdx && idx <= endIdx;
    });
    setGpxData({ ...gpxData, trackPoints: trimmedTrack, waypoints: trimmedWaypoints });
  };

  const handleWaypointClick = (wpIdx: number, lat: number, lon: number, tag: string) => {
    setWpModal({ idx: wpIdx, lat, lon, tag });
    if (!clientesLoaded && ['Clientes', 'Comprou', 'Não comprou'].includes(tag)) {
      getClientes().then(c => { setClientes(c); setClientesLoaded(true); });
    }
  };

  const handleDeleteWaypoint = () => {
    if (!gpxData || !wpModal) return;
    const wps = [...gpxData.waypoints];
    wps.splice(wpModal.idx, 1);
    setGpxData({ ...gpxData, waypoints: wps });
    setWpModal(null);
  };

  const handleVincularCliente = async (cliente: Cliente) => {
    if (!wpModal) return;
    await updateCliente(cliente.id, { localizacao: { lat: wpModal.lat, lon: wpModal.lon } });
    setClientes(prev => prev.map(c => c.id === cliente.id ? { ...c, localizacao: { lat: wpModal.lat, lon: wpModal.lon } } : c));
    setWpModal(null);
    setClienteSearch('');
  };

  const formatTime = (iso?: string) => iso ? new Date(iso).toLocaleString('pt-BR') : '—';

  if (loading || !user) return null;

  return (
    <div className={`flex flex-col flex-1 min-h-0 ${gpxData ? '' : 'overflow-hidden'}`}>

      {!gpxData ? (
      <Card className="p-0 overflow-hidden flex-1 min-h-0 flex flex-col">
          <>
            {showUpload ? (
              <div
                className={`flex flex-col items-center justify-center gap-3 p-12 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  dragOver ? 'border-blue-400 bg-blue-500/10' : 'border-border-subtle hover:border-content-muted'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={36} className="text-content-muted" />
                <p className="text-sm text-content-secondary">Arraste um arquivo .gpx ou clique para selecionar</p>
                <p className="text-xs text-content-muted">Compatível com OSMTracker e outros apps GPX</p>
                <input ref={fileRef} type="file" accept=".gpx" multiple className="hidden" onChange={onFileChange} />
              </div>
            ) : (
              <>
                <div className="px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold text-white/70 flex flex-wrap items-center gap-2 border-b shrink-0" style={{ background: 'rgba(0,0,0,.4)', borderColor: 'rgba(255,255,255,.08)' }}>
                  <span className="flex items-center gap-1.5"><FolderOpen size={13} /> Rotas salvas</span>
                  <div className="ml-auto flex items-center gap-2 sm:gap-3">
                    <button onClick={() => setShowUpload(true)} className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-xs">
                      <Upload size={12} /> <span className="hidden sm:inline">Subir</span> Rota
                    </button>
                    <button onClick={handleDeleteAllClick} className={`transition-colors flex items-center gap-1 text-xs ${(deleteClicks['__all__'] || 0) >= 2 ? 'text-red-300' : 'text-red-400 hover:text-red-300'}`}>
                      <Trash2 size={12} /> <span className="hidden sm:inline">{deleteAllLabel()}</span><span className="sm:hidden">{(deleteClicks['__all__'] || 0) === 0 ? '' : (deleteClicks['__all__'] || 0) === 1 ? '?' : '!'}</span>
                    </button>
                  </div>
                </div>
                {/* Filtros */}
                <div className="flex flex-wrap items-center gap-1.5 px-3 sm:px-4 py-1.5 shrink-0" style={{ background: 'rgba(0,0,0,.3)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                  {([
                    { value: '7dias', label: '7d' },
                    { value: '30dias', label: '30d' },
                    { value: '60dias', label: '60d' },
                    { value: 'mes', label: 'Mês' },
                    { value: 'ano', label: 'Ano' },
                    { value: 'tudo', label: 'Tudo' },
                  ] as { value: typeof filtroPeriodo; label: string }[]).map(opt => (
                    <button key={opt.value} onClick={() => { setFiltroPeriodo(opt.value); setFiltroData(''); setFiltroDataFim(''); }}
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-medium transition ${
                        filtroPeriodo === opt.value && !filtroData && !filtroDataFim
                          ? 'bg-blue-500/30 text-blue-400'
                          : 'text-white/40 hover:text-white/60'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                  <span className="text-white/10">│</span>
                  <input type="date" value={filtroData} onChange={e => { setFiltroData(e.target.value); if (e.target.value) setFiltroPeriodo('tudo'); }}
                    className="rounded-lg border bg-white/5 px-1.5 py-0.5 text-[10px] text-white/70 border-white/10 focus:outline-none focus:border-white/25 w-[6rem]" />
                  <span className="text-[10px] text-white/30">até</span>
                  <input type="date" value={filtroDataFim} onChange={e => { setFiltroDataFim(e.target.value); if (e.target.value) setFiltroPeriodo('tudo'); }}
                    className="rounded-lg border bg-white/5 px-1.5 py-0.5 text-[10px] text-white/70 border-white/10 focus:outline-none focus:border-white/25 w-[6rem]" />
                </div>
                {/* Busca localidade */}
                <div className="relative px-3 sm:px-4 py-1.5 shrink-0" style={{ background: 'rgba(0,0,0,.25)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                  <div className="flex items-center gap-1.5">
                    <Search size={12} className="text-white/30" />
                    <input
                      type="text"
                      placeholder="Buscar localidade..."
                      value={filtroBusca}
                      onChange={e => { setFiltroBusca(e.target.value); setBuscaAberta(true); }}
                      onFocus={() => setBuscaAberta(true)}
                      className="flex-1 bg-transparent text-[11px] text-white/80 placeholder-white/30 outline-none"
                    />
                    {filtroBusca && <button onClick={() => { setFiltroBusca(''); setBuscaAberta(false); }} className="text-white/30 hover:text-white/60"><X size={12} /></button>}
                  </div>
                  {buscaAberta && filtroBusca.length === 0 && localidades.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-50 max-h-40 overflow-y-auto rounded-b-lg shadow-lg backdrop-blur-md" style={{ background: 'rgba(0,0,0,.7)', border: '1px solid rgba(255,255,255,.1)', borderTop: 'none' }}>
                      {localidades.map(l => (
                        <button key={l} onClick={() => { setFiltroBusca(l); setBuscaAberta(false); }} className="block w-full text-left px-3 py-1.5 text-[11px] text-white/70 hover:bg-white/10 transition">{l}</button>
                      ))}
                    </div>
                  )}
                  {buscaAberta && filtroBusca.length > 0 && (() => {
                    const q = filtroBusca.toLowerCase();
                    const matches = localidades.filter(l => l.toLowerCase().includes(q));
                    if (matches.length === 0) return null;
                    return (
                      <div className="absolute left-0 right-0 top-full z-50 max-h-40 overflow-y-auto rounded-b-lg shadow-lg backdrop-blur-md" style={{ background: 'rgba(0,0,0,.7)', border: '1px solid rgba(255,255,255,.1)', borderTop: 'none' }}>
                        {matches.map(l => (
                          <button key={l} onClick={() => { setFiltroBusca(l); setBuscaAberta(false); }} className="block w-full text-left px-3 py-1.5 text-[11px] text-white/70 hover:bg-white/10 transition">{l}</button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: 'rgba(0,0,0,.2)' }} onClick={() => setBuscaAberta(false)}>
                  {uploading && (
                    <div className="flex items-center py-3 px-3 sm:px-4 text-blue-400 text-xs gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}><Loader2 size={14} className="animate-spin" /> {uploadStatus || 'Salvando...'}</div>
                  )}
                  {loadingRotas ? (
                    <div className="flex items-center justify-center py-8 text-white/40 text-sm gap-2"><Loader2 size={16} className="animate-spin" /> Carregando...</div>
                  ) : rotasSalvas.length === 0 ? (
                    <div className="text-center py-8 text-white/40 text-sm">Nenhuma rota salva</div>
                  ) : (
                    <div>
                      {[...rotasSalvas]
                        .filter(r => {
                          // Período
                          if (filtroPeriodo !== 'tudo' && !filtroData && !filtroDataFim) {
                            const agora = new Date();
                            const inicio = new Date();
                            if (filtroPeriodo === '7dias') inicio.setDate(agora.getDate() - 7);
                            else if (filtroPeriodo === '30dias') inicio.setDate(agora.getDate() - 30);
                            else if (filtroPeriodo === '60dias') inicio.setDate(agora.getDate() - 60);
                            else if (filtroPeriodo === 'mes') { inicio.setDate(1); inicio.setHours(0, 0, 0, 0); }
                            else if (filtroPeriodo === 'ano') inicio.setFullYear(agora.getFullYear(), 0, 1);
                            if (new Date(r.createdAt) < inicio) return false;
                          }
                          if (filtroData && new Date(r.createdAt) < new Date(filtroData + 'T00:00:00')) return false;
                          if (filtroDataFim && new Date(r.createdAt) > new Date(filtroDataFim + 'T23:59:59')) return false;
                          // Busca localidade
                          if (filtroBusca) {
                            const q = filtroBusca.toLowerCase();
                            const trajeto = r.locais?.trajeto?.join(' ').toLowerCase() || '';
                            if (!trajeto.includes(q)) return false;
                          }
                          return true;
                        })
                        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(r => (
                        <div key={r.id} className="flex items-center gap-3 px-3 sm:px-4 py-2.5 transition-colors hover:bg-white/5" style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                          <Navigation size={14} className="text-blue-400 shrink-0" />
                          {!r.visualizada && <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />}
                          <button onClick={() => handleLoad(r)} disabled={loadingGpx === r.id} className="flex-1 text-left min-w-0">
                            {loadingGpx === r.id ? <span className="text-sm text-white/40 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Carregando...</span> : <>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                              <span className="text-sm font-medium text-white/90 truncate">{r.name}{!r.visualizada && <span className="ml-2 text-[10px] font-semibold text-blue-400">Nova</span>}</span>
                              {r.locais?.trajeto && r.locais.trajeto.length > 0 && (
                                <span className="text-[11px] text-blue-300/80 truncate">{r.locais.trajeto.join(' → ')}</span>
                              )}
                            </div>
                            <div className="text-[11px] text-white/40 flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                              <span>{r.usuarioNome} · {new Date(r.createdAt).toLocaleDateString('pt-BR')}</span>
                              {r.stats && <>
                                <span>{r.stats.distanciaKm} km</span>
                                <span>{r.stats.tempoTotal}</span>
                                {r.stats.velMediaMovimento && <span>~{r.stats.velMediaMovimento} km/h</span>}
                                {r.stats.velMaxima && <span>Máx: {r.stats.velMaxima} km/h</span>}
                                {r.stats.tempoParado && <span>Parado: {r.stats.tempoParado}</span>}
                              </>}
                            </div>
                            </>}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        </Card>
      ) : (
          <div className="absolute inset-0 z-20">
            {/* Mapa fullscreen */}
            <div ref={mapContainerRef} className="absolute inset-0">
              {MapComponent ? (
                <MapComponent data={gpxData} hiddenTags={hiddenTags} onNoteClick={(name: string, lat: number, lon: number) => setNoteModal({ name, lat, lon })} onTrimRoute={handleTrimRoute} onWaypointClick={handleWaypointClick} onUndoLast={handleUndoLast} canUndo={editHistory.length > 0} editing={editing} trechoMode={trechoMode} trechoRange={trechoRange} onTrechoChange={(s: number, e: number) => setTrechoRange([s, e])} flyToIdx={flyToIdx} onEditWaypoint={(idx: number) => setWpModal({ idx, lat: gpxData.waypoints[idx]?.lat || 0, lon: gpxData.waypoints[idx]?.lon || 0, tag: '' })} onDeleteWaypoint={(idx: number) => { setGpxData({ ...gpxData, waypoints: gpxData.waypoints.filter((_: any, i: number) => i !== idx) }); }} onTileChange={(key: string) => setDarkMap(key === 'padrao')} />
              ) : (
                <div className="h-full flex items-center justify-center text-content-muted text-sm">Carregando mapa...</div>
              )}
            </div>

            {/* Info overlay - top */}
            <div ref={infoOverlayRef} className="absolute top-0 left-0 right-0 z-[900] pointer-events-none transition-opacity duration-500" style={{ opacity: infoVisible ? 1 : 0 }}>
              {/* Actions bar - always visible */}
              <div className={`pointer-events-auto flex items-center gap-2 px-3 py-2 text-xs ${darkMap ? 'backdrop-blur-md' : ''}`} style={{ background: darkMap ? 'rgba(0,0,0,.55)' : '#1a1a1e', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                <button onClick={() => setInfoMinimized(v => !v)} className="text-white/50 hover:text-white shrink-0">
                  {infoMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                <span className="font-semibold text-white text-sm truncate">{gpxData.name}</span>
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  {!editing ? (
                    <>
                      {!trechoMode ? (
                        <button onClick={() => { setTrechoMode(true); setTrechoRange([0, gpxData.trackPoints.length - 1]); }} className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1">
                          <Route size={12} /> <span className="hidden sm:inline">Trecho</span>
                        </button>
                      ) : (
                        <button onClick={() => { setTrechoMode(false); setTrechoRange(null); }} className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1">
                          <X size={12} /> <span className="hidden sm:inline">Fechar</span>
                        </button>
                      )}
                      <button onClick={() => { setGpxBackup(gpxData); setEditing(true); setTrechoMode(false); setTrechoRange(null); }} className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                        <Pencil size={12} /> <span className="hidden sm:inline">Editar</span>
                      </button>
                      {undoTimer > 0 && gpxBackup && (
                        <button onClick={handleUndo} className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-1">
                          <Undo2 size={12} /> ({undoTimer}s)
                        </button>
                      )}
                    </>
                  ) : (
                    <button onClick={() => { setEditing(false); startUndoTimer(); }} className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1">
                      <Check size={12} /> Salvar
                    </button>
                  )}
                  {(!isFromList || editing) && (
                    <button onClick={handleSave} disabled={saving || editing} className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1 disabled:opacity-50">
                      {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    </button>
                  )}
                  {openRotaId && (
                    <button onClick={() => handleDeleteClick(openRotaId)} className={`text-xs transition-colors flex items-center gap-1 ${(deleteClicks[openRotaId] || 0) >= 2 ? 'text-red-300' : 'text-red-400 hover:text-red-300'}`}>
                      <Trash2 size={12} /> {deleteLabel(openRotaId)}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (editing) { if (gpxBackup) setGpxData(gpxBackup); setEditing(false); setGpxBackup(null); }
                      else { setGpxData(null); setHiddenTags(new Set()); setIsFromList(false); setOpenRotaId(null); setTrechoMode(false); setTrechoRange(null); if (fileRef.current) fileRef.current.value = ''; }
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <Undo2 size={18} />
                  </button>
                </div>
              </div>

              {/* Expandable info */}
              <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: infoMinimized ? '0px' : '300px', opacity: infoMinimized ? 0 : 1 }}>
                  {/* Stats */}
                  {(() => {
                    const stats = trechoMode && trechoStats ? trechoStats : routeStats;
                    if (!stats) return null;
                    return (
                      <div className={`pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-1.5 text-[11px] ${darkMap ? 'backdrop-blur-md' : ''}`} style={{ background: darkMap ? 'rgba(0,0,0,.45)' : '#1a1a1e', borderBottom: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.7)' }}>
                        {trechoMode && <span className="text-green-400 font-semibold">Trecho</span>}
                        <span>{stats.distanciaKm.toFixed(1)} km</span>
                        <span>{stats.tempoTotal}</span>
                        {Object.entries(stats.porTipoVia).map(([tipo, s]) => (
                          <span key={tipo}>{tipo}: {s.km} km · {s.velMedia} km/h</span>
                        ))}
                        {stats.velMaxima && (
                          <button
                            onClick={() => { if (stats.velMaximaIdx != null) { setFlyToIdx(null); setTimeout(() => setFlyToIdx(stats.velMaximaIdx), 0); } }}
                            className="text-red-400 hover:text-red-300 underline decoration-dotted cursor-pointer"
                          >
                            Máx: {stats.velMaxima} km/h
                          </button>
                        )}
                        {stats.tempoMovimento && <span>Mov: {stats.tempoMovimento}</span>}
                        {stats.tempoParado && <span>Parado: {stats.tempoParado}</span>}
                        {stats.totalParadas > 0 && <span>{stats.totalParadas} paradas</span>}
                        {stats.tempoMedioParado && <span>Média: {stats.tempoMedioParado}/parada</span>}
                      </div>
                    );
                  })()}

                  {/* Trajeto */}
                  {openRotaId && (() => {
                    const rota = rotasSalvas.find(r => r.id === openRotaId);
                    const trajeto = rota?.locais?.trajeto;
                    if (!trajeto || trajeto.length < 2) return null;
                    return (
                      <div className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 text-xs overflow-x-auto ${darkMap ? 'backdrop-blur-md' : ''}`} style={{ background: darkMap ? 'rgba(0,0,0,.35)' : '#1a1a1e', borderBottom: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.7)' }}>
                        {trajeto.map((local, i) => (
                          <span key={i} className="flex items-center gap-1.5 shrink-0">
                            {i > 0 && <span className="text-white/30">→</span>}
                            <span className={i === 0 ? 'text-green-400 font-medium' : i === trajeto.length - 1 ? 'text-red-400 font-medium' : ''}>{local}</span>
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Filtros */}
                  {availableTags.length > 0 && (
                    <div className={`pointer-events-auto flex flex-wrap items-center gap-1.5 px-3 py-1.5 ${darkMap ? 'backdrop-blur-md' : ''}`} style={{ background: darkMap ? 'rgba(0,0,0,.3)' : '#1a1a1e', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                      <Filter size={12} className="text-white/40 shrink-0" />
                      {availableTags.map(tag => {
                        const active = !hiddenTags.has(tag);
                        const color = TAG_COLORS[tag] || '#6b7280';
                        return (
                          <button key={tag} onClick={() => toggleTag(tag)} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all border" style={{ borderColor: active ? `${color}80` : 'rgba(255,255,255,.15)', background: active ? `${color}30` : 'transparent', color: active ? color : 'rgba(255,255,255,.35)' }}>
                            {tag}
                          </button>
                        );
                      })}
                      {hiddenTags.size > 0 && <button onClick={() => setHiddenTags(new Set())} className="text-[10px] ml-1 text-white/30 hover:text-white/60">Todos</button>}
                      {hiddenTags.size < availableTags.length && <button onClick={() => setHiddenTags(new Set(availableTags))} className="text-[10px] ml-1 text-white/30 hover:text-white/60">Nenhum</button>}
                    </div>
                  )}
              </div>
              {/* Botão minimizar centralizado */}
              <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2 z-10" style={{ bottom: '-24px' }}>
                <button
                  onClick={() => setInfoMinimized(v => !v)}
                  className="w-8 h-6 flex items-center justify-center rounded-b-lg backdrop-blur-md shadow-lg transition-all"
                  style={{ background: 'rgba(0,0,0,.55)', borderLeft: '1px solid rgba(255,255,255,.1)', borderRight: '1px solid rgba(255,255,255,.1)', borderBottom: '1px solid rgba(255,255,255,.1)', color: '#fff' }}
                >
                  {infoMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
              </div>
            </div>
          </div>
      )}

      {/* Modal de Nota */}
      {noteModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60" onClick={() => setNoteModal(null)}>
          <div className="bg-surface border border-border-subtle rounded-xl p-6 max-w-md w-full mx-4 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><StickyNote size={16} className="text-yellow-400" /> Nota</h3>
              <button onClick={() => setNoteModal(null)} className="text-content-muted hover:text-content"><X size={18} /></button>
            </div>
            <p className="text-sm text-content-secondary">{noteModal.name}</p>
            <p className="text-xs text-content-muted">{noteModal.lat.toFixed(6)}, {noteModal.lon.toFixed(6)}</p>
          </div>
        </div>
      )}

      {/* Modal de edição de waypoint */}
      {wpModal && gpxData && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60" onClick={() => { setWpModal(null); setClienteSearch(''); }}>
          <div className="bg-surface border border-border-subtle rounded-xl p-5 max-w-sm w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Editar ponto</h3>
              <button onClick={() => { setWpModal(null); setClienteSearch(''); }} className="text-content-muted hover:text-content"><X size={18} /></button>
            </div>
            <div className="text-xs text-content-muted">
              <span className="font-medium text-content">{gpxData.waypoints[wpModal.idx]?.name}</span>
              <span className="ml-2">{wpModal.lat.toFixed(6)}, {wpModal.lon.toFixed(6)}</span>
            </div>

            <button
              onClick={handleDeleteWaypoint}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 transition-colors"
            >
              <Trash2 size={14} /> Apagar ponto
            </button>

            {['Clientes', 'Comprou', 'Não comprou'].includes(wpModal.tag) && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-content-secondary flex items-center gap-1.5"><Link2 size={12} /> Vincular a cliente</p>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted" />
                  <input
                    type="text"
                    value={clienteSearch}
                    onChange={e => setClienteSearch(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-elevated border border-border-subtle rounded-lg focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-border-subtle">
                  {clientes
                    .filter(c => !c.suspenso && c.nome.toLowerCase().includes(clienteSearch.toLowerCase()))
                    .slice(0, 20)
                    .map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleVincularCliente(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-surface-hover transition-colors flex items-center justify-between"
                      >
                        <span>{c.nome}</span>
                        {c.localizacao && <MapPin size={12} className="text-green-400 shrink-0" />}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
