import React, { useEffect, useState, useRef } from "react";
import {
  gql,
  useMutation,
  useQuery,
  useSubscription,
} from "@apollo/client";
import ReactMarkdown from "react-markdown";

const CREATE_THREAD = gql`
  mutation {
    createThread
  }
`;

const SEND_MESSAGE = gql`
  mutation SendUserMessage($threadId: String!, $message: MessageInput!) {
    sendUserMessage(threadId: $threadId, message: $message)
  }
`;

const MESSAGE_SUBSCRIPTION = gql`
  subscription StreamMessages($threadId: String!) {
    streamMessages(threadId: $threadId)
  }
`;

const GET_THREAD = gql`
  query GetThread($threadId: String!) {
    getThread(threadId: $threadId) {
      id
      sender
      text
      id
    }
  }
`;

const ChatUI = ({ onDisconnect }) => {
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const [createThread] = useMutation(CREATE_THREAD);
  const [sendMessage] = useMutation(SEND_MESSAGE);

  useEffect(() => {
    const existing = localStorage.getItem("threadId");
    if (existing) {
      setThreadId(existing);
    } else {
      createThread().then((res) => {
        const newId = res.data.createThread;
        setThreadId(newId);
        localStorage.setItem("threadId", newId);
      });
    }
  }, []);

  const { data: threadData } = useQuery(GET_THREAD, {
    skip: !threadId,
    variables: { threadId },
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    if (threadData?.getThread) {
      setMessages(
        threadData.getThread.map((m) => ({
          ...m,
          isCompleted: true,
        }))
      );
    }
  }, [threadData]);

  const { data: subData } = useSubscription(MESSAGE_SUBSCRIPTION, {
    skip: !threadId,
    variables: { threadId },
  });

  useEffect(() => {
    if (subData?.streamMessages) {
      try {
        const parsed = JSON.parse(subData.streamMessages);
        
        const { message, sender = "bot", messageId, is_completed, thread_id } = parsed;
        
        if (!messageId) return;

        setMessages((prev) => {
          const index = prev.findIndex((m) => m.id === messageId);
          
          if (index !== -1) {
            const updated = [...prev];
            updated[index].text += message;
            if (is_completed) updated[index].isCompleted = true;
            return updated;
          } else {
            return [
              ...prev,
              {
                sender,
                text: message,
                id: messageId,
                isCompleted: is_completed || false,
              },
            ];
          }
        });
      } catch (e) {
        console.error("Invalid streamed message:", e);
      }
    }
  }, [subData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !threadId) return;
    sendMessage({
      variables: {
        threadId,
        message: { text: input, sender: "user" },
      },
    });
    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: input,
        isCompleted: true,
        id: `temp-${Date.now()}`,
      },
    ]);
    setInput("");
  };

  const startNewChat = () => {
    createThread().then((res) => {
      const newId = res.data.createThread;
      setThreadId(newId);
      setMessages([]);
      localStorage.setItem("threadId", newId);
    });
  };

  return (
    <div className="flex flex-col h-[90vh] max-w-xl mx-auto bg-white shadow-xl rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold text-gray-700">ChatWithMe</h2>
        <div className="flex gap-2">
          <button
            onClick={startNewChat}
            className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded"
          >
            New Chat
          </button>
          <button
            onClick={onDisconnect}
            className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
          >
            Disconnect
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 bg-gradient-to-t from-purple-50 to-blue-50 rounded p-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`relative max-w-[75%] p-3 text-sm rounded-2xl shadow ${
                msg.sender === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-gray-200 text-black rounded-bl-none"
              }`}
            >
              <ReactMarkdown>{msg.text}</ReactMarkdown>
              {!msg.isCompleted && msg.sender !== "user" && (
                <span className="ml-2 animate-pulse text-xs text-gray-500">
                  ...
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-3 flex gap-2 items-center bg-white border rounded-xl shadow px-3 py-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 text-sm focus:outline-none border-none"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || !threadId}
          className={`px-4 py-1.5 rounded-xl text-white text-sm ${
            !input.trim() || !threadId
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatUI;
