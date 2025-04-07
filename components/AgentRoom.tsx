import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import {
  AudioSession,
  LiveKitRoom,
  registerGlobals,
} from '@livekit/react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

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
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
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
    {displayAgent && <Animated.View
      style={[
        styles.floatingView,
        { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
      ]}
      {...panResponder.panHandlers}
    >
      <Text style={styles.statusText}>Agent Connected</Text>
      <TouchableOpacity style={styles.disconnectButton} onPressIn={handleDisconnect}>
        <Text style={styles.disconnectButtonText}>Disconnect</Text>
      </TouchableOpacity>
    </Animated.View>}
  </LiveKitRoom>
  );
}

const styles = StyleSheet.create({
  floatingView: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 180,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 10,
    zIndex: 1000,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  disconnectButton: {
    backgroundColor: 'red',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});