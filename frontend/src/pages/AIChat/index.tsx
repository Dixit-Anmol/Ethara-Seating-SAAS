import { useChat } from '../../hooks/useChat';
import ChatWindow from '../../components/ChatWindow';
import ChatInput from '../../components/ChatInput';
import { Bot, Zap, PlusCircle } from 'lucide-react';

export default function AIChat() {
  const {
    messages,
    inputText,
    setInputText,
    isPending,
    sendMessage,
    clearChat
  } = useChat();

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col gap-4">
      
      {/* Chat Window — Full Width */}
      <div className="flex-1 glass-panel rounded-2xl border border-border/80 flex flex-col overflow-hidden shadow-lg">
        
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center text-primary">
              <Bot size={18} />
            </div>
            <div>
              <span className="font-bold text-sm block flex items-center gap-2">
                Ethara Office Copilot
                <span className="px-1.5 py-0.5 rounded-md bg-violet-500/10 text-[9px] font-semibold text-violet-400 border border-violet-500/20">AI</span>
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-subtle"></span>
                <span>Online — LLM Intent Engine Active</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={clearChat}
              className="px-3.5 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-xs font-semibold text-primary transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle size={14} />
              <span>New Chat</span>
            </button>
            <div className="hidden md:flex items-center gap-2 text-[10px] text-muted-foreground">
              <Zap size={12} className="text-amber-400" />
              <span>Powered by Natural Language Understanding</span>
            </div>
          </div>
        </div>

        {/* Chat Conversation Thread */}
        <ChatWindow
          messages={messages}
          isPending={isPending}
          onSendSuggestion={sendMessage}
        />

        {/* Input Form */}
        <ChatInput
          inputText={inputText}
          setInputText={setInputText}
          isPending={isPending}
          onSend={sendMessage}
        />

      </div>

    </div>
  );
}
