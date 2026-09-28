import { useEffect, useState, useRef } from 'react';
import { Bell, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { fetchNotifications, deleteNotification, deleteReadNotifications } from '@/lib/api';
import type { Notification } from '@/types';

export function NotificationBell() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const role = profile?.role;
  const targetRole: 'gerente' | 'admin' = role === 'admin' ? 'admin' : 'gerente';

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const notifs = await fetchNotifications(targetRole);
      setNotifications(notifs);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    if (role !== 'gerente' && role !== 'admin') return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [role]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (role !== 'gerente' && role !== 'admin') return null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch { /* ignore */ }
  };

  const handleClearRead = async () => {
    try {
      await deleteReadNotifications(targetRole);
      setNotifications((prev) => prev.filter((n) => !n.is_read));
    } catch { /* ignore */ }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) loadNotifications(); }}
        className="relative p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        title="Notificaciones"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Notificaciones</h3>
            {notifications.some((n) => n.is_read) && (
              <button
                onClick={handleClearRead}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors whitespace-nowrap"
                title="Borrar leídas"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Limpiar leídas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Sin notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors ${notif.is_read ? 'opacity-60' : ''}`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notif.is_read ? 'bg-gray-300' : 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 leading-snug break-words">{notif.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {notif.profiles?.full_name || notif.profiles?.email || 'Usuario'} · {formatTime(notif.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(notif.id)}
                      className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
