import { useEffect, useState } from 'react';
import { Shield, User, Trash2 } from 'lucide-react';
import { Card } from '~/components/common/Card';
import { Button } from '~/components/common/Button';
import { getUsers, updateUserRole, deleteUser } from '~/services/users.service';
import { useAuth } from '~/contexts/AuthContext';
import type { User as UserType } from '~/models';

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'superadmin') return;
    getUsers()
      .then(data => setUsers(data))
      .finally(() => setLoading(false));
  }, [currentUser]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'vendedor' | 'superadmin') => {
    try {
      await updateUserRole(userId, newRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao alterar role');
    }
  };

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'superadmin') {
    return <div className="p-8 text-center text-red-600">Acesso negado</div>;
  }

  return (
    <div>
      <h1 className="mb-4 sm:mb-6 text-xl sm:text-2xl font-bold">Usuários do Sistema</h1>

      {loading ? (
        <p className="text-sm">Carregando...</p>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {users.map(user => (
            <Card key={user.id}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {user.role === 'superadmin' ? (
                    <Shield size={24} className="text-purple-600 flex-shrink-0" />
                  ) : user.role === 'admin' ? (
                    <Shield size={24} className="text-red-600 flex-shrink-0" />
                  ) : (
                    <User size={24} className="text-blue-600 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{user.nome}</h3>
                      {user.role === 'superadmin' && (
                        <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2 py-0.5 rounded font-bold">
                          SUPER ADMIN
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Username: {user.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.role === 'superadmin' ? (
                    <div className="flex-1 sm:flex-none px-3 py-2 text-sm text-purple-600 dark:text-purple-400 font-semibold">
                      Super Admin
                    </div>
                  ) : (
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'vendedor' | 'superadmin')}
                      className="flex-1 sm:flex-none rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="vendedor">Vendedor</option>
                      <option value="admin">Admin</option>
                      {currentUser?.role === 'superadmin' && (
                        <option value="superadmin">Super Admin</option>
                      )}
                    </select>
                  )}
                  {user.role !== 'superadmin' && (
                    <Button onClick={() => {
                      if (confirm(`Deseja apagar o usuário ${user.nome}?`)) {
                        deleteUser(user.id).then(() => window.location.reload()).catch(err => alert(err.message));
                      }
                    }} className="text-xs px-2 py-1">
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
