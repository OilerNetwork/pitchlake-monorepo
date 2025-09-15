import { useEffect, useRef, useState } from "react";

type wsResponseType = {
  vaultAddresses: string[];
};
const useWebSocketHome = () => {
  const [vaults, setVaults] = useState<string[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      ws.current = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/subscribeHome`,
      );

      ws.current.onopen = () => {
        console.log("WebSocket connection established");
        // Optionally, send a message to the server
      };

      ws.current.onmessage = (event) => {
        console.log("Message from server:", event.data);
        const wsResponse: wsResponseType = JSON.parse(event.data);
        setVaults(wsResponse.vaultAddresses);
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.current.onclose = () => {
        console.log("WebSocket connection closed");
      };
    }
    // Cleanup function to close the WebSocket connection when the component unmounts
    return () => {
      ws.current?.close();
    };
  }, [isLoaded]);
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return {
    vaults: vaults,
  };
};

export default useWebSocketHome;

