import { Router } from 'express';
import type { Request, Response } from 'express';
import {
   handleChatRequest,
   handleResetRequest,
   handleChatStreamRequest,
} from './controllers/chat.controllers';

const mainRouter = Router();

mainRouter.get('/', (req: Request, res: Response) => {
   res.send('Hello World !');
});

mainRouter.get('/api/hello', (req: Request, res: Response) => {
   res.json({ message: 'Hello World !' });
});

mainRouter.post('/api/chat', handleChatRequest);
mainRouter.post('/api/chat/stream', handleChatStreamRequest);
mainRouter.post('/api/reset', handleResetRequest);

export default mainRouter;
