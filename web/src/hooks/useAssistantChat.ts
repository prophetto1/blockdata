import { useCallback, useRef, useState } from 'react';
import { edgeFetch } from '@/lib/edge';
import { supabase } from '@/lib/supabase';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
};

type ThreadMeta = {
  id: string;
  title: string | null;
  model: string | null;
  updatedAt: string;
};

export function useAssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadMeta[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  /** Load the user's recent threads. */
  const loadThreads = useCallback(async () => {
    const { data } = await supabase
      .from('assistant_threads')
      .select('id, title, model, updated_at')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (data) {
      setThreads(
        data.map((t: { id: string; title: string | null; model: string | null; updated_at: string }) => ({
          id: t.id,
          title: t.title,
          model: t.model,
          updatedAt: t.updated_at,
        })),
      );
    }
  }, []);

  /** Load messages for an existing thread. */
  const loadThread = useCallback(async (id: string) => {
    setError(null);
    setThreadId(id);

    const { data, error: err } = await supabase
      .from('assistant_messages')
      .select('id, role, content, created_at')
      .eq('thread_id', id)
      .order('created_at', { ascending: true });

    if (err) {
      setError(err.message);
      return;
    }

    setMessages(
      (data ?? []).map((m: { id: string; role: string; content: string; created_at: string }) => ({
        id: m.id,
        role: m.role as ChatMessage['role'],
        content: m.content,
        createdAt: m.created_at,
      })),
    );
  }, []);

  /** Start a fresh thread (clear local state). */
  const newThread = useCallback(() => {
    setThreadId(null);
    setMessages([]);
    setError(null);
  }, []);

  /** Send a message and stream the response. */
  const sendMessage = useCallback(
    async (content: string, model?: string) => {
      if (!content.trim()) return;
      setError(null);

      // Optimistic user message
      const userMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Placeholder for assistant response
      const assistantMsg: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const resp = await edgeFetch('assistant-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thread_id: threadId,
            message: content.trim(),
            ...(model ? { model } : {}),
          }),
          signal: controller.signal,
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || `HTTP ${resp.status}`);
        }

        const reader = resp.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const event = JSON.parse(data);

              if (event.type === 'thread_meta') {
                setThreadId(event.thread_id);
              } else if (event.type === 'content_block_delta' && event.delta?.text) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === 'assistant') {
                    updated[updated.length - 1] = { ...last, content: last.content + event.delta.text };
                  }
                  return updated;
                });
              }
            } catch {
              // Non-JSON event, skip
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg);
          // Remove empty assistant placeholder on error
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant' && !last.content) {
              return prev.slice(0, -1);
            }
            return prev;
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [threadId],
  );

  /** Stop an in-progress stream. */
  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    messages,
    threadId,
    threads,
    isStreaming,
    error,
    sendMessage,
    loadThread,
    loadThreads,
    newThread,
    stopStreaming,
  };
}
