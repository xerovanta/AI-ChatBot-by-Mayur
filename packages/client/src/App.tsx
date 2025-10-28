// Using alias path again now that config should be correct
import { ChatBot } from '@/components/ui/ChatBot';

function App() {
   return (
      // Reverted to a simpler background to match the ChatBot style
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
         <ChatBot />
      </div>
   );
}

export default App;
