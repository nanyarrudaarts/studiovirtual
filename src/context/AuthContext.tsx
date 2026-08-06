import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

export interface ArtistaPerfil {
  id: number;
  nome: string | null;
  nomeartistico: string | null;
  onboarding_completed: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  artist: ArtistaPerfil | null;
  artistId: number | null;
  onboardingDone: boolean | null;
  loading: boolean;
  refreshArtistPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  artist: null,
  artistId: null,
  onboardingDone: null,
  loading: true,
  refreshArtistPerfil: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [artist, setArtist] = useState<ArtistaPerfil | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Guard counters separados: auth listener e refresh não compartilham o mesmo contador,
  // evitando que um refresh invalide silenciosamente um fetch de auth em andamento.
  const authReqIdRef    = useRef(0); // controla onAuthStateChange
  const refreshReqIdRef = useRef(0); // controla refreshArtistPerfil

  // ─── Helper: Promise.race com timeout + captura de rejeição ─────────────
  // Retorna { ok: true, value } se o fetch completar a tempo e sem erro.
  // Retorna { ok: false } em qualquer um destes casos:
  //   — timeout disparou antes da resolução
  //   — promise original rejeitou (erro de rede, Supabase, etc.)
  // Em nenhum caso lança exceção — o await no caller sempre resolve.
  function withFetchTimeout<T>(
    promise: Promise<T>,
    ms: number
  ): Promise<{ ok: true; value: T } | { ok: false }> {
    const timeout = new Promise<{ ok: false }>((resolve) =>
      setTimeout(() => resolve({ ok: false }), ms)
    );
    return Promise.race([
      promise
        .then((value) => ({ ok: true as const, value }))
        .catch(()   => ({ ok: false as const })), // rejeição vira { ok: false }
      timeout,
    ]);
  }

  const fetchArtistPerfil = async (userId: string): Promise<ArtistaPerfil | null> => {
    try {
      const { data, error } = await supabase
        .from('artista')
        .select('id, nome, nomeartistico, onboarding_completed')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar perfil do artista:', error);
        return null;
      }
      return data as ArtistaPerfil | null;
    } catch (err) {
      console.error('Exceção ao buscar perfil do artista:', err);
      return null;
    }
  };

  useEffect(() => {
    let active = true;

    // Timeout de segurança para evitar loading infinito se o Supabase não responder
    const fallbackTimer = setTimeout(() => {
      if (active && loading) {
        console.warn('AuthContext fallback timer disparado');
        setLoading(false);
      }
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!active) return;
      
      const thisReqId = ++authReqIdRef.current;
      setLoading(true);

      // Fast path — SIGNED_OUT ou sessão nula: atualização síncrona sem fetch
      if (event === 'SIGNED_OUT' || !s) {
        if (thisReqId === authReqIdRef.current && active) {
          setSession(null);
          setArtist(null);
          setLoading(false);
        }
        return;
      }

      // Mantemos referência ao promise original — única chamada de rede.
      // withFetchTimeout faz o Promise.race: resolve em 7s ou quando o banco responder,
      // o que vier primeiro. Rejeições do fetch também retornam { ok: false }.
      const perfilPromise = fetchArtistPerfil(s.user.id);
      const result = await withFetchTimeout(perfilPromise, 7000);

      // Guard — descarta se um evento mais recente chegou durante o await.
      if (thisReqId !== authReqIdRef.current || !active) return;

      // session é SEMPRE setada — veio do evento de auth, não do banco.
      // Garante que !session nunca seja true por causa de lentidão do DB.
      setSession(s);

      if (result.ok) {
        // ── Caminho normal: banco respondeu dentro de 7s ──
        setArtist(result.value);
        setLoading(false);
      } else {
        // ── Timeout ou erro: libera a UI com session intacta ──
        // artist/artistId ficam null — rotas verificam !session (não !artist),
        // então a usuária permanece no Dashboard, não é redirecionada ao login.
        setArtist(null);
        setLoading(false);

        // Continua ouvindo o resultado real em background.
        // Se/quando chegar: aplica o mesmo guard de authReqIdRef.
        //   — ainda é o request mais recente → atualiza artist normalmente
        //   — um evento mais novo chegou     → descarta silenciosamente
        perfilPromise
          .then((latePerfil) => {
            if (thisReqId === authReqIdRef.current && active) {
              setArtist(latePerfil);
            }
          })
          .catch(() => { /* ignora erros tardios silenciosamente */ });
      }
    });

    return () => {
      active = false;
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  const refreshArtistPerfil = async () => {
    if (!session?.user) return;
    // Usa refreshReqIdRef próprio: não invalida fetches do auth listener.
    // Não seta loading=true — é uma atualização de perfil pós-onboarding,
    // a UI já está no estado final correto.
    const thisReqId = ++refreshReqIdRef.current;
    const perfil = await fetchArtistPerfil(session.user.id);
    if (thisReqId === refreshReqIdRef.current) {
      setArtist(perfil);
    }
  };

  const user = session?.user ?? null;
  const artistId = artist?.id ?? null;
  const onboardingDone = artist ? artist.onboarding_completed : null;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        artist,
        artistId,
        onboardingDone,
        loading,
        refreshArtistPerfil,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
