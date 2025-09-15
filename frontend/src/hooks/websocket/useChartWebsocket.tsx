import { useEffect, useRef, useState } from "react";

// Add type definitions
interface Block {
  timestamp: number;
  blockNumber?: number;
  baseFee?: number;
  twap?: number;
}

const useWebsocketChart = ({
  lowerTimestamp,
  upperTimestamp,
  roundDuration,
}: {
  lowerTimestamp: number;
  upperTimestamp: number;
  roundDuration: number;
}) => {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const lowerTimestampRef = useRef(lowerTimestamp);
  const upperTimestampRef = useRef(upperTimestamp);
  const [confirmedGasData, setConfirmedGasData] = useState<Block[]>([]);
  const [unconfirmedGasData, setUnconfirmedGasData] = useState<Block[]>([]);


  const handleUnconfirmedBlocks = (blockdata: Block[]) => {

    console.log("blockdataUnconf",blockdata,lowerTimestampRef.current,upperTimestampRef.current)
    const blocks = blockdata.filter((block: Block) => {
      return block.timestamp >= lowerTimestampRef.current && block.timestamp <= upperTimestampRef.current
    })
    setUnconfirmedGasData((prevData) => {
      if (!prevData || prevData.length === 0) {
        return blocks || [];
      }
      const newArray = [...prevData, ...blocks].sort(
        (a, b) => a.timestamp - b.timestamp
      );
      return newArray;
    });
  }

  const handleConfirmedBlocks = (blockdata: Block[]) => {
    // Filter blocks within timestamp range
    const usableData = blockdata.filter((block: Block) => 
      block.timestamp >= lowerTimestampRef.current && 
      block.timestamp <= upperTimestampRef.current
    );

    // Create a Set of block numbers that are now confirmed
    const confirmedBlockNumbers = new Set(
      usableData
        .map(block => block.blockNumber)
        .filter((num): num is number => num !== undefined)
    );

    // Update both states in a single batch
    setConfirmedGasData(prevConfirmed => {
      // Create a map of existing confirmed blocks
      const blocksMap = new Map(
        prevConfirmed?.filter(block => block.blockNumber)
          .map(block => [block.blockNumber, block])
      );

    
      // Add new confirmed blocks
      usableData?.forEach(block => {
        if (block.blockNumber) {
          blocksMap.set(block.blockNumber, block);
        }
      });

      // Convert map back to sorted array
      return Array.from(blocksMap.values())
        .sort((a, b) => a.timestamp - b.timestamp);
    });

    // Remove confirmed blocks from unconfirmed data
    setUnconfirmedGasData(prevUnconfirmed => 
      prevUnconfirmed
        .filter(block => 
          !block.blockNumber || !confirmedBlockNumbers.has(block.blockNumber)
        )
        .sort((a, b) => a.timestamp - b.timestamp)
    );
  }

  useEffect(() => {
    setIsLoaded(true)
  },[])
  useEffect(() => {
    
    if(!isLoaded) return
      ws.current = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/subscribeGas`
      );

      ws.current.onopen = () => {
       setIsConnected(true)
      };

      ws.current.onmessage = (event) => {
        console.log("Message from server:", event.data);
        const wsResponse: any = JSON.parse(event.data);
        console.log("Websocket response:", wsResponse);
        if (typeof wsResponse.type === "undefined") {
          setConfirmedGasData(wsResponse.confirmedBlocks);
          setUnconfirmedGasData(wsResponse.unconfirmedBlocks);
        } else if (wsResponse.type === "confirmedBlocks") {
          
          const data = wsResponse.blocks as Block[]
          handleConfirmedBlocks(data)
        } else if (wsResponse.type === "unconfirmedBlocks") {
          const data = wsResponse.blocks as Block[]
          handleUnconfirmedBlocks(data)
        }
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.current.onclose = () => {
        console.log("WebSocket connection closed");
      };
    
    // Cleanup function to close the WebSocket connection when the component unmounts
    return () => {
      ws.current?.close(1000,"Closing connection");
    };
  }, [isLoaded]);

  useEffect(() => {
    lowerTimestampRef.current = lowerTimestamp
    upperTimestampRef.current = upperTimestamp
    if (!lowerTimestamp || !upperTimestamp || !roundDuration) {
      return;
    }
    if (!isConnected) {
      return;
    }
    ws.current?.send(
      JSON.stringify({
        startTimestamp: lowerTimestamp,
        endTimestamp: upperTimestamp,
        roundDuration: roundDuration,
      })
    );
  }, [lowerTimestamp, upperTimestamp, roundDuration, isConnected]);

  console.log("confirmedGasData", confirmedGasData);
  console.log("unconfirmedGasData", unconfirmedGasData);
  return {
    confirmedGasData: confirmedGasData,
    unconfirmedGasData: unconfirmedGasData,
  };
};

export default useWebsocketChart;
