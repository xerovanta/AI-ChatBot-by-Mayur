import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import z from 'zod';
import { chatService } from './services/chat.service';

dotenv.config();

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
   res.send('Hello World !');
});

app.get('/api/hello', (req: Request, res: Response) => {
   res.json({ message: 'Hello World !' });
});

const chatSchema = z.object({
   prompt: z
      .string()
      .trim()
      .min(1, 'Prompt is required.')
      .max(1000, 'Prompt is too long (max 1000 characters)'),
   conversationID: z.string().uuid('Invalid Conversation ID'),
});

// ✅ Chat endpoint - now clean and simple
app.post('/api/chat', async (req: Request, res: Response) => {
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
});

const resetSchema = z.object({
   conversationID: z.string().uuid('Invalid Conversation ID'),
});

app.post('/api/reset', async (req: Request, res: Response) => {
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
});

// ✅ Start the server
app.listen(port, () => {
   console.log(`🚀 Server is running on http://localhost:${port}`);
});
