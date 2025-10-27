import { useEffect, useState } from "react"

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/hello')
      .then(res => res.json())
      .then(data => setMessage(data.message));
  }, []);

  return <p className="font-bold p-4 text-4xl">{message}</p>

}

export default App
 