import { useState, useRef, FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendHorizonal, Loader2 } from 'lucide-react'; // Re-added Bot for consistency
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

   return (
      <div className="flex flex-col w-full max-w-2xl mx-auto h-[90vh] bg-white dark:bg-gray-900 rounded-lg shadow-2xl overflow-hidden">
         {/* Header */}
         <div className="p-5 border-b border-gray-200 dark:border-gray-700 text-lg font-semibold bg-gray-50 dark:bg-gray-800">
            AI ChatBot
         </div>

         {/* Messages Area */}
         <div
            ref={scrollAreaRef}
            className="flex-1 p-6 overflow-y-auto space-y-6 bg-gray-100 dark:bg-gray-900"
         >
            {messages.map((msg) => (
               <MessageItem key={msg.id} message={msg} />
            ))}
            {isLoading &&
               messages.length > 0 &&
               messages[messages.length - 1]?.role === 'model' &&
               messages[messages.length - 1]?.text === '' && (
                  <div className="flex justify-start">
                     <div className="px-4 py-2 rounded-2xl max-w-[70%] bg-gray-200 dark:bg-gray-800 rounded-bl-none">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                     </div>
                  </div>
               )}
         </div>

         {/* Input Area */}
         <form
            onSubmit={handleSubmit}
            className="flex items-center p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 gap-2"
         >
            <div className="flex items-center w-full rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500 px-3">
               <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Send a message..."
                  className="flex-1 bg-transparent border-none focus:ring-0 outline-none py-3 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  disabled={isLoading}
                  autoComplete="off"
               />
               <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="ml-2 h-9 w-9 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
                  aria-label="Send message"
               >
                  {isLoading ? (
                     <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                     <SendHorizonal className="w-5 h-5" />
                  )}
               </button>
            </div>
         </form>
      </div>
   );

   function MessageItem({ message }: { message: Message }) {
      const isUser = message.role === 'user';

      return (
         <div
            className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
         >
            <div
               className={`
          px-5 py-3 max-w-[70%] text-base shadow
          ${
             isUser
                ? 'bg-blue-600 text-white rounded-2xl rounded-br-md'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-md'
          }
          mb-2
        `}
            >
               <div className="prose prose-sm dark:prose-invert prose-p:my-0 max-w-none text-inherit break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                     {message.text}
                  </ReactMarkdown>
               </div>
            </div>
         </div>
      );
   }
}
