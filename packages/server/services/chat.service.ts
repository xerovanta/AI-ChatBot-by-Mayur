import { GoogleGenerativeAI } from '@google/generative-ai';
// Import your repository
import { conversationRepository } from '../repositories/conversation.repository';

// --- All Gemini-related logic moves here from index.ts ---

if (!process.env.GEMINI_API_KEY) {
   throw new Error('❌ GEMINI_API_KEY is missing in .env file');
}

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

class ChatService {
   /**
    * Processes a user's prompt, gets a reply from Gemini, and saves both to history.
    * @param prompt - The user's message.
    * @param conversationID - The unique ID for this chat.
    * @returns A promise that resolves to the model's reply.
    */
   async getChatReply(prompt: string, conversationID: string) {
      await conversationRepository.addMessage(conversationID, 'user', prompt);

      const history = await conversationRepository.getHistory(conversationID);

      const response = await model.generateContent({
         contents: history,
         generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
         },
      });
      const reply = response.response.text();

      await conversationRepository.addMessage(conversationID, 'model', reply);

      return { reply };
   }

   /**
    * Resets the chat history for a specific conversation.
    * @param conversationID - The unique ID for this chat.
    */
   async resetChat(conversationID: string) {
      await conversationRepository.clearHistory(conversationID);
      return { message: 'Chat history cleared' };
   }
}

export const chatService = new ChatService();
