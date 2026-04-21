import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Menu, Bot, User, CornerDownLeft, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function ChatInterface({ sessionId, isSidebarOpen, setIsSidebarOpen }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your document AI assistant. Upload a PDF first, and then ask me any questions about it.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const response = await axios.post('http://localhost:8000/chat', {
        message: userMessage,
        session_id: sessionId
      });

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.answer,
        sources: response.data.sources
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: 'There was an error communicating with the server. Ensure the backend is running and a database exists.' 
      }]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-full bg-primary/30 backdrop-blur-3xl">
      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center px-6 flex-shrink-0 relative z-10 bg-primary/50">
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="mr-4 p-2 rounded-lg hover:bg-white/5 transition-colors text-textMuted hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-lg font-medium text-white">Chat Session</h2>
        <span className="ml-3 px-2.5 py-1 rounded-md bg-white/5 text-xs text-textMuted border border-white/10 font-mono">
          ID: {sessionId}
        </span>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-accent/20 text-accent' : msg.role === 'system' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                
                <div className={`max-w-[80%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-5 py-3.5 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-accent text-white rounded-tr-sm' 
                      : msg.role === 'system'
                        ? 'bg-red-500/10 text-red-200 rounded-tl-sm border border-red-500/20'
                        : 'bg-secondary/80 text-textMain border border-white/5 rounded-tl-sm shadow-sm'
                  }`}>
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i} className={i !== 0 ? 'mt-2' : ''}>{line}</p>
                    ))}
                  </div>

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 text-xs text-textMuted flex flex-wrap gap-2">
                       <span className="font-medium mr-1">Sources retrieved:</span>
                       {Array.from(new Set(msg.sources.map(s => s.source.split('\\').pop().split('/').pop()))).map((sourceName, i) => (
                         <span key={i} className="px-2 py-0.5 rounded bg-white/5 border border-white/10">{sourceName}</span>
                       ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="px-5 py-4 rounded-2xl bg-secondary/80 border border-white/5 rounded-tl-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-textMuted animate-pulse-slow object-left"></div>
                  <div className="w-2 h-2 rounded-full bg-textMuted animate-pulse-slow delay-150"></div>
                  <div className="w-2 h-2 rounded-full bg-textMuted animate-pulse-slow delay-300"></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 sm:p-6 bg-primary/80 backdrop-blur-md border-t border-white/5 relative z-10">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative group">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            placeholder="Ask a question about your documents..."
            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl py-4 pl-5 pr-14 text-white placeholder-textMuted focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all shadow-inner disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-accent text-white transition-all hover:bg-blue-600 disabled:opacity-50 disabled:bg-white/10 disabled:text-textMuted shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
          
          <div className="absolute right-4 bottom-[-20px] opacity-0 group-focus-within:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-textMuted">
             Press <CornerDownLeft className="w-3 h-3" /> to send
          </div>
        </form>
      </div>
    </div>
  );
}
