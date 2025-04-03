import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
// import { useVoiceChatStore } from "@/lib/store";
import { useMutation, useQuery } from "convex/react";
import React, { useRef, useState, useEffect } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  IRtcEngine,
  RtcConnection,
  IRtcEngineEventHandler,
} from "react-native-agora";

const getPermission = async () => {
  if (Platform.OS === "android") {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
  }
};

// TODO: Replace with your actual App ID, Channel Name, and potentially fetch a token
const appId = "5f71708ae6d344bba5862e3c531eda84";
// const token = '<-- Insert token -->'; // Temporary token or fetched token
const uid = 0; // Local user UID

const useAgoraCall = () => {
  const setJoined = useMutation(api.chat.setUserJoined);

  getPermission();
  const makeCall = useMutation(api.chat.createCall);
//   const setIsInCall = useVoiceChatStore((state) => state.setIsInCall);
  const agoraEngineRef = useRef<IRtcEngine>(); // IRtcEngine instance
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState(0); // Uid of the remote user
  const [message, setMessage] = useState(""); // User prompt message


  const ongoingCall = useQuery(api.chat.getOngoingCallForUser);

  const getCurrentUser = useQuery(api.user.getCurrentUser);


  const isCurrentUserCaller = ongoingCall?.receiver_id === getCurrentUser?.id ? false : true;




  // Helper function to display messages
  const showMessage = (msg: string) => {
    setMessage(msg);
  };

  useEffect(() => {
    // Initialize Agora engine when the component mounts
    setupVoiceSDKEngine();

    // Return a cleanup function to release the engine when the component unmounts
    return () => {
      agoraEngineRef.current?.release();
    };
  }, []);

  const setupVoiceSDKEngine = async () => {
    try {
      agoraEngineRef.current = createAgoraRtcEngine();
      const agoraEngine = agoraEngineRef.current;

      if (!agoraEngine) {
        throw new Error("Failed to create Agora engine instance");
      }

      // Register event handlers
      agoraEngine.registerEventHandler({
        onJoinChannelSuccess: () => {
          showMessage("Successfully joined channel");
          setIsJoined(true);
        },
        onUserJoined: (_connection, Uid) => {
          showMessage("Remote user joined with uid " + Uid);
          setRemoteUid(Uid);
        },
        onUserOffline: (_connection, Uid) => {
          showMessage("Remote user left channel with uid " + Uid);
          setRemoteUid(0); // Reset remote user UID
        },
        onLeaveChannel: () => {
          showMessage("You left the channel");
          setIsJoined(false);
          setRemoteUid(0); // Reset remote user UID
        },
        onError: (err, msg) => {
          showMessage(`Agora Error: ${err}, ${msg}`);
        },
      });

      // Initialize the engine
      agoraEngine.initialize({
        appId: appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication, // Or LIVE_BROADCASTING
      });
      agoraEngine.enableAudio();
    } catch (e) {
      console.error(e);
      showMessage(
        `Error setting up Agora engine: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  };

  const join = async ({ channelName, callId: currentCallId }: { channelName: string, callId: Id<"onGoingCalls"> }) => {
    if (isJoined) {
      showMessage("Already joined the channel");
      return;
    }
    try {
      const agoraEngine = agoraEngineRef.current;
      if (!agoraEngine) {
        showMessage("Agora engine is not initialized");
        return;
      }

      // Set client role (Broadcaster allows publishing audio)
      // Use CLIENT_ROLE_AUDIENCE if the user should only listen
      agoraEngine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

      // Use the passed callId to mark the user as joined
      if (currentCallId) {
         setJoined({ callId: currentCallId });
      }
      // Join the channel
      // Using 0 for uid lets Agora assign a UID dynamically
      await agoraEngine.joinChannel("", channelName ?? "", uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });
      showMessage("Joining channel...");
    } catch (e) {
      console.error(e);
      showMessage(
        `Error joining channel: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  };
  const leave = () => {
    try {
      const agoraEngine = agoraEngineRef.current;
      if (!agoraEngine) {
        showMessage("Not in a call");
        return;
      }
      agoraEngine.leaveChannel();
    } catch (e) {
      console.error(e);
      showMessage(
        `Error leaving channel: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  };

  useEffect(() => {
    if(!Boolean(ongoingCall)){
        leave();
    }
  }, [ongoingCall]);

  const createCall = async (receiverId: Id<"users">) => {
    const call = await makeCall({ receiver_id: receiverId });
    if (call) {
      join({ channelName: call, callId: call });
    }
    return call;
  };

  return {
    ongoingCall,
    isJoined,
    remoteUid,
    message,
    join,
    leave,
    createCall,
    isCurrentUserCaller,
  };
};

export default useAgoraCall;
