import React from 'react';
import { Send, MessageSquare } from 'lucide-react';

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  isPending: boolean;
  onSend: (text: string) => void;
}

export default function ChatInput({ inputText, setInputText, isPending, onSend }: ChatInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isPending) return;
    onSend(inputText);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-muted/10 flex gap-3">
      <div className="flex-1 relative">
        <MessageSquare size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
        <input
          type="text"
          required
          placeholder="Ask anything — e.g., 'Find Anmol Dixit', 'Who sits on F2-S0025?', 'Dashboard summary'..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isPending}
          className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
      </div>
      <button
        type="submit"
        disabled={isPending || !inputText.trim()}
        className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 shadow-md shadow-primary/25 active:scale-95"
      >
        <Send size={16} />
        <span className="hidden sm:inline">Send</span>
      </button>
    </form>
  );
}
