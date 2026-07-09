import { create } from 'zustand';

export interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  actionTaken?: string | null;
  actionDetails?: Record<string, any> | null;
}

export const getWelcomeMessage = (): Message => ({
  id: 'welcome',
  sender: 'bot',
  text: "Hello! I'm your **AI Office Assistant**. I can understand natural language — just ask me anything about employees, seats, projects, or the office.\n\nTry asking things like:\n• \"Find employee named Rahul\"\n• \"Who sits on seat F2-S0025?\"\n• \"Vacant seats on floor 3\"\n• \"Allocate a seat for employee 1024\"",
  timestamp: new Date()
});

interface ChatState {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearChat: () => void;
}

const LOCAL_STORAGE_KEY = 'ethara_chat_history';

const loadMessages = (): Message[] => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      }
    }
  } catch (e) {
    console.error('Failed to parse chat history from localStorage', e);
  }
  return [getWelcomeMessage()];
};

export const useChatStore = create<ChatState>((set) => ({
  messages: loadMessages(),
  addMessage: (message) => set((state) => {
    const updated = [...state.messages, message];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    return { messages: updated };
  }),
  clearChat: () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    set({ messages: [getWelcomeMessage()] });
  }
}));
