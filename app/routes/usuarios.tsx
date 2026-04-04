import { useEffect, useState, useRef, useCallback } from 'react';
import { Shield, User, Trash2, Plus, X, LayoutGrid, List } from 'lucide-react';
import { getUsers, updateUserRoles, deleteUser } from '~/services/users.service';
import { register } from '~/services/auth.service';
import { useAuth } from '~/contexts/AuthContext';
import type { User as UserType, UserRole } from '~/models';
import { getUserRoles } from '~/models';

const input = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";

const ROLE_LABELS: Record<UserRole, string> = {
  vendedor: 'Vendedor',
  vendedor1: 'Vendedor I',
  vendedor2: 'Vendedor II',
  vendedor3: 'Vendedor III',
  admin: 'Admin',
  financeiro: 'Financeiro',
  desenvolvedor: 'Desenvolvedor',
  superadmin: 'Super Admin',
};

const ROLE_COLORS: Record<UserRole, string> = {
  vendedor:     'bg-blue-900/60 text-blue-300',
  vendedor1:    'bg-blue-900/60 text-blue-300',
  vendedor2:    'bg-cyan-900/60 text-cyan-300',
  vendedor3:    'bg-indigo-900/60 text-indigo-300',
  admin:        'bg-red-900/60 text-red-300',
  financeiro:   'bg-yellow-900/60 text-yellow-300',
  desenvolvedor:'bg-purple-900/60 text-purple-300',
  superadmin:   'bg-purple-900/80 text-purple-200',
};

const ROLE_ICON_COLOR: Record<UserRole, string> = {
  vendedor:     'text-blue-400',
  vendedor1:    'text-blue-400',
  vendedor2:    'text-cyan-400',
  vendedor3:    'text-indigo-400',
  admin:        'text-red-400',
  financeiro:   'text-yellow-400',
  desenvolvedor:'text-purple-400',
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
      {roles.map(r => (
        <span key={r} className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${ROLE_COLORS[r] ?? 'bg-blue-900/60 text-blue-300'}`}>
          {ROLE_LABELS[r] ?? r}
        </span>
      ))}
    </div>
  );
}

function primaryIconColor(user: UserType): string {
  const roles = getUserRoles(user);
  if (roles.includes('superadmin')) return 'text-purple-300';
  if (roles.includes('admin')) return 'text-red-400';
  return ROLE_ICON_COLOR[roles[0]] ?? 'text-blue-400';
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteClicks, setDeleteClicks] = useState<Record<string, number>>({});
  const deleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [showForm, setShowForm] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoUsername, setNovoUsername] = useState('');
  const [novoSenha, setNovoSenha] = useState('');
  const [novoRoles, setNovoRoles] = useState<UserRole[]>(['vendedor1']);
  const [formLoading, setFormLoading] = useState(false);
  const [formErro, setFormErro] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [modalUser, setModalUser] = useState<UserType | null>(null);
  const [modalRoles, setModalRoles] = useState<UserRole[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const { user: currentUser } = useAuth();

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const selectableRoles: UserRole[] = isSuperAdmin
    ? [...ADMIN_ROLES, ...SUPERADMIN_ONLY_ROLES]
    : ADMIN_ROLES;

  useEffect(() => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'superadmin') return;
    getUsers().then(setUsers).finally(() => setLoading(false));
  }, [currentUser]);

  const openModal = (u: UserType) => {
    setModalUser(u);
    setModalRoles(getUserRoles(u));
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
      setUsers(prev => prev.map(u => u.id === modalUser.id ? { ...u, roles: modalRoles, role: modalRoles[0] } : u));
      setModalUser(prev => prev ? { ...prev, roles: modalRoles, role: modalRoles[0] } : null);
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
        .then(() => { setUsers(prev => prev.filter(u => u.id !== id)); setModalUser(null); })
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
    if (!novoNome.trim() || !novoUsername.trim() || !novoSenha.trim()) { setFormErro('Preencha todos os campos'); return; }
    if (novoSenha.length < 6) { setFormErro('Senha deve ter pelo menos 6 caracteres'); return; }
    if (novoRoles.length === 0) { setFormErro('Selecione ao menos uma role'); return; }
    setFormErro(''); setFormLoading(true);
    try {
      // role principal para o register (compatibilidade)
      const primaryRole = novoRoles[0];
      await register(novoUsername, novoSenha, novoNome, primaryRole);
      // se tiver múltiplas roles, salvar o array
      if (novoRoles.length > 1) {
        const updated = await getUsers();
        const newUser = updated.find(u => u.username === novoUsername);
        if (newUser) await updateUserRoles(newUser.id, novoRoles);
      }
      const updated = await getUsers();
      setUsers(updated);
      setShowForm(false);
      setNovoNome(''); setNovoUsername(''); setNovoSenha(''); setNovoRoles(['vendedor1']);
    } catch (err: any) {
      setFormErro(err.code === 'auth/email-already-in-use' ? 'Usuário já existe. Altere o nome de usuário.' : 'Erro ao criar usuário');
    } finally { setFormLoading(false); }
  };

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'superadmin') {
    return <div className="p-8 text-center text-red-400">Acesso negado</div>;
  }

  const isSuperAdminUser = (u: UserType) => getUserRoles(u).includes('superadmin');

  return (
    <div>
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
        <div className="flex rounded-lg border border-border-subtle overflow-hidden">
          <button onClick={() => setViewMode('cards')} className={`p-2 transition-colors ${viewMode === 'cards' ? 'bg-elevated text-content' : 'text-content-muted hover:text-content'}`}><LayoutGrid size={16} /></button>
          <button onClick={() => setViewMode('table')} className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-elevated text-content' : 'text-content-muted hover:text-content'}`}><List size={16} /></button>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-95">
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
          <div className="grid grid-cols-2 gap-2">
            <input value={novoUsername} onChange={(e) => setNovoUsername(e.target.value)} className={input} placeholder="Usuário" />
            <input type="password" value={novoSenha} onChange={(e) => setNovoSenha(e.target.value)} className={input} placeholder="Senha" />
          </div>
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

      {loading ? <p>Carregando...</p> : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map(u => (
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
              <RoleTags user={u} />
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border-subtle overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface">
                <th className="px-4 py-2.5 text-left text-xs text-content-muted font-medium">Nome</th>
                <th className="px-4 py-2.5 text-left text-xs text-content-muted font-medium hidden sm:table-cell">Usuário</th>
                <th className="px-4 py-2.5 text-left text-xs text-content-muted font-medium">Roles</th>
                <th className="px-4 py-2.5 text-right text-xs text-content-muted font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-border-subtle last:border-0 hover:bg-surface/50 cursor-pointer" onClick={() => openModal(u)}>
                  <td className="px-4 py-2.5 font-medium">{u.nome}</td>
                  <td className="px-4 py-2.5 text-content-muted hidden sm:table-cell">@{u.username}</td>
                  <td className="px-4 py-2.5"><RoleTags user={u} /></td>
                  <td className="px-4 py-2.5 text-right text-xs text-blue-400 hover:text-blue-300">Gerenciar</td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  <p className="text-sm font-semibold">{modalUser.nome}</p>
                  <p className="text-xs text-content-muted">@{modalUser.username}</p>
                </div>
              </div>
              <button onClick={() => setModalUser(null)} className="text-content-muted hover:text-content"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              {isSuperAdminUser(modalUser) ? (
                <p className="text-xs text-purple-400 text-center py-2">Super Admin — roles não podem ser alteradas</p>
              ) : (
                <>
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
                    {modalRoles.length === 0 && (
                      <p className="text-xs text-red-400 mt-1">Selecione ao menos uma role</p>
                    )}
                  </div>

                  <button
                    onClick={saveModalRoles}
                    disabled={savingRoles || modalRoles.length === 0}
                    className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 transition-colors">
                    {savingRoles ? 'Salvando...' : 'Salvar roles'}
                  </button>

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
