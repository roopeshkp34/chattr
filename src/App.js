import React, { useState, useEffect } from "react";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  split,
  HttpLink,
} from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";
import ChatUI from "./ChatUI";

const App = () => {
  const [baseUrl, setBaseUrl] = useState("");
  const [client, setClient] = useState(null);

  useEffect(() => {
    const savedUrl = localStorage.getItem("graphqlBaseUrl");
    if (savedUrl) {
      setBaseUrl(savedUrl);
      initializeClient(savedUrl);
    }
  }, []);

  const initializeClient = (url) => {
    const cleanedUrl = url.replace(/\/$/, "");
    const wsLink = new GraphQLWsLink(
      createClient({ url: cleanedUrl.replace(/^http/, "ws") })
    );

    const httpLink = new HttpLink({ uri: cleanedUrl });

    const splitLink = split(
      ({ query }) => {
        const def = getMainDefinition(query);
        return def.kind === "OperationDefinition" && def.operation === "subscription";
      },
      wsLink,
      httpLink
    );

    const newClient = new ApolloClient({
      link: splitLink,
      cache: new InMemoryCache(),
    });

    setClient(newClient);
    localStorage.setItem("graphqlBaseUrl", url);
  };

  const handleConnect = () => {
    initializeClient(baseUrl);
  };

  const handleDisconnect = () => {
    setClient(null);
    localStorage.removeItem("graphqlBaseUrl");
    localStorage.removeItem("threadId");
  };

  return (
    <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-200 min-h-screen">
      {!client ? (
        <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-bold mb-2 text-center">Enter Backend Endpoint</h2>
          <input
            type="text"
            placeholder="http://localhost:4000/graphql"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="border p-2 w-full rounded mb-3"
          />
          <button
            onClick={handleConnect}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Connect
          </button>
        </div>
      ) : (
        <ApolloProvider client={client}>
          <ChatUI onDisconnect={handleDisconnect} />
        </ApolloProvider>
      )}
    </div>
  );
};

export default App;
