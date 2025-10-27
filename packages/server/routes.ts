import { Router } from 'express';
import type { Request, Response } from 'express';
import {
   handleChatRequest,
   handleResetRequest,
} from './controllers/chat.controllers'; // <-- Fixed path (./ not ../)

const mainRouter = Router();

// --- Basic Routes ---
mainRouter.get('/', (req: Request, res: Response) => {
   res.send('Hello World !');
});

mainRouter.get('/api/hello', (req: Request, res: Response) => {
   res.json({ message: 'Hello World !' });
});

// --- API Routes ---
mainRouter.post('/api/chat', handleChatRequest);
mainRouter.post('/api/reset', handleResetRequest);

export default mainRouter;
