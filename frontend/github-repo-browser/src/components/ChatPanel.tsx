import React, { useState } from 'react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
}

const ChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [nextId, setNextId] = useState(1);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleSendMessage = () => {
    if (inputValue.trim() === '') return;

    const userMessage: Message = {
      id: nextId,
      text: inputValue,
      sender: 'user',
    };

    const botMessage: Message = {
      id: nextId + 1,
      text: `Echo: ${inputValue}`, // Simple echo
      sender: 'bot',
    };

    setMessages([...messages, userMessage, botMessage]);
    setInputValue('');
    setNextId(nextId + 2);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // event.nativeEvent.isComposing check prevents sending on IME confirmation
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault(); // Prevent potential form submission or line break
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full p-4 border-l border-gray-300">
      <h2 className="text-lg font-semibold mb-4 flex-shrink-0">Chat</h2>
      <div className="flex-grow overflow-y-auto mb-4 pr-2 space-y-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-2 rounded-lg max-w-[80%] ${
              message.sender === 'user'
                ? 'bg-blue-500 text-white self-end ml-auto'
                : 'bg-gray-200 text-gray-800 self-start mr-auto'
            }`}
          >
            {message.text}
          </div>
        ))}
      </div>
      <div className="flex-shrink-0 flex">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="flex-grow border border-gray-300 rounded-l-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;