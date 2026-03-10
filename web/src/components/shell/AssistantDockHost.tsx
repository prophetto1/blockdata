import { useEffect, useRef, useState } from 'react';
import {
  IconLayoutSidebarRightExpand,
  IconPlayerStop,
  IconPlus,
  IconSend2,
  IconSettings,
  IconSparkles,
  IconX,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { AppIcon } from '@/components/ui/app-icon';
import { useAssistantChat, type ChatMessage } from '@/hooks/useAssistantChat';

type AssistantDockHostProps = {
  onClose: () => void;
  onDetach?: () => void;
};

const iconBtn =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground';

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  );
}

export function AssistantDockHost({
  onClose,
  onDetach,
}: AssistantDockHostProps) {
  const {
    messages,
    isStreaming,
    error,
    sendMessage,
    newThread,
    stopStreaming,
  } = useAssistantChat();
  const navigate = useNavigate();

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[inherit] bg-[var(--chrome,var(--background))] text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-1.5" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-1.5">
          {onDetach && (
            <button
              type="button"
              className={iconBtn}
              aria-label="Dock to right panel"
              title="Dock to right panel"
              onClick={onDetach}
            >
              <AppIcon icon={IconLayoutSidebarRightExpand} size="md" />
            </button>
          )}
          <span className="min-w-0 truncate text-sm font-semibold leading-tight text-foreground">
            Assistant
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={iconBtn}
            aria-label="New thread"
            title="New thread"
            onClick={newThread}
          >
            <AppIcon icon={IconPlus} size="md" />
          </button>
          <button type="button" className={iconBtn} aria-label="AI Settings" title="AI Settings" onClick={() => navigate('/app/settings/ai')}>
            <AppIcon icon={IconSettings} size="md" />
          </button>
          <button type="button" className={iconBtn} aria-label="Close assistant" onClick={onClose}>
            <AppIcon icon={IconX} size="md" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <AppIcon icon={IconSparkles} size="lg" className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Ask me anything about your project.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-3 py-3">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isStreaming && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-xl bg-muted px-3 py-2">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mx-3 mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t px-3 pb-3 pt-2.5" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            className="min-h-[38px] max-h-[120px] flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            placeholder="Ask anything..."
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              type="button"
              className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90"
              aria-label="Stop generating"
              onClick={stopStreaming}
            >
              <IconPlayerStop size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              aria-label="Send message"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <IconSend2 size={18} />
            </button>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {isStreaming ? 'Generating...' : 'Enter to send'}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">
            Sonnet 4.5
          </span>
        </div>
      </div>
    </div>
  );
}