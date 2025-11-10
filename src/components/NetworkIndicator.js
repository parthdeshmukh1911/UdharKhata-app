import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Network from "expo-network";

export default function NetworkIndicator() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const checkConnection = async () => {
      const status = await Network.getNetworkStateAsync();
      if (isMounted) setIsConnected(status.isConnected && status.isInternetReachable !== false);
    };
    checkConnection();
    const interval = setInterval(checkConnection, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <View style={{ marginRight: 10, marginTop: 2 }}>
      <Ionicons
        name={isConnected ? "wifi" : "wifi-off"}
        size={22}
        color={isConnected ? "#22c55e" : "#ef4444"}
      />
    </View>
  );
}
