import { useState, useRef, FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendHorizonal, Loader2 } from 'lucide-react'; // Removed 'Bot'
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // Make sure this package is installed

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
         { id: modelMessageId, role: 'model', text: '' }, // Start model message empty
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
            const lines = chunk.split('\n'); // Process line by line

            for (const line of lines) {
               if (line.startsWith('data: ')) {
                  const data = line.substring(6).trim();

                  if (data === '[DONE]') {
                     loopDone = true;
                     break; // Exit inner loop
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
                        // Ignore json parsing error if data is not JSON
                     }
                  }
               }
            }
            if (loopDone) break; // Exit outer loop if [DONE] was found
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

   // Main container
   return (
      <div className="flex flex-col w-full max-w-2xl mx-auto h-[calc(100vh-4rem)] border bg-white dark:bg-gray-950 rounded-lg shadow-lg overflow-hidden">
         {/* Header */}
         <div className="p-4 border-b dark:border-gray-800 text-lg font-semibold text-gray-800 dark:text-gray-200">
            AI ChatBot
         </div>

         {/* Message Area */}
         <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
               {' '}
               {/* Adjusted spacing */}
               {messages.map((msg) => (
                  <MessageItem key={msg.id} message={msg} />
               ))}
               {/* Placeholder for loading state if needed */}
               {isLoading &&
                  messages[messages.length - 1]?.role === 'model' &&
                  messages[messages.length - 1]?.text === '' && (
                     <div className="flex justify-start">
                        <div className="px-4 py-2 rounded-2xl max-w-[75%] bg-gray-100 dark:bg-gray-800 rounded-bl-none">
                           <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                        </div>
                     </div>
                  )}
            </div>
         </ScrollArea>

         {/* Input Area */}
         <div className="p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
               <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="flex-1 border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                  autoComplete="off"
               />
               <Button
                  type="submit"
                  variant="default" // Changed back to default
                  size="icon" // Changed size to icon for just the arrow
                  className="rounded-lg shrink-0 bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 h-10 w-10" // Adjusted size
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
   const showLoader = message.role === 'model' && message.text === ''; // Simplified loading check

   return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
         <div
            className={`px-4 py-2 rounded-2xl max-w-[75%] text-sm shadow-sm ${
               // Added shadow
               isUser
                  ? 'bg-blue-600 text-white rounded-br-none' // User: Blue background, white text
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-bl-none' // Bot: Light grey background, dark text
            }`}
         >
            {showLoader ? (
               <Loader2 className="w-4 h-4 animate-spin text-current" />
            ) : (
               // Wrap markdown in a div for consistent styling control
               <div className="prose prose-sm dark:prose-invert prose-p:my-0 max-w-none text-inherit wrap-break-word">
                  <ReactMarkdown
                     remarkPlugins={[remarkGfm]}
                     components={{
                        pre: ({ node, ...props }) => (
                           <pre
                              className="my-1 overflow-x-auto rounded bg-black/10 dark:bg-white/10 p-2 text-inherit font-mono text-xs"
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
      </div>
   );
}
