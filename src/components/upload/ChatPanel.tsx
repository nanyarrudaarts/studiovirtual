import React, { useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { CompactPhotoSlots } from './PhotoSlots';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface PhotoSlot {
  file: File | null;
  url: string | null;
}

interface Props {
  messages: Message[];
  aiLoading: boolean;
  chatInput: string;
  setChatInput: (val: string) => void;
  handleChatSubmit: (e: React.FormEvent) => void;
  photos: PhotoSlot[];
  handlePhotoSlot: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onSkip: () => void;
  onReview: () => void;
}

export function ChatPanel({
  messages,
  aiLoading,
  chatInput,
  setChatInput,
  handleChatSubmit,
  photos,
  handlePhotoSlot,
  onSkip,
  onReview,
}: Props) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col h-[500px] animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex-1 overflow-y-auto pr-4 space-y-4 mb-4">
        {messages.filter((m) => m.role !== 'system').map((msg, i) => {
          const contentToDisplay = msg.content.replace(/```json\n[\s\S]*?\n```/, '').trim();
          if (!contentToDisplay) return null;
          return (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gold text-bg font-bold rounded-br-none shadow-gold-glow-sm'
                    : 'bg-surface-raised border border-border text-text-main rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{contentToDisplay}</p>
              </div>
            </div>
          );
        })}
        {aiLoading && (
          <div className="flex justify-start">
            <div className="bg-surface-raised border border-border rounded-2xl px-5 py-3 rounded-bl-none flex items-center gap-2">
              <span className="w-2 h-2 bg-gold/50 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-gold/50 rounded-full animate-bounce animation-delay-200" />
              <span className="w-2 h-2 bg-gold/50 rounded-full animate-bounce animation-delay-400" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-4">
        <CompactPhotoSlots photos={photos} handlePhotoSlot={handlePhotoSlot} />

        <form onSubmit={handleChatSubmit} className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Descreva a obra, inspirações, materiais..."
            className="flex-1 border border-border rounded-xl px-4 py-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main"
            disabled={aiLoading}
          />
          <button
            type="submit"
            disabled={aiLoading || !chatInput.trim()}
            className="bg-gold text-bg px-6 py-3 rounded-xl font-bold hover:bg-gold-light transition-all disabled:opacity-50 shadow-gold-glow-sm"
          >
            Enviar
          </button>
        </form>

        {messages.some((m) => m.content.includes('```json')) && (
          <div className="flex justify-center mt-2">
            <button
              onClick={onReview}
              className="text-sm font-bold text-gold hover:text-gold-light hover:underline flex items-center gap-1"
            >
              Revisar Ficha Técnica Gerada <ChevronRight size={16} />
            </button>
          </div>
        )}

        <div className="flex justify-center mt-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-text-muted hover:text-gold transition-colors"
          >
            Pular conversa e ir para formulário manual
          </button>
        </div>
      </div>
    </div>
  );
}
