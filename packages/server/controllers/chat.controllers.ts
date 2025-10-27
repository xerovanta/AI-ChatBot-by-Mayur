import type { Request, Response } from 'express';
import z from 'zod';
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
      console.error('Controller error:', error);
      res.status(500).json({ error: 'Something went wrong' });
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
      console.error('Controller error:', error);
      res.status(500).json({ error: 'Something went wrong' });
   }
};
