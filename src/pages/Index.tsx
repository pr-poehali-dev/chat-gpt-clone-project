import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const STORAGE_KEY = 'ai_chat_messages';
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;
const API_URL = 'https://functions.poehali.dev/2080a51d-5d10-4f34-8529-7be5464bd9a3';

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadMessages();
    checkAndCleanupMessages();
    const interval = setInterval(checkAndCleanupMessages, CLEANUP_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const saveMessages = (msgs: Message[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        messages: msgs,
        lastUpdated: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save messages:', error);
    }
  };

  const checkAndCleanupMessages = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const lastUpdated = data.lastUpdated || 0;
        const now = Date.now();
        
        if (now - lastUpdated > CLEANUP_INTERVAL) {
          localStorage.removeItem(STORAGE_KEY);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    saveMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: userMessage.content,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response:', data);
      
      let responseText = '';
      if (typeof data === 'string') {
        responseText = data;
      } else if (data.response) {
        responseText = data.response;
      } else if (data.message) {
        responseText = data.message;
      } else if (data.text) {
        responseText = data.text;
      } else if (data.content) {
        responseText = data.content;
      } else if (data.answer) {
        responseText = data.answer;
      } else {
        responseText = JSON.stringify(data);
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText || 'Извините, не удалось получить ответ',
        timestamp: Date.now()
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      saveMessages(updatedMessages);
    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Ошибка подключения к API. ${error instanceof Error ? error.message : 'Проверьте настройки.'}`,
        timestamp: Date.now()
      };

      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);
      saveMessages(updatedMessages);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-screen bg-background dark">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Bot" size={24} className="text-primary" />
            <h1 className="text-xl font-semibold text-foreground">AI Чат</h1>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              className="text-muted-foreground hover:text-foreground"
            >
              <Icon name="Trash2" size={16} className="mr-2" />
              Очистить
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <Icon name="MessageSquare" size={64} className="text-muted-foreground mb-6" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Начните общение
              </h2>
              <p className="text-muted-foreground">
                Задайте вопрос и получите ответ от AI
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 animate-fade-in ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Icon name="Bot" size={18} className="text-primary-foreground" />
                    </div>
                  )}
                  
                  <div
                    className={`px-5 py-3 rounded-2xl max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-card-foreground border border-border'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {message.content}
                    </p>
                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Icon name="User" size={18} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-4 animate-fade-in">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Icon name="Bot" size={18} className="text-primary-foreground" />
                  </div>
                  <div className="px-5 py-3 rounded-2xl bg-card border border-border">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></span>
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-75"></span>
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-150"></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border bg-card sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3 items-end">
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-12 w-12 rounded-xl flex-shrink-0"
            >
              <Icon name="Send" size={20} />
            </Button>
            
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Введите сообщение... (Enter для отправки, Shift+Enter для новой строки)"
              className="min-h-[48px] max-h-[200px] resize-none rounded-xl bg-background border-input"
              rows={1}
              disabled={isLoading}
            />
          </div>
          
          <p className="text-xs text-muted-foreground mt-2 text-center">
            История сообщений очищается автоматически каждые 24 часа
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;