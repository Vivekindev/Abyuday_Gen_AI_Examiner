// src/components/ChatInput.jsx
import React, { useState } from 'react';
import { Input, Button, HStack } from '@chakra-ui/react';

const ChatInput = ({ addMessage }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      addMessage(input);
      setInput('');
    }
  };

  return (
    <HStack as="form" onSubmit={handleSubmit} p={4} borderTop="1px solid #ccc">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message..."
        flex="1"
      />
      <Button type="submit" colorScheme="teal">
        Send
      </Button>
    </HStack>
  );
};

export default ChatInput;
