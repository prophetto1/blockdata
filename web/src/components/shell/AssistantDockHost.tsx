import { useEffect, useRef, useState } from 'react';
import {
  IconArrowsLeftRight,
  IconChevronDown,
  IconDotsVertical,
  IconExternalLink,
  IconPlayerStop,
  IconPlus,
  IconSend2,
  IconSettings,
  IconSparkles,
  IconX,
} from '@tabler/icons-react';
import { AppIcon } from '@/components/ui/app-icon';
import { useAssistantChat, type ChatMessage } from '@/hooks/useAssistantChat';

type AssistantDockHostProps = {
  onClose: () => void;
  onDetach?: () => void;
  detached?: boolean;
  onToggleSide?: () => void;
  side?: 'left' | 'right';
};

const iconBtn =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-white/10 hover:text-white';

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600/90 text-white'
            : 'bg-white/8 text-slate-100'
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
  detached = false,
  onToggleSide,
  side = 'right',
}: AssistantDockHostProps) {
  const {
    messages,
    isStreaming,
    error,
    sendMessage,
    newThread,
    stopStreaming,
  } = useAssistantChat();

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden rounded-[inherit] bg-gradient-to-b from-[#3a3e45] via-[#252a31] to-[#15191f] font-sans text-white">
      {/* Header */}
      <div className="flex min-h-[42px] items-center justify-between gap-2 border-b border-slate-400/25 bg-[rgba(46,52,61,0.92)] px-2.5 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          {onToggleSide && !detached && (
            <button
              type="button"
              className={iconBtn}
              aria-label={side === 'right' ? 'Move assistant to left' : 'Move assistant to right'}
              onClick={onToggleSide}
            >
              <AppIcon icon={IconArrowsLeftRight} size="md" />
            </button>
          )}
          {onDetach && (
            <button
              type="button"
              className={iconBtn}
              aria-label={detached ? 'Attach to sidebar' : 'Detach assistant panel'}
              onClick={onDetach}
            >
              <AppIcon icon={IconExternalLink} size="md" />
            </button>
          )}
          <span className="min-w-0 truncate text-[0.94rem] font-semibold leading-tight tracking-tight text-slate-50">
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
          <button type="button" className={iconBtn} aria-label="Settings" title="Settings">
            <AppIcon icon={IconSettings} size="md" />
          </button>
          <button type="button" className={iconBtn} aria-label="Assistant options">
            <AppIcon icon={IconDotsVertical} size="md" />
          </button>
          <button type="button" className={iconBtn} aria-label="Close assistant" onClick={onClose}>
            <AppIcon icon={IconX} size="md" />
          </button>
        </div>
      </div>

      {/* Thread / scroll area */}
      <div ref={scrollRef} className="min-h-0 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <AppIcon icon={IconSparkles} size="lg" className="text-slate-400" />
            <p className="text-sm text-slate-400">Ask me anything about your project.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-2.5 py-3">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isStreaming && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-xl bg-white/8 px-3 py-2">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mx-2.5 mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-slate-400/25 bg-[rgba(39,45,53,0.94)] px-2.5 pb-3 pt-2.5">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            className="min-h-[38px] flex-1 rounded-[10px] border border-slate-400/30 bg-[rgba(26,31,38,0.98)] px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-500/50 focus:outline-none"
            placeholder="Ask anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              type="button"
              className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-red-500/80 text-white transition-colors hover:bg-red-500"
              aria-label="Stop generating"
              onClick={stopStreaming}
            >
              <IconPlayerStop size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-blue-600/80 text-white transition-colors hover:bg-blue-600 disabled:opacity-40"
              aria-label="Send message"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <IconSend2 size={18} />
            </button>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {isStreaming ? 'Generating...' : 'Enter to send'}
          </span>
          <button
            type="button"
            className="inline-flex h-[24px] items-center gap-1 rounded-full border border-slate-400/20 bg-[rgba(32,38,46,0.96)] px-2 text-[11px] font-medium text-slate-300"
          >
            Sonnet 4.5
            <AppIcon icon={IconChevronDown} size="sm" />
          </button>
        </div>
      </div>
    </div>
  );
}
