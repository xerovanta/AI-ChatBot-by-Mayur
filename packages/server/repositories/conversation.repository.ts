import type { Content } from '@google/generative-ai';

// This defines the roles your chat will use
type ChatRole = 'user' | 'model';

/**
 * Manages the data layer for conversations, using a Map
 * to store history by conversationID.
 */
class ConversationRepository {
   // A Map to hold all conversations.
   // Key: conversationID (string)
   // Value: Chat history (Content[])
   private conversations = new Map<string, Content[]>();

   /**
    * Retrieves the chat history for a specific conversation.
    * @param conversationID - The unique ID for this chat.
    * @returns A promise that resolves to the chat history.
    */
   async getHistory(conversationID: string): Promise<Content[]> {
      // Get the history for this ID, or an empty array if it's a new chat
      const history = this.conversations.get(conversationID) || [];
      // Return a copy
      return [...history];
   }

   /**
    * Adds a new message to a specific conversation's history.
    * @param role - The role of the sender (user or model).
    * @param text - The content of the message.
    * @param conversationID - The unique ID for this chat.
    */
   async addMessage(
      role: ChatRole,
      text: string,
      conversationID: string
   ): Promise<void> {
      const message: Content = {
         role: role,
         parts: [{ text: text }],
      };

      // Get the current history, or a new array
      const history = this.conversations.get(conversationID) || [];

      // Add the new message
      history.push(message);

      // Save the updated history back to the Map
      this.conversations.set(conversationID, history);
   }

   /**
    * Clears the chat history for a specific conversation.
    * @param conversationID - The unique ID for this chat.
    */
   async clearHistory(conversationID: string): Promise<void> {
      // Just delete the entry for this conversation
      this.conversations.delete(conversationID);
   }
}

// Export a single instance (Singleton Pattern)
export const conversationRepository = new ConversationRepository();
