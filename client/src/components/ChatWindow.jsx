// src/components/ChatWindow.jsx
import React from 'react';
import { Box, VStack, Text } from '@chakra-ui/react';

const ChatWindow = ({ messages }) => {
  return (
    <VStack spacing={3} p={4} flex="1" overflowY="auto" bg="gray.50">
      {messages.map((message) => (
        <Box key={message.id} p={3} bg="white" borderRadius="md" boxShadow="sm" w="full">
          <Text>{message.text}</Text>
        </Box>
      ))}
    </VStack>
  );
};

export default ChatWindow;
