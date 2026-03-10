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
    console.log('Current user:', currentUser);
    if (currentUser?.role !== 'admin') return;
    console.log('Carregando usuários...');
    getUsers()
      .then(data => {
        console.log('Usuários carregados:', data);
        setUsers(data);
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'vendedor') => {
    try {
      await updateUserRole(userId, newRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      alert('Erro ao alterar role');
    }
  };

  if (currentUser?.role !== 'admin') {
    return <div className="p-8 text-center text-red-600">Acesso negado</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Usuários do Sistema</h1>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="grid gap-4">
          {users.map(user => (
            <Card key={user.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user.role === 'admin' ? (
                    <Shield size={24} className="text-red-600" />
                  ) : (
                    <User size={24} className="text-blue-600" />
                  )}
                  <div>
                    <h3 className="font-semibold">{user.nome}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Username: {user.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'vendedor')}
                    className="rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                  >
                    <option value="vendedor">Vendedor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <Button onClick={() => {
                    if (confirm(`Deseja apagar o usuário ${user.nome}?`)) {
                      deleteUser(user.id).then(() => window.location.reload());
                    }
                  }} className="text-xs">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
