import type { Request, Response } from 'express';
import { z } from 'zod';
import { chatService } from '../services/chat.service';

const chatSchema = z.object({
   prompt: z
      .string()
      .trim()
      .min(1, 'Prompt is required.')
      .max(1000, 'Prompt is too long (max 1000 characters)'),
   conversationID: z.string().uuid('Invalid Conversation ID'),
});

const resetSchema = z.object({
   conversationID: z.string().uuid('Invalid Conversation ID'),
});

export const handleChatRequest = async (req: Request, res: Response) => {
   const parseResult = chatSchema.safeParse(req.body);
   if (!parseResult.success) {
      return res.status(400).json(parseResult.error.format());
   }

   const { prompt, conversationID } = parseResult.data;

   try {
      const result = await chatService.getChatReply(prompt, conversationID);
      res.json(result);
   } catch (error: any) {
      console.error('Controller error (chat):', error);
      res.status(500).json({ error: 'Something went wrong' });
   }
};

/**
 * Handles streaming chat requests using Server-Sent Events (SSE).
 */
export const handleChatStreamRequest = async (req: Request, res: Response) => {
   try {
      const parseResult = chatSchema.safeParse(req.body);
      if (!parseResult.success) {
         return res.status(400).json(parseResult.error.format());
      }

      const { prompt, conversationID } = parseResult.data;

      // 1. Set SSE headers
      res.writeHead(200, {
         'Content-Type': 'text/event-stream',
         'Cache-Control': 'no-cache',
         Connection: 'keep-alive',
         'Access-Control-Allow-Origin': '*', // For development
      });

      // 2. Call the streaming service and loop over chunks
      for await (const chunk of chatService.getChatReplyStream(
         prompt,
         conversationID
      )) {
         // Write chunk in SSE format
         res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }

      // 3. Send a 'done' message
      res.write('data: [DONE]\n\n');
   } catch (error: any) {
      console.error('Controller error (stream):', error);
      // Can't send a JSON error response now as headers are already sent.
   } finally {
      // 4. End the response stream
      res.end();
   }
};

export const handleResetRequest = async (req: Request, res: Response) => {
   const parseResult = resetSchema.safeParse(req.body);
   if (!parseResult.success) {
      return res.status(400).json(parseResult.error.format());
   }

   const { conversationID } = parseResult.data;

   try {
      const result = await chatService.resetChat(conversationID);
      res.json(result);
   } catch (error: any) {
      console.error('Controller error (reset):', error);
      res.status(500).json({ error: 'Something went wrong' });
   }
};
