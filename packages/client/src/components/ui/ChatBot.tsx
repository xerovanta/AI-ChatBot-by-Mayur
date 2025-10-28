import { useState, useRef, FormEvent, useEffect } from 'react';
import { SendHorizonal, Loader2 } from 'lucide-react'; // icons
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // Make sure this package is installed
import './ChatBot.css';

// Define the structure for a message
interface Message {
   id: string;
   role: 'user' | 'model';
   text: string;
   timestamp: number;
}

export function ChatBot() {
   const [messages, setMessages] = useState<Message[]>([]);
   const [input, setInput] = useState('');
   const [isLoading, setIsLoading] = useState(false);
   const conversationID = useRef(crypto.randomUUID());
   const scrollAreaRef = useRef<HTMLDivElement>(null);

   // Scroll to bottom whenever messages change
   useEffect(() => {
      if (scrollAreaRef.current) {
         scrollAreaRef.current.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: 'smooth',
         });
      }
   }, [messages]);

   const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();
      const trimmedInput = input.trim();
      if (!trimmedInput || isLoading) return;

      const now = Date.now();
      const userMessage: Message = {
         id: crypto.randomUUID(),
         role: 'user',
         text: trimmedInput,
         timestamp: now,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      const modelMessageId = crypto.randomUUID();
      setMessages((prev) => [
         ...prev,
         { id: modelMessageId, role: 'model', text: '', timestamp: Date.now() },
      ]);

      try {
         const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               prompt: trimmedInput,
               conversationID: conversationID.current,
            }),
         });

         if (!response.ok) {
            const errorData = await response
               .json()
               .catch(() => ({ error: 'Failed to fetch response.' }));
            throw new Error(
               errorData.error || `HTTP error! status: ${response.status}`
            );
         }

         if (!response.body) throw new Error('No response body');

         const reader = response.body.getReader();
         const decoder = new TextDecoder();
         let accumulatedText = '';
         let loopDone = false;

         while (!loopDone) {
            const { done, value } = await reader.read();
            if (done) {
               loopDone = true;
               break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
               if (line.startsWith('data: ')) {
                  const data = line.substring(6).trim();

                  if (data === '[DONE]') {
                     loopDone = true;
                     break;
                  }

                  if (data) {
                     try {
                        const parsedData = JSON.parse(data);
                        if (parsedData.text) {
                           accumulatedText += parsedData.text;
                           setMessages((prev) =>
                              prev.map((msg) =>
                                 msg.id === modelMessageId
                                    ? { ...msg, text: accumulatedText }
                                    : msg
                              )
                           );
                        }
                     } catch (error) {
                        // ignore non-JSON chunks
                     }
                  }
               }
            }
         }

         if (accumulatedText === '') {
            setMessages((prev) =>
               prev.map((msg) =>
                  msg.id === modelMessageId ? { ...msg, text: '...' } : msg
               )
            );
         }
      } catch (error) {
         console.error('Chat error:', error);
         setMessages((prev) =>
            prev.map((msg) =>
               msg.id === modelMessageId
                  ? {
                       ...msg,
                       text: `Sorry, something went wrong: ${error instanceof Error ? error.message : String(error)}`,
                    }
                  : msg
            )
         );
      } finally {
         setIsLoading(false);
      }
   };

   // Keyboard handling: Enter to send, Shift+Enter => newline
   const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault();
         const form = (e.target as HTMLElement).closest(
            'form'
         ) as HTMLFormElement | null;
         if (form) form.requestSubmit();
      }
   };

   return (
      <div className="chatbot-root" role="region" aria-label="Chat">
         <header className="chatbot-header">AI ChatBot</header>

         <div
            ref={scrollAreaRef}
            className="chatbot-messages"
            data-testid="messages"
         >
            {messages.map((msg) => (
               <MessageItem key={msg.id} message={msg} />
            ))}

            {isLoading &&
               messages.length > 0 &&
               messages[messages.length - 1]?.role === 'model' &&
               messages[messages.length - 1]?.text === '' && (
                  <div className="message-row bot">
                     <div className="avatar" aria-hidden>
                        <span className="avatar-initial">AI</span>
                     </div>
                     <div className="message-bubble bot-bubble typing-indicator">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                     </div>
                  </div>
               )}
         </div>

         <form onSubmit={handleSubmit} className="chatbot-input-form">
            <div className="chatbot-input-wrap">
               <textarea
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Send a message..."
                  className="chatbot-input"
                  disabled={isLoading}
                  rows={1}
                  aria-label="Message input"
               />
               <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="chatbot-send-btn"
                  aria-label="Send message"
               >
                  {isLoading ? (
                     <Loader2 className="loader" />
                  ) : (
                     <SendHorizonal />
                  )}
               </button>
            </div>
         </form>
      </div>
   );

   function MessageItem({ message }: { message: Message }) {
      const isUser = message.role === 'user';

      const time = new Date(message.timestamp).toLocaleTimeString([], {
         hour: '2-digit',
         minute: '2-digit',
      });

      return (
         <div className={isUser ? 'message-row user' : 'message-row bot'}>
            {!isUser && (
               <div className="avatar" aria-hidden>
                  <span className="avatar-initial">AI</span>
               </div>
            )}

            <div
               className={
                  isUser
                     ? 'message-bubble user-bubble'
                     : 'message-bubble bot-bubble'
               }
            >
               <div className="message-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                     {message.text}
                  </ReactMarkdown>
               </div>
               <div className="message-meta">
                  <time className="message-time">{time}</time>
               </div>
            </div>

            {isUser && (
               <div className="avatar user-avatar" aria-hidden>
                  <span className="avatar-initial">You</span>
               </div>
            )}
         </div>
      );
   }
}
