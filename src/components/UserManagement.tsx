import { useEffect, useState } from 'react';
import { UserPlus, Shield, CheckCircle2, XCircle, Loader2, ChevronDown, X, Mail, Lock, Trash2, KeyRound } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { fetchProfiles, updateProfileRole, updateProfileActive, fetchAllUserAreas, addUserArea, removeUserArea, fetchAreas, adminCreateUser, adminUpdatePassword, adminDeleteUser } from '@/lib/api';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Profile, Area, UserArea, UserRole } from '@/types';

export function UserManagement() {
  const { profile, session } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [userAreas, setUserAreas] = useState<UserArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPassword, setEditingPassword] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('operador');
  const [newAreaIds, setNewAreaIds] = useState<string[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editPasswordValue, setEditPasswordValue] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [p, a, ua] = await Promise.all([fetchProfiles(), fetchAreas(), fetchAllUserAreas()]);
      setUsers(p); setAreas(a); setUserAreas(ua);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setBusy(true);
    try { await updateProfileRole(userId, role); setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u))); } catch { /* ignore */ }
    setBusy(false);
  };

  const handleToggleActive = async (userId: string, active: boolean) => {
    setBusy(true);
    try { await updateProfileActive(userId, !active); setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, active: !active } : u))); } catch { /* ignore */ }
    setBusy(false);
  };

  const handleToggleArea = async (userId: string, areaId: string) => {
    setBusy(true);
    try {
      const exists = userAreas.some((ua) => ua.user_id === userId && ua.area_id === areaId);
      if (exists) { await removeUserArea(userId, areaId); setUserAreas((prev) => prev.filter((ua) => !(ua.user_id === userId && ua.area_id === areaId))); }
      else { await addUserArea(userId, areaId); setUserAreas((prev) => [...prev, { id: crypto.randomUUID(), user_id: userId, area_id: areaId }]); }
    } catch { /* ignore */ }
    setBusy(false);
  };

  const handleToggleNewArea = (areaId: string) => setNewAreaIds((prev) => prev.includes(areaId) ? prev.filter((id) => id !== areaId) : [...prev, areaId]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null); setCreateSuccess(null); setCreating(true);
    try {
      if (!session) throw new Error('No hay sesión');
      await adminCreateUser({ email: newEmail, password: newPassword, full_name: newName, role: newRole, area_ids: newRole === 'operador' ? newAreaIds : [] }, session.access_token);
      setCreateSuccess('Usuario creado correctamente.');
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('operador'); setNewAreaIds([]);
      await loadData();
    } catch (err) { setCreateError(err instanceof Error ? err.message : 'Error al crear el usuario'); }
    setCreating(false);
  };

  const handleUpdatePassword = async (userId: string) => {
    setPasswordError(null); setPasswordSuccess(null);
    if (editPasswordValue.length < 4) { setPasswordError('Mínimo 4 caracteres.'); return; }
    setSavingPassword(true);
    try {
      if (!session) throw new Error('No hay sesión');
      await adminUpdatePassword(userId, editPasswordValue, session.access_token);
      setPasswordSuccess('Contraseña actualizada.');
      setEditPasswordValue('');
      setTimeout(() => { setEditingPassword(null); setPasswordSuccess(null); }, 2000);
    } catch (err) { setPasswordError(err instanceof Error ? err.message : 'Error'); }
    setSavingPassword(false);
  };

  const handleDeleteUser = async (userId: string) => {
    setDeleteError(null);
    setBusy(true);
    try {
      if (!session) throw new Error('No hay sesión');
      await adminDeleteUser(userId, session.access_token);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeleteConfirm(null);
    } catch (err) { setDeleteError(err instanceof Error ? err.message : 'Error'); }
    setBusy(false);
  };

  if (loading) {
    return (<div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>);
  }

  const roleBadge = (role: UserRole) => {
    const styles = { admin: 'bg-red-50 text-red-700 border-red-200', gerente: 'bg-blue-50 text-blue-700 border-blue-200', operador: 'bg-slate-50 text-slate-600 border-slate-200' };
    const labels = { admin: 'Admin', gerente: 'Gerente', operador: 'Operador' };
    return <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${styles[role]}`}>{labels[role]}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center"><Shield className="w-6 h-6 text-white" /></div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Usuarios</h2>
              <p className="text-sm text-gray-500">Crea usuarios, asigna roles, edita contraseñas y elimina cuentas.</p>
            </div>
          </div>
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
            <UserPlus className="w-4 h-4" /> Crear usuario
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-50 rounded-xl p-4"><p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Total</p><p className="text-2xl font-bold text-gray-900 mt-1">{users.length}</p></div>
          <div className="bg-blue-50 rounded-xl p-4"><p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">Gerentes</p><p className="text-2xl font-bold text-blue-700 mt-1">{users.filter((u) => u.role === 'gerente').length}</p></div>
          <div className="bg-emerald-50 rounded-xl p-4"><p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">Operadores</p><p className="text-2xl font-bold text-emerald-700 mt-1">{users.filter((u) => u.role === 'operador').length}</p></div>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-2xl border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-900">Crear nuevo usuario</h3>
            <button onClick={() => setShowCreateForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nombre completo</label>
                <div className="relative"><UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Juan Pérez" /></div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
                <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="usuario@ruizautomotores.com" /></div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Contraseña (mín. 4 caracteres)</label>
                <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={4} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="••••" /></div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Rol</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="operador">Operador</option><option value="gerente">Gerente</option><option value="admin">Admin</option>
                </select>
              </div>
            </div>
            {newRole === 'operador' && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Áreas asignadas</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {areas.map((area) => {
                    const has = newAreaIds.includes(area.id);
                    return <button key={area.id} type="button" onClick={() => handleToggleNewArea(area.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${has ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500 hover:border-blue-300'}`}><span className="truncate">{area.name}</span>{has && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}</button>;
                  })}
                </div>
              </div>
            )}
            {createError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{createError}</div>}
            {createSuccess && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">{createSuccess}</div>}
            <button type="submit" disabled={creating} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2">{creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Crear usuario</button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="text-base font-bold text-gray-900">Usuarios registrados</h3></div>
        {deleteError && <div className="m-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{deleteError}</div>}
        <div className="divide-y divide-gray-100">
          {users.map((user) => {
            const isExpanded = expandedUser === user.id;
            const userAreaIds = userAreas.filter((ua) => ua.user_id === user.id).map((ua) => ua.area_id);
            const isSelf = user.id === profile?.id;
            const isEditingPassword = editingPassword === user.id;
            const isDeleting = deleteConfirm === user.id;

            return (
              <div key={user.id}>
                <div className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0">{(user.full_name || user.email)[0].toUpperCase()}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name || 'Sin nombre'}{isSelf && <span className="text-xs text-gray-400 ml-2">(tú)</span>}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {roleBadge(user.role)}
                    <span className={`w-2 h-2 rounded-full ${user.active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    {user.role === 'operador' && <button onClick={() => setExpandedUser(isExpanded ? null : user.id)} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">Permisos<ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></button>}
                    <select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)} disabled={busy || isSelf} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"><option value="admin">Admin</option><option value="gerente">Gerente</option><option value="operador">Operador</option></select>
                    {!isSelf && <button onClick={() => setEditingPassword(isEditingPassword ? null : user.id)} className={`p-1.5 rounded-lg transition-colors ${isEditingPassword ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`} title="Cambiar contraseña"><KeyRound className="w-4 h-4" /></button>}
                    {!isSelf && <button onClick={() => handleToggleActive(user.id, user.active)} disabled={busy} className={`p-1.5 rounded-lg transition-colors ${user.active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`} title={user.active ? 'Desactivar' : 'Activar'}>{user.active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}</button>}
                    {!isSelf && <button onClick={() => setDeleteConfirm(isDeleting ? null : user.id)} disabled={busy} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>

                {isEditingPassword && (
                  <div className="px-5 pb-5 bg-blue-50 border-t border-gray-100">
                    <div className="flex items-center gap-3 mt-3">
                      <input type="text" value={editPasswordValue} onChange={(e) => setEditPasswordValue(e.target.value)} placeholder="Nueva contraseña (mín. 4)" minLength={4} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      <button onClick={() => handleUpdatePassword(user.id)} disabled={savingPassword} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1">{savingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Guardar</button>
                      <button onClick={() => { setEditingPassword(null); setEditPasswordValue(''); setPasswordError(null); setPasswordSuccess(null); }} className="text-sm text-gray-500 hover:text-gray-700 px-2">Cancelar</button>
                    </div>
                    {passwordError && <p className="text-xs text-red-600 mt-2">{passwordError}</p>}
                    {passwordSuccess && <p className="text-xs text-emerald-600 mt-2">{passwordSuccess}</p>}
                  </div>
                )}

                {isDeleting && (
                  <div className="px-5 pb-5 bg-red-50 border-t border-gray-100">
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-sm text-red-700">¿Eliminar a <strong>{user.full_name || user.email}</strong>? Esta acción no se puede deshacer.</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDeleteUser(user.id)} disabled={busy} className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1">{busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Eliminar</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-sm text-gray-600 hover:text-gray-800 px-2">Cancelar</button>
                      </div>
                    </div>
                  </div>
                )}

                {isExpanded && user.role === 'operador' && (
                  <div className="px-5 pb-5 bg-slate-50 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-600 mb-3 mt-3">Áreas asignadas</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {areas.map((area) => {
                        const has = userAreaIds.includes(area.id);
                        return <button key={area.id} onClick={() => handleToggleArea(user.id, area.id)} disabled={busy} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${has ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500 hover:border-blue-300'}`}><span className="truncate">{area.name}</span>{has && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}</button>;
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
