import { useRef, useEffect } from 'react';
import { Bot, User, Terminal, Sparkles } from 'lucide-react';
import type { Message } from '../stores/chatStore';

interface ChatWindowProps {
  messages: Message[];
  isPending: boolean;
  onSendSuggestion: (text: string) => void;
}

const SUGGESTION_CHIPS = [
  { label: "Dashboard Summary", icon: "📊" },
  { label: "Show all vacant seats", icon: "💺" },
  { label: "Seat utilization", icon: "📈" },
  { label: "Employees in Engineering", icon: "👥" },
  { label: "Project statistics", icon: "📋" },
  { label: "Recent joiners", icon: "🆕" },
];

export default function ChatWindow({ messages, isPending, onSendSuggestion }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPending]);

  // Simple markdown-like renderer for bot messages
  const renderBotText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Bold text
      let processed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // Bullet points
      if (processed.startsWith('• ') || processed.startsWith('- ')) {
        processed = `<span class="inline-block w-1.5 h-1.5 rounded-full bg-primary/60 mr-2 relative top-[-1px]"></span>${processed.slice(2)}`;
        return <div key={i} className="flex items-start gap-0 pl-1 py-0.5" dangerouslySetInnerHTML={{ __html: processed }} />;
      }
      if (processed.trim() === '') {
        return <div key={i} className="h-2" />;
      }
      return <div key={i} className="py-0.5" dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  };

  const showSuggestions = messages.length <= 1;

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-4">
      {messages.map(msg => {
        const isBot = msg.sender === 'bot';
        return (
          <div 
            key={msg.id} 
            className={`flex gap-3 max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold
              ${isBot 
                ? 'bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-violet-500/25 text-primary' 
                : 'bg-primary text-primary-foreground'
              }`}
            >
              {isBot ? <Bot size={16} /> : <User size={16} />}
            </div>

            {/* Message Body */}
            <div className="space-y-2 min-w-0">
              <div className={`p-4 rounded-2xl text-sm border leading-relaxed overflow-hidden
                ${isBot 
                  ? 'bg-card border-border text-foreground' 
                  : 'bg-primary text-primary-foreground border-primary/20 shadow-md shadow-primary/10'
                }`}
              >
                {isBot ? (
                  <div className="space-y-0">
                    {renderBotText(msg.text)}
                  </div>
                ) : (
                  <span className="whitespace-pre-line">{msg.text}</span>
                )}
              </div>
              
              {/* Action badge */}
              {isBot && msg.actionTaken && msg.actionTaken !== 'unknown' && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/20 bg-violet-500/5 text-[10px] text-violet-400 font-mono w-max">
                  <Terminal size={12} />
                  <span>Intent: {msg.actionTaken}</span>
                  {msg.actionDetails?.count !== undefined && (
                    <span className="text-muted-foreground">({msg.actionDetails.count} results)</span>
                  )}
                </div>
              )}
              
              <span className="text-[10px] text-muted-foreground/60 block px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        );
      })}

      {/* Suggestion Chips */}
      {showSuggestions && (
        <div className="flex flex-wrap gap-2 pt-2 pb-2 max-w-[85%]">
          {SUGGESTION_CHIPS.map((chip, i) => (
            <button
              key={i}
              onClick={() => onSendSuggestion(chip.label)}
              disabled={isPending}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-xl 
                border border-border bg-card/80 hover:bg-muted hover:border-primary/30
                text-xs font-medium text-muted-foreground hover:text-foreground 
                transition-all duration-200 disabled:opacity-50
                hover:shadow-sm hover:shadow-primary/5"
            >
              <span>{chip.icon}</span>
              <span>{chip.label}</span>
              <Sparkles size={10} className="text-primary/40 group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      )}
      
      {/* Typing indicator */}
      {isPending && (
        <div className="flex gap-3 max-w-[80%] mr-auto">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-violet-500/25 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            <Bot size={16} />
          </div>
          <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span className="text-[10px] text-muted-foreground ml-1">Analyzing your query...</span>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}
