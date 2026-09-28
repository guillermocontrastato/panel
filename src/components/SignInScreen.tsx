import { useState } from 'react';
import { TrendingUp, Loader2, Lock, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

function ResetPasswordForm({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
    }
    setBusy(false);
  };

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Contraseña actualizada</h2>
        <p className="text-sm text-gray-500 mb-5">Tu contraseña se cambió correctamente. Ya podés iniciar sesión.</p>
        <button onClick={onDone} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Ir a iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-lg font-bold text-gray-900 mb-2 text-center">Nueva contraseña</h2>
      <p className="text-sm text-gray-500 mb-5 text-center">Ingresá tu nueva contraseña (mínimo 4 caracteres).</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nueva contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Repetir contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={4}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••"
            />
          </div>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Guardar nueva contraseña
        </button>
      </form>
    </>
  );
}

export function SignInScreen() {
  const { signIn, isPasswordRecovery, clearPasswordRecovery } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLinkError, setResetLinkError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const { error } = await signIn(email, password);
    if (error) setError(error);
    setBusy(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -ml-20 -mb-20" />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Ruiz Automotores</h1>
          <p className="text-sm text-slate-400 mt-1">Indicadores Gerenciales</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {isPasswordRecovery ? (
            <ResetPasswordForm onDone={() => { clearPasswordRecovery(); }} />
          ) : resetLinkError ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-amber-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">El enlace venció</h2>
              <p className="text-sm text-gray-500 mb-5">Este enlace de recuperación ya no es válido. Solicitá uno nuevo para cambiar tu contraseña.</p>
              <button
                onClick={() => { setResetLinkError(false); setResetMode(true); }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
                Solicitar un nuevo enlace
              </button>
            </div>
          ) : !resetMode ? (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-6 text-center">Iniciar sesión</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="usuario@ruizautomotores.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={4}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Ingresar
                </button>
              </form>

              <button
                onClick={() => { setResetMode(true); setError(null); setResetSent(false); }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium mt-5 transition-colors"
              >
                Olvidé mi contraseña
              </button>
            </>
          ) : (
            <>
              {!resetSent ? (
                <>
                  <button
                    onClick={() => setResetMode(false)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Volver
                  </button>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">Recuperar contraseña</h2>
                  <p className="text-sm text-gray-500 mb-5">
                    Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
                  </p>
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="usuario@ruizautomotores.com"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                      Enviar enlace
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">Revisá tu correo</h2>
                  <p className="text-sm text-gray-500 mb-5">
                    Te enviamos un enlace a <span className="font-semibold text-gray-700">{email}</span> para restablecer tu contraseña.
                  </p>
                  <button
                    onClick={() => { setResetMode(false); setResetSent(false); }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Volver a iniciar sesión
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
