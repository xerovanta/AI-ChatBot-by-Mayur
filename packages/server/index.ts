import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import z from 'zod';
import { conversationRepository } from './repositories/conversation.repository';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
   throw new Error('❌ GEMINI_API_KEY is missing in .env file');
}

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
   conversationID: z.string().uuid(),
});

// ✅ Chat endpoint using Gemini
app.post('/api/chat', async (req: Request, res: Response) => {
   const parseResult = chatSchema.safeParse(req.body);
   if (!parseResult.success) {
      res.status(400).json(parseResult.error.format());
      return;
   }

   const { prompt, conversationID } = parseResult.data;

   try {
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

      res.json({ reply });
   } catch (error: any) {
      console.error('Gemini error:', error);
      res.status(500).json({ error: 'Something went wrong' });
   }
});

const resetSchema = z.object({
   conversationID: z.string().uuid('Invalid Conversation ID'),
});

app.post('/api/reset', async (req: Request, res: Response) => {
   const parseResult = resetSchema.safeParse(req.body);
   if (!parseResult.success) {
      res.status(400).json(parseResult.error.format());
      return;
   }

   const { conversationID } = parseResult.data;

   await conversationRepository.clearHistory(conversationID);
   res.json({ message: 'Chat history cleared' });
});

// ✅ Start the server
app.listen(port, () => {
   console.log(`🚀 Server is running on http://localhost:${port}`);
});
