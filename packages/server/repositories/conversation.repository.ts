import type { Content } from '@google/generative-ai';

type ChatRole = 'user' | 'model';

/**
 * Manages the data layer for conversations.
 * This implementation uses an in-memory Map to store multiple histories.
 */
class ConversationRepository {
   /**
    * Stores all chat histories, keyed by a unique conversationID.
    * <conversationID, ChatHistory>
    */
   private histories: Map<string, Content[]> = new Map();

   /**
    * Gets the chat history for a specific conversation,
    * or creates a new one if it doesn't exist.
    * @param id - The unique conversation ID.
    * @returns The chat history array (Content[]).
    */
   private getHistoryForConversation(id: string): Content[] {
      if (!this.histories.has(id)) {
         this.histories.set(id, []);
      }
      // We use "!" because we've just ensured it exists.
      return this.histories.get(id)!;
   }

   /**
    * Retrieves the entire chat history for a specific conversation.
    * @param id - The unique conversation ID.
    * @returns A promise that resolves to the chat history array.
    */
   async getHistory(id: string): Promise<Content[]> {
      const history = this.getHistoryForConversation(id);
      // Return a *copy* to prevent external modification
      return [...history];
   }

   /**
    * Adds a new message to a specific conversation's history.
    * @param id - The unique conversation ID.
    * @param role - The role of the sender (user or model).
    * @param text - The content of the message.
    * @returns A promise that resolves when the message is added.
    */
   async addMessage(id: string, role: ChatRole, text: string): Promise<void> {
      const history = this.getHistoryForConversation(id);
      const message: Content = {
         role: role,
         parts: [{ text: text }],
      };
      history.push(message);
   }

   /**
    * Clears the chat history for a specific conversation.
    * @param id - The unique conversation ID.
    * @returns A promise that resolves when the history is cleared.
    */
   async clearHistory(id: string): Promise<void> {
      // Deleting the key from the map effectively clears the history.
      this.histories.delete(id);
   }
}

export const conversationRepository = new ConversationRepository();
