import { useEffect, useState, useRef } from 'react';
import { Send, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { chatApi } from '../lib/services';
import type { ChatMessage } from '../types';
import { Button, Spinner, EmptyState } from '../components/ui';
import { JegoMessage } from '../components/assistant/JegoMessage';
import { JegoWelcome } from '../components/assistant/JegoWelcome';

const suggestions = [
  'When should I take Metformin?',
  'How many tablets are left?',
  'Can I take this medicine after food?',
  'What is my adherence rate?',
];

export function AssistantPage() {
  const { activePatient } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatApi.history().then(({ data }) => setMessages(data)).finally(() => setInitialLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg) return;

    setInput('');
    setLoading(true);

    const userMsg: ChatMessage = {
      _id: Date.now().toString(),
      role: 'user',
      content: msg,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const { data } = await chatApi.send(msg, activePatient?._id);
      setMessages((prev) => [...prev, data.reply]);
    } catch {
      toast.error('Jego is unavailable right now');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex h-[calc(100vh-8rem)] flex-col">
      <JegoWelcome />

      <div className="mb-4 flex items-center gap-3">
        <img src="/jego-mascot.png" alt="Jego" className="h-12 w-12 rounded-2xl object-contain" />
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-brand-600 dark:text-brand-400" /> Jego
          </h1>
          <p className="page-desc">
            Ask about medicines, dosages, and inventory{activePatient ? ` for ${activePatient.name}` : ''}
          </p>
        </div>
      </div>

      <div className="card flex flex-1 flex-col overflow-hidden !p-0">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <EmptyState
              icon={<img src="/jego-mascot.png" alt="" className="h-10 w-10 object-contain" />}
              title="Hey, I'm Jego!"
              description="How can I help you today? Ask me anything about medicines and health records."
            />
          ) : (
            messages.map((m) => (
              <div key={m._id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    m.role === 'user'
                      ? 'bg-brand-600 text-sm text-white'
                      : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div className="mb-2 flex items-center gap-2">
                      <img src="/jego-mascot.png" alt="Jego" className="h-6 w-6 rounded-lg object-contain" />
                      <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">Jego</span>
                    </div>
                  )}
                  {m.role === 'assistant' ? (
                    <JegoMessage content={m.content} />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                <img src="/jego-mascot.png" alt="" className="h-5 w-5 animate-pulse object-contain" />
                <Spinner className="h-4 w-4" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 border-t border-slate-200 p-3 dark:border-slate-700">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-600 dark:text-slate-400 dark:hover:border-brand-700 dark:hover:bg-brand-950/40 dark:hover:text-brand-300"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-700">
          <input
            className="input flex-1"
            placeholder="Ask Jego about your medicines..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          />
          <Button onClick={() => send()} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="mt-2 text-center text-[10px] text-slate-400">
        Jego&apos;s responses are informational only. Always consult your doctor for medical decisions.
      </p>
    </div>
  );
}
