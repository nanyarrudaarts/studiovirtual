import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isSignUp) {
        // Validation for Sign Up
        if (!nome.trim()) {
          throw new Error('O nome completo é obrigatório.');
        }
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
        if (password.length < 6) {
          throw new Error('A senha deve conter pelo menos 6 caracteres.');
        }

        // 1. Register user in Supabase Auth
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        const user = data.user;
        if (user) {
          // 2. Initialize artist profile in database
          const { error: dbError } = await supabase.from('artista').insert({
            user_id: user.id,
            nome: nome.trim(),
            email: email.trim(),
            nomeartistico: nome.trim(),
            onboarding_completed: false,
          });

          if (dbError) {
            console.error('Erro ao inicializar perfil:', dbError);
            throw new Error('Conta criada, mas erro ao inicializar perfil: ' + dbError.message);
          }
        }

        // 3. Handle email confirmation if enabled, or direct sign in
        if (data.user && !data.session) {
          setSuccess('Cadastro realizado! Por favor, verifique seu e-mail para confirmar a conta.');
          // Clear inputs
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setNome('');
          setIsSignUp(false); // Switch to login screen
        }
      } else {
        // Sign In
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
      }
    } catch (err: unknown) {
      console.error(err);
      setError((err as Error)?.message || 'Ocorreu um erro no processo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="bg-white w-full max-w-[400px] rounded-[14px] p-8 shadow-float border border-gray-100">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-serif italic text-text-main mb-1">
            studio virtual
          </h1>
          <p className="text-sm font-medium text-text-muted tracking-wide">
            Nany Arruda · Artist Management
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-gray-100 mb-6">
          <button
            type="button"
            className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all ${
              !isSignUp ? 'border-accent text-text-main' : 'border-transparent text-text-muted hover:text-text-main'
            }`}
            onClick={() => {
              setIsSignUp(false);
              setError('');
              setSuccess('');
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all ${
              isSignUp ? 'border-accent text-text-main' : 'border-transparent text-text-muted hover:text-text-main'
            }`}
            onClick={() => {
              setIsSignUp(true);
              setError('');
              setSuccess('');
            }}
          >
            Cadastrar
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 text-sm p-3 rounded-lg mb-6 border border-rose-100">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 text-emerald-600 text-sm p-3 rounded-lg mb-6 border border-emerald-100">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-bold text-text-muted mb-1.5" htmlFor="nome">
                Nome Completo
              </label>
              <input
                id="nome"
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none bg-surface transition-all"
                placeholder="Seu nome"
              />
            </div>
          )}

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

          {isSignUp && (
            <div>
              <label className="block text-sm font-bold text-text-muted mb-1.5" htmlFor="confirmPassword">
                Confirmar Senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none bg-surface transition-all"
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white font-bold rounded-lg py-3 flex items-center justify-center hover:bg-accent/90 transition-colors disabled:opacity-70 mt-2"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : isSignUp ? (
              'Criar Conta'
            ) : (
              'Entrar'
            )}
          </button>

          {!isSignUp && (
            <div className="text-center pt-2">
              <a href="#" className="text-sm font-medium text-accent hover:underline">
                Esqueci minha senha
              </a>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
