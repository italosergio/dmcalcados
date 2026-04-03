import { useEffect, useState, useRef, useCallback } from 'react';
import { Shield, User, Trash2, Plus, X } from 'lucide-react';
import { getUsers, updateUserRole, deleteUser } from '~/services/users.service';
import { register } from '~/services/auth.service';
import { useAuth } from '~/contexts/AuthContext';
import type { User as UserType } from '~/models';

const input = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";
const select = "rounded-lg border border-border-subtle bg-elevated px-3 py-2 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteClicks, setDeleteClicks] = useState<Record<string, number>>({});
  const deleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [showForm, setShowForm] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoUsername, setNovoUsername] = useState('');
  const [novoSenha, setNovoSenha] = useState('');
  const [novoRole, setNovoRole] = useState<'vendedor' | 'admin'>('vendedor');
  const [formLoading, setFormLoading] = useState(false);
  const [formErro, setFormErro] = useState('');
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'superadmin') return;
    getUsers().then(setUsers).finally(() => setLoading(false));
  }, [currentUser]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'vendedor' | 'superadmin') => {
    try {
      await updateUserRole(userId, newRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao alterar role');
    }
  };

  const handleDelete = useCallback((id: string) => {
    const clicks = (deleteClicks[id] || 0) + 1;
    clearTimeout(deleteTimers.current[id]);
    if (clicks >= 3) {
      setDeleteClicks(prev => { const n = { ...prev }; delete n[id]; return n; });
      deleteUser(id).then(() => setUsers(prev => prev.filter(u => u.id !== id))).catch(err => alert(err.message));
    } else {
      setDeleteClicks(prev => ({ ...prev, [id]: clicks }));
      deleteTimers.current[id] = setTimeout(() => {
        setDeleteClicks(prev => { const n = { ...prev }; delete n[id]; return n; });
      }, 3000);
    }
  }, [deleteClicks]);

  const handleRegister = async () => {
    if (!novoNome.trim() || !novoUsername.trim() || !novoSenha.trim()) {
      setFormErro('Preencha todos os campos');
      return;
    }
    if (novoSenha.length < 6) {
      setFormErro('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    setFormErro(''); setFormLoading(true);
    try {
      await register(novoUsername, novoSenha, novoNome, novoRole);
      const updated = await getUsers();
      setUsers(updated);
      setShowForm(false);
      setNovoNome(''); setNovoUsername(''); setNovoSenha(''); setNovoRole('vendedor');
    } catch (err: any) {
      setFormErro(err.code === 'auth/email-already-in-use' ? 'Usuário já existe e não pode ser recriado. Altere o nome de usuário.' : 'Erro ao criar usuário');
    } finally { setFormLoading(false); }
  };

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'superadmin') {
    return <div className="p-8 text-center text-red-400">Acesso negado</div>;
  }

  return (
    <div>
      <div className="mb-4 sm:mb-6 flex justify-end">
        <button onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-95 w-full sm:w-auto">
          <Plus size={18} /> Novo Usuário
        </button>
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-blue-500/30 bg-surface p-4 max-w-lg mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-400">Novo usuário</span>
            <button onClick={() => { setShowForm(false); setFormErro(''); }} className="text-content-muted hover:text-content transition-colors"><X size={18} /></button>
          </div>
          <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} className={input} placeholder="Nome completo" />
          <div className="grid grid-cols-2 gap-2">
            <input value={novoUsername} onChange={(e) => setNovoUsername(e.target.value)} className={input} placeholder="Usuário" />
            <input type="password" value={novoSenha} onChange={(e) => setNovoSenha(e.target.value)} className={input} placeholder="Senha" />
          </div>
          <select value={novoRole} onChange={(e) => setNovoRole(e.target.value as any)} className={`${input}`}>
            <option value="vendedor">Vendedor</option>
            <option value="admin">Admin</option>
          </select>
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
          {users.map(user => (
            <div key={user.id} className="rounded-xl border border-border-subtle bg-surface p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  {user.role === 'superadmin' ? <Shield size={20} className="text-purple-400" /> :
                   user.role === 'admin' ? <Shield size={20} className="text-red-400" /> :
                   <User size={20} className="text-blue-400" />}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold truncate">{user.nome}</h3>
                    <p className="text-xs text-content-muted truncate">{user.username}</p>
                  </div>
                  {user.role === 'superadmin' && (
                    <span className="text-[10px] bg-purple-900 text-purple-200 px-2 py-0.5 rounded font-bold flex-shrink-0">SUPER</span>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {user.role === 'superadmin' ? (
                  <div className="text-center text-xs text-purple-400 font-medium py-2">Super Admin</div>
                ) : (
                  <>
                    <select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value as any)} className={`${select} w-full`}>
                      <option value="vendedor">Vendedor</option>
                      <option value="admin">Admin</option>
                      {currentUser?.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                    </select>
                    <button onClick={() => handleDelete(user.id)}
                      className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                        (deleteClicks[user.id] || 0) === 0 ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                        : (deleteClicks[user.id] || 0) === 1 ? 'bg-red-500/20 text-red-400' : 'bg-red-600/30 text-red-300'
                      }`}>
                      <Trash2 size={14} />
                      {(deleteClicks[user.id] || 0) === 0 ? 'Remover' : (deleteClicks[user.id] || 0) === 1 ? 'Tem certeza?' : 'Confirmar!'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
