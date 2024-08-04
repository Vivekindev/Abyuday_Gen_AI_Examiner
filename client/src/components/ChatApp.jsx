// src/components/ChatApp.jsx
import React, { useState } from 'react';
import { Box, Flex, Heading } from '@chakra-ui/react';
import ChatWindow from './ChatWindow';
import ChatInput from './ChatInput';
import { v4 as uuidv4 } from 'uuid';

const ChatApp = () => {
  const [messages, setMessages] = useState([]);

  const addMessage = (message) => {
    const newMessage = { id: uuidv4(), text: message };
    setMessages([...messages, newMessage]);
  };

  return (
    <Flex direction="column" h="100vh" w="400px" mx="auto" border="1px solid #ccc" borderRadius="md">
      <Box bg="teal.500" p="4" color="white">
        <Heading size="md">Chat Application</Heading>
      </Box>
      <ChatWindow messages={messages} />
      <ChatInput addMessage={addMessage} />
    </Flex>
  );
};

export default ChatApp;
