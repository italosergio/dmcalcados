import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { updateProfile, updatePassword } from '~/services/auth.service';
import { uploadImage } from '~/services/cloudinary.service';
import { Camera, Phone, Plus, Pencil, Check } from 'lucide-react';
import { getUserRoles } from '~/models';
import { RoleBadge } from '~/utils/roles';

const input = "w-full rounded-lg border border-border-subtle bg-elevated px-3 py-2.5 text-sm text-content focus:outline-none focus:border-border-medium focus:ring-1 focus:ring-blue-500/30 transition-colors";


export default function ContaPage() {
  const { user } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [fotoPreview, setFotoPreview] = useState(user?.foto || '');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [contato, setContato] = useState(user?.contato || '');
  const [showContatoInput, setShowContatoInput] = useState(false);
  const [editandoNome, setEditandoNome] = useState(false);
  const [nome, setNome] = useState(user?.nome || '');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleFoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    if (senha && senha !== confirmarSenha) return setMsg('As senhas não coincidem');
    if (senha && !senhaAtual) return setMsg('Informe a senha atual');
    setLoading(true); setMsg('');

    try {
      let fotoUrl = user.foto;
      if (fotoFile) fotoUrl = await uploadImage(fotoFile);

      const profileUpdates: { foto?: string; contato?: string; nome?: string } = {};
      if (fotoUrl !== user.foto) profileUpdates.foto = fotoUrl;
      if (contato !== (user.contato || '')) profileUpdates.contato = contato;
      if (nome.trim() && nome.trim() !== user.nome) profileUpdates.nome = nome.trim();
      if (Object.keys(profileUpdates).length) await updateProfile(user.uid, profileUpdates);

      if (senha) {
        const { reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth');
        const { auth } = await import('~/services/firebase');
        const credential = EmailAuthProvider.credential(auth.currentUser!.email!, senhaAtual);
        await reauthenticateWithCredential(auth.currentUser!, credential);
        await updatePassword(senha);
      }

      setMsg('Dados atualizados com sucesso!');
      setSenhaAtual(''); setSenha(''); setConfirmarSenha(''); setEditandoNome(false);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') setMsg('Senha atual incorreta');
      else if (code === 'auth/weak-password') setMsg('A nova senha deve ter pelo menos 6 caracteres');
      else setMsg(`Erro ao atualizar: ${err?.message || 'tente novamente'}`);
    } finally { setLoading(false); }
  };

  const roles = user ? getUserRoles(user) : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      {/* Foto */}
      <div className="flex justify-center">
        <label className="relative cursor-pointer group">
          {fotoPreview ? (
            <img src={fotoPreview} alt="Perfil" className="h-24 w-24 rounded-full object-cover border-2 border-border-subtle" />
          ) : (
            <div className="h-24 w-24 rounded-full bg-elevated border-2 border-border-subtle flex items-center justify-center text-2xl font-semibold text-content-secondary">
              {user?.nome?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={20} className="text-white" />
          </div>
          <input type="file" accept="image/*" onChange={handleFoto} className="hidden" />
        </label>
      </div>

      {/* Info read-only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-3">
        <div>
          <label className="text-xs text-content-muted mb-1 block">Nome</label>
          {editandoNome ? (
            <div className="flex items-center gap-1.5">
              <input value={nome} onChange={(e) => setNome(e.target.value)} className={input} autoFocus />
              <button type="button" onClick={() => setEditandoNome(false)} className="rounded-md p-1 text-green-400 hover:bg-green-500/10 transition-colors"><Check size={14} /></button>
            </div>
          ) : (
            <p className="text-sm font-medium flex items-center gap-1.5">
              {user?.nome}
              <button type="button" onClick={() => { setNome(user?.nome || ''); setEditandoNome(true); }} className="text-content-muted/30 hover:text-content-muted transition-colors"><Pencil size={12} /></button>
            </p>
          )}
        </div>
        <div>
          <label className="text-xs text-content-muted mb-1 block">Usuário</label>
          <p className="text-sm text-content-muted">{user?.username}</p>
        </div>
      </div>

      {/* Role */}
      <div>
        <label className="text-xs text-content-muted mb-1.5 block">Cargo</label>
        <div className="flex flex-wrap gap-1.5">
          {roles.map(r => <RoleBadge key={r} role={r} />)}
        </div>
      </div>

      {/* Contato */}
      <div>
        <label className="text-xs text-content-muted mb-1 block">Contato</label>
        {user?.contato || showContatoInput ? (
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-content-muted shrink-0" />
            <input
              type="text"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              className={input}
              placeholder="(00) 00000-0000"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowContatoInput(true)}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Plus size={14} />
            Adicionar contato
          </button>
        )}
      </div>

      <hr className="border-border-subtle" />

      {/* Alterar senha */}
      <div>
        <label className="text-xs text-content-muted mb-1 block">Senha atual</label>
        <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} className={input} placeholder="Necessária para alterar a senha" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-content-muted mb-1 block">Nova senha</label>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className={input} placeholder="Deixe vazio para manter" />
        </div>
        <div>
          <label className="text-xs text-content-muted mb-1 block">Confirmar</label>
          <input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} className={input} placeholder="Repita a nova senha" />
        </div>
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${msg.includes('sucesso') ? 'border border-green-500/30 bg-green-500/10 text-green-400' : 'border border-red-500/30 bg-red-500/10 text-red-400'}`}>
          {msg}
        </div>
      )}

      <button type="submit" disabled={loading}
        className="w-full rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:from-green-500 hover:to-emerald-400 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">
        {loading ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </form>
  );
}
