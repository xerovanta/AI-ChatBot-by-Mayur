import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Content } from '@google/generative-ai';
import { conversationRepository } from '../repositories/conversation.repository';

// --- All Gemini-related logic moves here ---

if (!process.env.GEMINI_API_KEY) {
   throw new Error('❌ GEMINI_API_KEY is missing in .env file');
}

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Shared config
const generationConfig = {
   temperature: 0.7,
   maxOutputTokens: 500,
};

class ChatService {
   /**
    * (Non-streaming) Gets a single, complete reply from the AI.
    */
   async getChatReply(prompt: string, conversationID: string) {
      // 1. Add user message to history
      await conversationRepository.addMessage('user', prompt, conversationID);

      // 2. Get the full history
      const history = await conversationRepository.getHistory(conversationID);

      // 3. Call the AI
      const response = await model.generateContent({
         contents: history,
         generationConfig: generationConfig,
      });
      const reply = response.response.text();

      // 4. Add the AI's reply to history
      await conversationRepository.addMessage('model', reply, conversationID);

      // 5. Return only the new reply
      return { reply };
   }

   /**
    * (Streaming) Gets a reply as an async generator.
    */
   async *getChatReplyStream(prompt: string, conversationID: string) {
      // 1. Add user message to history
      await conversationRepository.addMessage('user', prompt, conversationID);

      // 2. Get the full history
      const history = await conversationRepository.getHistory(conversationID);

      // 3. Call the AI's streaming function
      const result = await model.generateContentStream({
         contents: history,
         generationConfig: generationConfig,
      });

      // 4. Stream the response
      let fullReply = '';
      for await (const chunk of result.stream) {
         const chunkText = chunk.text();
         if (chunkText) {
            fullReply += chunkText;
            yield chunkText; // Send this chunk back to the controller
         }
      }

      // 5. After streaming is complete, save the full AI reply
      await conversationRepository.addMessage(
         'model',
         fullReply,
         conversationID
      );
   }

   /**
    * Resets the chat history for a specific conversation.
    */
   async resetChat(conversationID: string) {
      await conversationRepository.clearHistory(conversationID);
      return { message: 'Chat history cleared' };
   }
}

export const chatService = new ChatService();
