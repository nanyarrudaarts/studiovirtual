import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (err: unknown) {
      setError((err as Error).message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="bg-white w-full max-w-[400px] rounded-[14px] p-8 shadow-float border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif italic text-text-main mb-1">
            studio virtual
          </h1>
          <p className="text-sm font-medium text-text-muted tracking-wide">
            Nany Arruda · Artist Management
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 text-sm p-3 rounded-lg mb-6 border border-rose-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-text-muted mb-1.5" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none bg-surface transition-all"
              placeholder="contato@nanyarruda.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-text-muted mb-1.5" htmlFor="password">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg pl-4 pr-10 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none bg-surface transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-text-main transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white font-bold rounded-lg py-3 flex items-center justify-center hover:bg-accent/90 transition-colors disabled:opacity-70"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Entrar'}
          </button>

          <div className="text-center pt-2">
            <a href="#" className="text-sm font-medium text-accent hover:underline">
              Esqueci minha senha
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
