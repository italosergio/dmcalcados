import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Shield, User, Trash2, Plus, X, ShieldAlert, ShieldOff, KeyRound, Pencil, Check } from 'lucide-react';
import { updateUserRoles, deleteUser, updateUserStatus, resetUserPassword } from '~/services/users.service';
import { register, updateProfile } from '~/services/auth.service';
import { useAuth } from '~/contexts/AuthContext';
import type { User as UserType, UserRole } from '~/models';
import { getUserRoles, userIsAdmin } from '~/models';
import { ROLE_LABELS, ROLE_COLORS, RoleBadge } from '~/utils/roles';
import { useUsers } from '~/hooks/useRealtime';

const input = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";

const ROLE_ICON_COLOR: Record<string, string> = {
  vendedor:     'text-green-400',
  vendedor1:    'text-green-400',
  vendedor2:    'text-green-400',
  vendedor3:    'text-green-400',
  admin:        'text-red-400',
  financeiro:   'text-yellow-400',
  desenvolvedor:'text-blue-400',
  superadmin:   'text-purple-300',
};

// Roles que qualquer admin pode atribuir
const ADMIN_ROLES: UserRole[] = ['vendedor1', 'vendedor2', 'vendedor3', 'financeiro', 'admin'];
// Roles exclusivas de superadmin
const SUPERADMIN_ONLY_ROLES: UserRole[] = ['desenvolvedor', 'superadmin'];

function RoleTags({ user }: { user: UserType }) {
  const roles = getUserRoles(user);
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map(r => <RoleBadge key={r} role={r} />)}
    </div>
  );
}

function primaryIconColor(user: UserType): string {
  const roles = getUserRoles(user);
  if (roles.includes('superadmin')) return 'text-purple-300';
  if (roles.includes('admin')) return 'text-red-400';
  return ROLE_ICON_COLOR[roles[0]] ?? 'text-green-400';
}

export default function UsuariosPage() {
  const { users, loading } = useUsers();
  const { user: currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const allowed = !authLoading && currentUser && userIsAdmin(currentUser);

  useEffect(() => { if (!authLoading && !allowed) navigate('/vendas'); }, [authLoading, allowed]);

  const [deleteClicks, setDeleteClicks] = useState<Record<string, number>>({});
  const deleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [showForm, setShowForm] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoUsername, setNovoUsername] = useState('');
  const [novoRoles, setNovoRoles] = useState<UserRole[]>(['vendedor1']);
  const [formLoading, setFormLoading] = useState(false);
  const [formErro, setFormErro] = useState('');
  const [modalUser, setModalUser] = useState<UserType | null>(null);
  const [modalRoles, setModalRoles] = useState<UserRole[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [rolesSalvas, setRolesSalvas] = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);
  const [suspendMotivo, setSuspendMotivo] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [showResetPw, setShowResetPw] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameErro, setNameErro] = useState('');

  const isDev = currentUser?.role === 'desenvolvedor';
  const isSuperAdmin = isDev || currentUser?.role === 'superadmin';
  const selectableRoles: UserRole[] = isSuperAdmin
    ? [...ADMIN_ROLES, ...SUPERADMIN_ONLY_ROLES]
    : ADMIN_ROLES;

  useEffect(() => {}, [currentUser]);

  if (!allowed) return null;

  const openModal = (u: UserType) => {
    setModalUser(u);
    setModalRoles(getUserRoles(u));
    setShowSuspend(false); setSuspendMotivo('');
    setShowResetPw(false); setNewPassword(''); setPwMsg('');
    setEditingName(false); setEditName('');
  };

  const toggleModalRole = (role: UserRole) => {
    setModalRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const saveModalRoles = async () => {
    if (!modalUser || modalRoles.length === 0) return;
    setSavingRoles(true);
    try {
      await updateUserRoles(modalUser.id, modalRoles);
      setModalUser(prev => prev ? { ...prev, roles: modalRoles, role: modalRoles[0] } : null);
      setRolesSalvas(true);
      setTimeout(() => setRolesSalvas(false), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar roles');
    } finally { setSavingRoles(false); }
  };

  const handleDelete = useCallback((id: string) => {
    const clicks = (deleteClicks[id] || 0) + 1;
    clearTimeout(deleteTimers.current[id]);
    if (clicks >= 3) {
      setDeleteClicks(prev => { const n = { ...prev }; delete n[id]; return n; });
      deleteUser(id)
        .then(() => { setModalUser(null); })
        .catch(err => alert(err.message));
    } else {
      setDeleteClicks(prev => ({ ...prev, [id]: clicks }));
      deleteTimers.current[id] = setTimeout(() => {
        setDeleteClicks(prev => { const n = { ...prev }; delete n[id]; return n; });
      }, 3000);
    }
  }, [deleteClicks]);

  const toggleNovoRole = (role: UserRole) => {
    setNovoRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const handleRegister = async () => {
    if (!novoNome.trim() || !novoUsername.trim()) { setFormErro('Preencha todos os campos'); return; }
    if (novoRoles.length === 0) { setFormErro('Selecione ao menos uma role'); return; }
    if (users.some(u => u.username?.toLowerCase() === novoUsername.trim().toLowerCase())) { setFormErro('Já existe um usuário com esse username'); return; }
    if (users.some(u => u.nome?.trim().toLowerCase() === novoNome.trim().toLowerCase())) { setFormErro('Já existe um usuário com esse nome'); return; }
    setFormErro(''); setFormLoading(true);
    try {
      // role principal para o register (compatibilidade)
      const primaryRole = novoRoles[0];
      const senha = novoUsername.trim() + '123';
      await register(novoUsername, senha, novoNome, primaryRole);
      if (novoRoles.length > 1) {
        // Aguardar realtime atualizar e pegar o novo user
        const { getUsers } = await import('~/services/users.service');
        const updated = await getUsers();
        const newUser = updated.find(u => u.username === novoUsername);
        if (newUser) await updateUserRoles(newUser.id, novoRoles);
      }
      setShowForm(false);
      setNovoNome(''); setNovoUsername(''); setNovoRoles(['vendedor1']);
    } catch (err: any) {
      setFormErro(err.code === 'auth/email-already-in-use' ? 'Usuário já existe. Altere o nome de usuário.' : 'Erro ao criar usuário');
    } finally { setFormLoading(false); }
  };

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'superadmin' && currentUser?.role !== 'desenvolvedor') {
    return null;
  }

  const isSuperAdminUser = (u: UserType) => getUserRoles(u).includes('superadmin') || getUserRoles(u).includes('desenvolvedor');

  const getHierarchy = (u: UserType) => {
    const r = getUserRoles(u);
    if (r.includes('desenvolvedor')) return 3;
    if (r.includes('superadmin')) return 2;
    if (r.includes('admin')) return 1;
    return 0;
  };
  const myHierarchy = currentUser ? getHierarchy(currentUser as UserType) : 0;
  const canManageUser = (u: UserType) => myHierarchy > getHierarchy(u);

  const handleSuspend = async () => {
    if (!modalUser) return;
    setStatusLoading(true);
    try { await updateUserStatus(modalUser.id, 'suspenso', suspendMotivo.trim() || undefined); setShowSuspend(false); }
    catch (e: any) { alert(e.message); }
    finally { setStatusLoading(false); }
  };

  const handleToggleStatus = async (status: 'ativo' | 'inativo') => {
    if (!modalUser) return;
    setStatusLoading(true);
    try { await updateUserStatus(modalUser.id, status); }
    catch (e: any) { alert(e.message); }
    finally { setStatusLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!modalUser || !newPassword.trim()) return;
    if (newPassword.length < 6) { setPwMsg('Mínimo 6 caracteres'); return; }
    setPwLoading(true); setPwMsg('');
    try { await resetUserPassword(modalUser.id, newPassword); setPwMsg('Senha alterada!'); setNewPassword(''); setTimeout(() => setPwMsg(''), 2000); }
    catch (e: any) { setPwMsg(e.message); }
    finally { setPwLoading(false); }
  };

  const rolePriority: Record<string, number> = {
    superadmin: 0, admin: 1, desenvolvedor: 2, financeiro: 3,
    vendedor3: 4, vendedor2: 5, vendedor1: 6, vendedor: 7,
  };
  const sortedUsers = [...users].sort((a, b) => {
    const ra = Math.min(...getUserRoles(a).map(r => rolePriority[r] ?? 99));
    const rb = Math.min(...getUserRoles(b).map(r => rolePriority[r] ?? 99));
    return ra - rb;
  });

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <button onClick={() => setShowForm(!showForm)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-95">
          <Plus size={18} /> Novo Usuário
        </button>
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-blue-500/30 bg-surface p-4 max-w-lg mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-400">Novo usuário</span>
            <button onClick={() => { setShowForm(false); setFormErro(''); }} className="text-content-muted hover:text-content"><X size={18} /></button>
          </div>
          <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} className={input} placeholder="Nome completo" />
          <input value={novoUsername} onChange={(e) => setNovoUsername(e.target.value)} className={input} placeholder="Usuário" />
          <p className="text-[10px] text-content-muted">Senha padrão: <span className="font-mono text-content-secondary">{novoUsername.trim() ? novoUsername.trim() + '123' : 'usuário123'}</span></p>
          <div>
            <p className="text-xs text-content-muted mb-2">Roles (pode selecionar múltiplas)</p>
            <div className="flex flex-wrap gap-2">
              {selectableRoles.map(r => (
                <button key={r} type="button" onClick={() => toggleNovoRole(r)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    novoRoles.includes(r)
                      ? ROLE_COLORS[r] + ' ring-1 ring-current'
                      : 'bg-elevated text-content-muted hover:text-content'
                  }`}>
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
          {formErro && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{formErro}</div>}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setShowForm(false); setFormErro(''); }}
              className="rounded-lg border border-border-subtle bg-elevated py-2.5 text-sm font-medium text-content-secondary transition hover:bg-border-medium">Cancelar</button>
            <button onClick={handleRegister} disabled={formLoading}
              className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:from-green-500 hover:to-emerald-400 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">
              {formLoading ? 'Criando...' : 'Criar Usuário'}
            </button>
          </div>
        </div>
      )}

      {loading ? <p>Carregando...</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedUsers.map(u => (
            <button key={u.id} onClick={() => openModal(u)}
              className="rounded-xl border border-border-subtle bg-surface p-4 text-left hover:border-border-medium transition-colors">
              <div className="flex items-center gap-2.5 mb-3">
                {isSuperAdminUser(u) ? <Shield size={20} className="text-purple-300" /> :
                 getUserRoles(u).includes('admin') ? <Shield size={20} className="text-red-400" /> :
                 <User size={20} className={primaryIconColor(u)} />}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold truncate">{u.nome}</h3>
                  <p className="text-xs text-content-muted truncate">@{u.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RoleTags user={u} />
                {u.status === 'suspenso' && <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-medium">Suspenso</span>}
                {u.status === 'inativo' && <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-medium">Inativo</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal gerenciamento */}
      {modalUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setModalUser(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-2xl border border-border-subtle bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
              <div className="flex items-center gap-2.5">
                {isSuperAdminUser(modalUser) ? <Shield size={20} className="text-purple-300" /> :
                 getUserRoles(modalUser).includes('admin') ? <Shield size={20} className="text-red-400" /> :
                 <User size={20} className={primaryIconColor(modalUser)} />}
                <div>
                  {editingName ? (
                    <form className="flex flex-col gap-1" onKeyDown={(e) => { if (e.key === 'Escape') { setEditingName(false); setNameErro(''); } }} onSubmit={async (e) => {
                      e.preventDefault();
                      if (!editName.trim() || nameLoading) return;
                      const dup = users.some(u => u.id !== modalUser.id && u.nome?.trim().toLowerCase() === editName.trim().toLowerCase());
                      if (dup) { setNameErro('Já existe um usuário com esse nome'); return; }
                      setNameErro('');
                      setNameLoading(true);
                      try {
                        await updateProfile(modalUser.id, { nome: editName.trim() });
                        setModalUser(prev => prev ? { ...prev, nome: editName.trim() } : null);
                        setEditingName(false);
                      } catch {} finally { setNameLoading(false); }
                    }}>
                      <div className="flex items-center gap-1">
                      <input autoFocus value={editName} onChange={e => { setEditName(e.target.value); setNameErro(''); }}
                        className="bg-elevated border border-border-subtle rounded px-1.5 py-0.5 text-sm text-content focus:outline-none focus:border-green-600/50 w-36" />
                      <button type="submit" disabled={nameLoading} className="text-green-400 hover:text-green-300"><Check size={14} /></button>
                      <button type="button" onClick={() => { setEditingName(false); setNameErro(''); }} className="text-content-muted hover:text-content"><X size={14} /></button>
                      </div>
                      {nameErro && <p className="text-[10px] text-red-400">{nameErro}</p>}
                    </form>
                  ) : (
                    <p className="text-sm font-semibold flex items-center gap-1">
                      {modalUser.nome}
                      {isDev && <button onClick={() => { setEditingName(true); setEditName(modalUser.nome); }} className="text-content-muted/40 hover:text-content-secondary"><Pencil size={12} /></button>}
                    </p>
                  )}
                  <p className="text-xs text-content-muted">@{modalUser.username}</p>
                </div>
              </div>
              <button onClick={() => setModalUser(null)} className="text-content-muted hover:text-content"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Status badge */}
              {modalUser.status && modalUser.status !== 'ativo' && (
                <div className={`rounded-lg px-3 py-2 text-center text-xs font-medium ${
                  modalUser.status === 'suspenso' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
                }`}>
                  {modalUser.status === 'suspenso' ? 'Usuário suspenso' : 'Usuário inativo'}
                  {modalUser.suspensaoMotivo && <p className="text-[10px] mt-0.5 opacity-70">{modalUser.suspensaoMotivo}</p>}
                </div>
              )}

              {!canManageUser(modalUser) ? (
                <p className="text-xs text-purple-400 text-center py-2">Sem permissão para gerenciar este usuário</p>
              ) : (
                <>
                  {/* Roles */}
                  <div>
                    <p className="text-xs text-content-muted mb-2">Roles (múltipla seleção)</p>
                    <div className="flex flex-wrap gap-2">
                      {selectableRoles.map(r => (
                        <button key={r} onClick={() => toggleModalRole(r)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            modalRoles.includes(r)
                              ? ROLE_COLORS[r] + ' ring-1 ring-current'
                              : 'bg-elevated text-content-muted hover:text-content'
                          }`}>
                          {ROLE_LABELS[r]}
                        </button>
                      ))}
                    </div>
                    {modalRoles.length === 0 && <p className="text-xs text-red-400 mt-1">Selecione ao menos uma role</p>}
                  </div>

                  <button onClick={saveModalRoles} disabled={savingRoles || modalRoles.length === 0}
                    className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 transition-colors">
                    {savingRoles ? 'Salvando...' : rolesSalvas ? '✓ Salvo!' : 'Salvar roles'}
                  </button>
                  {rolesSalvas && <p className="text-xs text-green-400 text-center">Roles atualizadas com sucesso</p>}

                  {/* Status actions */}
                  <div className="border-t border-border-subtle pt-3 space-y-2">
                    {modalUser.status === 'suspenso' && (
                      <button onClick={() => handleToggleStatus('ativo')} disabled={statusLoading}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-40">
                        <ShieldOff size={14} /> {statusLoading ? 'Aguarde...' : 'Reativar usuário'}
                      </button>
                    )}
                    {modalUser.status === 'inativo' && (
                      <button onClick={() => handleToggleStatus('ativo')} disabled={statusLoading}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-40">
                        <ShieldOff size={14} /> {statusLoading ? 'Aguarde...' : 'Ativar usuário'}
                      </button>
                    )}
                    {(!modalUser.status || modalUser.status === 'ativo') && (
                      <>
                        <button onClick={() => handleToggleStatus('inativo')} disabled={statusLoading}
                          className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors disabled:opacity-40">
                          <ShieldOff size={14} /> {statusLoading ? 'Aguarde...' : 'Inativar usuário'}
                        </button>
                        {!showSuspend ? (
                          <button onClick={() => setShowSuspend(true)}
                            className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                            <ShieldAlert size={14} /> Suspender usuário
                          </button>
                        ) : (
                          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-2">
                            <input value={suspendMotivo} onChange={e => setSuspendMotivo(e.target.value)}
                              className={`${input} text-xs`} placeholder="Motivo da suspensão (opcional)" />
                            <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => setShowSuspend(false)} className="rounded-lg border border-border-subtle bg-elevated py-1.5 text-xs text-content-secondary">Cancelar</button>
                              <button onClick={handleSuspend} disabled={statusLoading}
                                className="rounded-lg bg-red-600 py-1.5 text-xs font-medium text-white disabled:opacity-40">
                                {statusLoading ? 'Aguarde...' : 'Confirmar'}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Reset password - só dev */}
                  {isDev && (
                    <div className="border-t border-border-subtle pt-3">
                      {!showResetPw ? (
                        <button onClick={() => setShowResetPw(true)}
                          className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                          <KeyRound size={14} /> Alterar senha
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                            className={`${input} text-xs`} placeholder="Nova senha (mín. 6 caracteres)" />
                          {pwMsg && <p className={`text-[10px] ${pwMsg.includes('alterada') ? 'text-green-400' : 'text-red-400'}`}>{pwMsg}</p>}
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => { setShowResetPw(false); setNewPassword(''); setPwMsg(''); }} className="rounded-lg border border-border-subtle bg-elevated py-1.5 text-xs text-content-secondary">Cancelar</button>
                            <button onClick={handleResetPassword} disabled={pwLoading}
                              className="rounded-lg bg-blue-600 py-1.5 text-xs font-medium text-white disabled:opacity-40">
                              {pwLoading ? 'Aguarde...' : 'Salvar senha'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Delete */}
                  <button onClick={() => handleDelete(modalUser.id)}
                    className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${
                      (deleteClicks[modalUser.id] || 0) === 0 ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                      : (deleteClicks[modalUser.id] || 0) === 1 ? 'bg-red-500/20 text-red-400' : 'bg-red-600/30 text-red-300'
                    }`}>
                    <Trash2 size={14} />
                    {(deleteClicks[modalUser.id] || 0) === 0 ? 'Remover usuário' : (deleteClicks[modalUser.id] || 0) === 1 ? 'Tem certeza?' : 'Confirmar!'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
