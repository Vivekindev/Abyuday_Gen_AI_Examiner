import React, { useEffect, useState } from 'react'
import Quizpage from './Quizpage'
import { useLocation } from 'react-router-dom';


const Dashboard = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const ID = queryParams.get('TestID');




const questions = [{"questionText": "How would you handle a complex asynchronous operation that involves multiple nested callbacks in Node.js, ensuring both clarity and maintainability?", "options": ["Use traditional nested callbacks, ensuring clear indentation for readability.", "Employ the 'async/await' syntax for a cleaner, more synchronous-like approach.", "Leverage the 'Promise' API to manage asynchronous operations, potentially with 'Promise.all' for parallel execution.", "Consider using a third-party library like 'Bluebird' or 'async' to simplify asynchronous control flow."], "answer": "Employ the 'async/await' syntax for a cleaner, more synchronous-like approach.", "tag": ["Node.js", "Asynchronous Programming", "Callbacks", "Async/Await", "Promises"]}, {"questionText": "Explain the difference between 'require' and 'import' in Node.js, highlighting when you would prefer one over the other.", "options": ["'require' is synchronous, while 'import' is asynchronous, making 'import' suitable for large modules.", "'require' is the traditional way, while 'import' is the ES6 module system, offering better scope control.", "'import' allows for dynamic imports, while 'require' is static, enabling loading modules based on conditions.", "Both function similarly, but 'import' is generally preferred for its cleaner syntax and better organization."], "answer": "'require' is the traditional way, while 'import' is the ES6 module system, offering better scope control.", "tag": ["Node.js", "Modules", "Require", "Import", "ES6 Modules"]}, {"questionText": "Describe how Node.js achieves its non-blocking I/O model and its implications for performance.", "options": ["Node.js utilizes a single thread with an event loop to handle multiple requests efficiently.", "Node.js uses a thread pool to manage I/O operations, allowing concurrent processing.", "Node.js delegates I/O to the operating system, leveraging its asynchronous capabilities.", "Node.js employs a multi-threaded architecture, enabling parallel execution of I/O-bound tasks."], "answer": "Node.js utilizes a single thread with an event loop to handle multiple requests efficiently.", "tag": ["Node.js", "Non-Blocking I/O", "Event Loop", "Performance", "Concurrency"]}, {"questionText": "What are the advantages and disadvantages of using a global variable within a Node.js application?", "options": ["Advantages: Easy access, shared state; Disadvantages: Namespace collisions, difficult to manage.", "Advantages: Fast access, avoids function arguments; Disadvantages:  State management complexity, potential for race conditions.", "Advantages: Global scope, reusable across modules; Disadvantages:  Poor encapsulation, potential for unexpected side effects.", "Advantages: Simplified code, reduces boilerplate; Disadvantages: Hard to test, can lead to unintended behavior."], "answer": "Advantages: Easy access, shared state; Disadvantages: Namespace collisions, difficult to manage.", "tag": ["Node.js", "Global Variables", "State Management", "Namespace Collisions", "Side Effects"]}, {"questionText": "Explain the purpose of the 'process' object in Node.js and how it is used to interact with the runtime environment.", "options": ["Provides access to environment variables, command-line arguments, and process information.", "Handles asynchronous operations, managing callbacks and event loops.", "Manages module loading and resolution within the application.", "Provides methods for creating child processes and interacting with external commands."], "answer": "Provides access to environment variables, command-line arguments, and process information.", "tag": ["Node.js", "Process Object", "Environment Variables", "Runtime Environment", "Command-Line Arguments"]}, {"questionText": "How can you ensure the integrity and security of a Node.js application, considering aspects like data validation and authentication?", "options": ["Utilize middleware libraries for input validation and sanitization, like 'express-validator'.", "Implement robust authentication mechanisms, such as JWT (JSON Web Token) or OAuth.", "Employ a secure coding practice, avoiding common vulnerabilities like SQL injection and XSS.", "Consider using a security scanner or static analysis tools to identify potential weaknesses.", "All of the above."], "answer": "All of the above.", "tag": ["Node.js", "Security", "Data Validation", "Authentication", "Vulnerabilities", "JWT", "OAuth"]}, {"questionText": "Describe the difference between a 'buffer' and a 'stream' in Node.js, highlighting when each is appropriate.", "options": ["'Buffer' stores binary data in memory, while 'Stream' handles data chunks sequentially, ideal for large files.", "'Stream' is a high-level abstraction for handling I/O, while 'Buffer' provides low-level access to binary data.", "'Buffer' is used for network communication, while 'Stream' is used for file system operations.", "Both are similar, but 'Buffer' is faster for small amounts of data, while 'Stream' is better for larger data sets."], "answer": "'Buffer' stores binary data in memory, while 'Stream' handles data chunks sequentially, ideal for large files.", "tag": ["Node.js", "Buffers", "Streams", "Binary Data", "File Handling"]}, {"questionText": "How can you handle errors gracefully in a Node.js application, particularly within asynchronous operations?", "options": ["Utilize try-catch blocks to handle synchronous errors, and callbacks or promises for asynchronous errors.", "Use the 'domain' module to catch uncaught exceptions and prevent application crashes.", "Implement custom error handling middleware in Express to manage errors centrally.", "Leverage error logging mechanisms to track and analyze errors in the application.", "All of the above."], "answer": "All of the above.", "tag": ["Node.js", "Error Handling", "Try-Catch", "Asynchronous Errors", "Promises", "Domain", "Middleware", "Error Logging"]}, {"questionText": "Explain the role of the 'event loop' in Node.js and its interaction with asynchronous operations.", "options": ["The event loop manages the execution of tasks, including asynchronous operations, by scheduling callbacks.", "The event loop listens for I/O events and triggers corresponding callbacks when events occur.", "The event loop coordinates the communication between the main thread and worker threads for asynchronous operations.", "The event loop is responsible for creating and managing threads for executing asynchronous tasks concurrently."], "answer": "The event loop manages the execution of tasks, including asynchronous operations, by scheduling callbacks.", "tag": ["Node.js", "Event Loop", "Asynchronous Operations", "Callbacks", "Concurrency"]}, {"questionText": "Describe the advantages of using a web framework like Express.js in Node.js development.", "options": ["Provides a robust foundation for routing, middleware, and handling HTTP requests.", "Simplifies common web development tasks, like templating, session management, and static file serving.", "Offers a modular architecture, allowing for easy integration of third-party libraries.", "Improves code organization and maintainability, promoting a more structured approach.", "All of the above."], "answer": "All of the above.", "tag": ["Node.js", "Express.js", "Web Framework", "Routing", "Middleware", "HTTP Requests", "Modular Architecture"]}, {"questionText": "How can you create and manage child processes in Node.js, and when would this be beneficial?", "options": ["Use the 'child_process' module to spawn child processes, executing commands or scripts.", "Utilize 'fork' to create child processes that share the same memory space as the parent process.", "Employ the 'cluster' module to create multiple worker processes, improving scalability and resource utilization.", "All of the above."], "answer": "All of the above.", "tag": ["Node.js", "Child Processes", "Child_process Module", "Fork", "Cluster Module", "Scalability", "Resource Utilization"]}, {"questionText": "Explain the concept of 'middleware' in Node.js, particularly in the context of frameworks like Express.js.", "options": ["Middleware functions are executed in a chain, modifying the request or response before reaching the final handler.", "Middleware can perform tasks like authentication, logging, input validation, and error handling.", "Middleware allows for modularity and reusability, enabling the separation of concerns in application logic.", "Middleware provides a powerful mechanism for extending and customizing the functionality of the framework.", "All of the above."], "answer": "All of the above.", "tag": ["Node.js", "Middleware", "Express.js", "Request", "Response", "Authentication", "Logging", "Input Validation", "Error Handling"]}, {"questionText": "How can you optimize the performance of a Node.js application, considering aspects like code profiling and caching?", "options": ["Use profiling tools to identify performance bottlenecks and areas for optimization.", "Implement caching mechanisms, such as in-memory caching, to reduce database queries or expensive operations.", "Optimize database queries, using appropriate indexes and minimizing data retrieval.", "Consider using a load balancer or clustering to distribute traffic and improve scalability.", "All of the above."], "answer": "All of the above.", "tag": ["Node.js", "Performance Optimization", "Code Profiling", "Caching", "Database Optimization", "Load Balancing", "Clustering"]}, {"questionText": "Describe the different types of database connections available in Node.js, considering their pros and cons.", "options": ["Relational databases like MySQL and PostgreSQL offer structured data storage and strong querying capabilities.", "NoSQL databases like MongoDB provide flexibility and scalability for unstructured or semi-structured data.", "In-memory databases like Redis offer extremely fast data access but are not suitable for persistent storage.", "Each database type has its strengths and weaknesses, and the choice depends on the specific application requirements."], "answer": "Each database type has its strengths and weaknesses, and the choice depends on the specific application requirements.", "tag": ["Node.js", "Databases", "Relational Databases", "NoSQL Databases", "In-Memory Databases", "Data Storage"]}]


const selectedOptions = [
  "O(n)",
  "O(log n)",
  "Using a min-heap of size k",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  ""
];


  return (
    <>
      
       
      <Quizpage questions={questions} showResults={false} />
      
    </>
  )
}

export default Dashboard