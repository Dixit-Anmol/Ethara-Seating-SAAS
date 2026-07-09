import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { aiService } from '../services/api';
import { useChatStore } from '../stores/chatStore';
import type { Message } from '../stores/chatStore';
import { showToastGlobal } from '../App';

export function useChat() {
  const queryClient = useQueryClient();
  const { messages, addMessage, clearChat } = useChatStore();
  const [inputText, setInputText] = useState('');

  const buildHistory = (currentMessages: Message[]) => {
    return currentMessages
      .filter(m => m.id !== 'welcome')
      .slice(-20) // last 20 messages (10 exchanges)
      .map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));
  };

  const chatMutation = useMutation({
    mutationFn: (args: { message: string; history: { role: string; content: string }[] }) =>
      aiService.sendChatMessage(args.message, args.history),
    onSuccess: (data) => {
      const botMessage: Message = {
        id: Math.random().toString(),
        sender: 'bot',
        text: data.response,
        timestamp: new Date(),
        actionTaken: data.action_taken,
        actionDetails: data.action_details
      };
      addMessage(botMessage);

      // Invalidate queries if database modification occurred
      if (
        data.action_taken === 'allocate_seat' ||
        data.action_taken === 'release_seat' ||
        data.action_taken === 'transfer_seat'
      ) {
        queryClient.invalidateQueries({ queryKey: ['seats'] });
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
        showToastGlobal('Database updated by AI action', 'success');
      }
    },
    onError: () => {
      const errorMessage: Message = {
        id: Math.random().toString(),
        sender: 'bot',
        text: "I encountered an error connecting to the AI service. Please make sure the backend is running and the API key is configured.",
        timestamp: new Date()
      };
      addMessage(errorMessage);
      showToastGlobal('AI Service Error', 'error');
    }
  });

  const sendMessage = (textToSend: string) => {
    if (!textToSend.trim() || chatMutation.isPending) return;

    const userMessage: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    // Update store with user message immediately
    addMessage(userMessage);
    setInputText('');

    // Generate context history including the new user message
    const history = buildHistory([...messages, userMessage]);
    chatMutation.mutate({ message: textToSend, history });
  };

  return {
    messages,
    inputText,
    setInputText,
    isPending: chatMutation.isPending,
    sendMessage,
    clearChat
  };
}
