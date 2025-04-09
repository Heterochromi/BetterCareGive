import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
  Image,
} from "react-native";
import {
  AudioSession,
  LiveKitRoom,
  registerGlobals,
} from "@livekit/react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { IconSymbol } from "./ui/IconSymbol";

const wsURL = "wss://kitahack-29yca5d0.livekit.cloud";
registerGlobals();

export default function AgentRoom() {
  const result = useQuery(api.agentroom.getAgentRoom);
  const deleteAgentRoom = useMutation(api.agentroom.deleteAgentRoom);
  console.log(result);
  const [displayAgent, setDisplayAgent] = useState(false);

  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  useEffect(() => {
    let start = async () => {
      if (result?.token) {
        await AudioSession.startAudioSession();
      }
    };
    start();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, [result?.token]);

  const handleDisconnect = () => {
    deleteAgentRoom();
  };

  if (!result?.token) {
    return null;
  }

  return (
    <LiveKitRoom
      serverUrl={wsURL}
      connect={true}
      token={result.token}
      audio={true}
      video={false}
      onConnected={() => setDisplayAgent(true)}
      onDisconnected={() => setDisplayAgent(false)}
    >
      {displayAgent && (
        <Animated.View
          style={[
            styles.floatingView,
            { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
          ]}
          {...panResponder.panHandlers}
        >
          <IconSymbol
            size={60}
            //@ts-ignore
            name="support-agent"
            color="black"
          />
          <TouchableOpacity
            style={styles.disconnectButton}
            onPressIn={handleDisconnect}
          >
            <Text style={styles.disconnectButtonText}>Disconnect</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </LiveKitRoom>
  );
}

const styles = StyleSheet.create({
  floatingView: {
    position: "absolute",
    top: 50,
    left: 20,
    width: 120,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 10,
    zIndex: 1000,
  },
  floatingImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    backgroundColor: "#ccc",
  },
  disconnectButton: {
    backgroundColor: "red",
    paddingVertical: 8,
    borderRadius: 5,
    width: "100%",
    alignItems: "center",
    marginTop: 5,
  },
  disconnectButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
});
