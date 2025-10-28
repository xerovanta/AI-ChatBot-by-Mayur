import { useState, useRef, FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendHorizonal, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Define the structure for a message
interface Message {
   id: string;
   role: 'user' | 'model';
   text: string;
}

export function ChatBot() {
   const [messages, setMessages] = useState<Message[]>([]);
   const [input, setInput] = useState('');
   const [isLoading, setIsLoading] = useState(false);
   const conversationID = useRef(crypto.randomUUID());

   // Ref for the scroll area
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

      const userMessage: Message = {
         id: crypto.randomUUID(),
         role: 'user',
         text: trimmedInput,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      const modelMessageId = crypto.randomUUID();
      setMessages((prev) => [
         ...prev,
         { id: modelMessageId, role: 'model', text: '' },
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

         if (!response.body) {
            throw new Error('No response body');
         }

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
            const lines = chunk.split('\n\n'); // SSE messages are separated by double newlines

            for (const line of lines) {
               if (line.startsWith('data: ')) {
                  const data = line.substring(6);

                  if (data.trim() === '[DONE]') {
                     loopDone = true;
                     break;
                  }

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
                     // Ignore empty data chunks or parsing errors silently for now
                     if (data.trim() !== '') {
                        console.error(
                           'Failed to parse stream chunk:',
                           data,
                           error
                        );
                     }
                  }
               }
            }
         }

         // After the loop, if no text was received, set a placeholder
         if (accumulatedText === '') {
            setMessages((prev) =>
               prev.map((msg) =>
                  msg.id === modelMessageId
                     ? { ...msg, text: '...' } // Or maybe "No response"
                     : msg
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

   return (
      <div className="w-full max-w-3xl mx-auto h-[calc(100vh-4rem)] flex flex-col border bg-white dark:bg-gray-900 rounded-lg shadow-md">
         {/* Header */}
         <div className="border-b px-6 py-3 flex items-center gap-2 text-lg font-medium text-gray-800 dark:text-gray-200">
            <Bot className="w-5 h-5 text-blue-600" />
            AI ChatBot
         </div>

         {/* Message Area */}
         <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
            <div className="space-y-4">
               {messages.map((msg) => (
                  <MessageItem key={msg.id} message={msg} />
               ))}
               {/* Loading indicator shown only when model msg is empty */}
               {isLoading &&
                  messages[messages.length - 1]?.role === 'model' &&
                  messages[messages.length - 1]?.text === '' && (
                     <div className="flex justify-start items-center gap-2.5">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700">
                           <Bot className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="px-3 py-2 rounded-lg max-w-[75%] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                           <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                        </div>
                     </div>
                  )}
            </div>
         </ScrollArea>

         {/* Input Area */}
         <div className="border-t p-4 bg-gray-50 dark:bg-gray-950">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
               <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="flex-1 rounded-full border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0 transition-shadow"
                  disabled={isLoading}
                  autoComplete="off"
               />
               <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-9 h-9 shrink-0 text-blue-600 hover:bg-blue-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:text-gray-400"
                  disabled={isLoading || !input.trim()}
                  aria-label="Send message"
               >
                  {isLoading ? (
                     <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                     <SendHorizonal className="w-5 h-5" />
                  )}
               </Button>
            </form>
         </div>
      </div>
   );
}

// Sub-component for rendering a single message
function MessageItem({ message }: { message: Message }) {
   const isUser = message.role === 'user';

   // Show loader if model message text is currently empty
   const showLoader = message.role === 'model' && message.text === '';

   return (
      <div
         className={`flex items-start gap-2.5 ${
            isUser ? 'justify-end' : 'justify-start'
         }`}
      >
         {!isUser && (
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 mt-1">
               <Bot className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
         )}
         <div
            className={`px-3 py-2 rounded-lg max-w-[75%] shadow-sm text-sm ${
               isUser
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-bl-none'
            }`}
         >
            {showLoader ? (
               <Loader2 className="w-4 h-4 animate-spin text-current" />
            ) : (
               <div className="prose prose-sm dark:prose-invert prose-p:my-0 prose-ul:my-1 prose-ol:my-1 prose-strong:font-semibold prose-code:before:content-none prose-code:after:content-none max-w-none text-inherit wrap-break-word">
                  <ReactMarkdown
                     remarkPlugins={[remarkGfm]}
                     components={{
                        pre: ({ node, ...props }) => (
                           <pre
                              className="my-1.5 overflow-x-auto rounded bg-black/10 dark:bg-white/10 p-2 text-inherit font-mono text-xs"
                              {...props}
                           />
                        ),
                        code: ({ node, className, children, ...props }) => {
                           const inline = (props as any).inline;
                           const match = /language-(\w+)/.exec(className || '');
                           return !inline && match ? (
                              <code
                                 className={`block rounded font-mono text-xs ${className || ''}`}
                                 {...props}
                              >
                                 {children}
                              </code>
                           ) : (
                              <code
                                 className={`rounded bg-black/10 dark:bg-white/10 px-1 py-0.5 font-mono text-xs ${className || ''}`}
                                 {...props}
                              >
                                 {children}
                              </code>
                           );
                        },
                     }}
                  >
                     {message.text}
                  </ReactMarkdown>
               </div>
            )}
         </div>
         {isUser && (
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 mt-1">
               <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
         )}
      </div>
   );
}
