import React, { useRef, useState, useEffect } from 'react';
import { Platform ,PermissionsAndroid} from 'react-native';
import {
    createAgoraRtcEngine,
    ChannelProfileType,
    ClientRoleType,
    IRtcEngine,
    RtcConnection,
    IRtcEngineEventHandler,
} from 'react-native-agora';

const getPermission = async () => {
    if (Platform.OS === 'android') {
        await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
    }
};

// TODO: Replace with your actual App ID, Channel Name, and potentially fetch a token
const appId = '5f71708ae6d344bba5862e3c531eda84';
const channelName = 'test1';
// const token = '<-- Insert token -->'; // Temporary token or fetched token
const uid = 0; // Local user UID

const useAgoraCall = () => {
    getPermission();
    const agoraEngineRef = useRef<IRtcEngine>(); // IRtcEngine instance
    const [isJoined, setIsJoined] = useState(false); // Whether the local user has joined the channel
    const [remoteUid, setRemoteUid] = useState(0); // Uid of the remote user
    const [message, setMessage] = useState(''); // User prompt message

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
    }, []); // Empty dependency array ensures this runs only once on mount

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
                    showMessage('Successfully joined channel ' + channelName);
                    setIsJoined(true);
                },
                onUserJoined: (_connection, Uid) => {
                    showMessage('Remote user joined with uid ' + Uid);
                    setRemoteUid(Uid);
                },
                onUserOffline: (_connection, Uid) => {
                    showMessage('Remote user left channel with uid ' + Uid);
                    setRemoteUid(0); // Reset remote user UID
                },
                onLeaveChannel: () => {
                    showMessage('You left the channel');
                    setIsJoined(false);
                    setRemoteUid(0); // Reset remote user UID
                },
                onError: (err, msg) => {
                     showMessage(`Agora Error: ${err}, ${msg}`);
                }
            });

            // Initialize the engine
            agoraEngine.initialize({
                appId: appId,
                // Optional: Set channel profile, audio scenario, etc.
                 channelProfile: ChannelProfileType.ChannelProfileCommunication, // Or LIVE_BROADCASTING
            });

             // Enable the audio module (seems necessary based on some examples, though not explicit in the quickstart)
            agoraEngine.enableAudio();

        } catch (e) {
            console.error(e);
             showMessage(`Error setting up Agora engine: ${e instanceof Error ? e.message : String(e)}`);
        }
    };

    const join = async () => {
        if (isJoined) {
            showMessage('Already joined the channel');
            return;
        }
        try {
            const agoraEngine = agoraEngineRef.current;
             if (!agoraEngine) {
                 showMessage('Agora engine is not initialized');
                 return;
            }

            // Set client role (Broadcaster allows publishing audio)
            // Use CLIENT_ROLE_AUDIENCE if the user should only listen
             agoraEngine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

            // Join the channel
            // Using 0 for uid lets Agora assign a UID dynamically
            await agoraEngine.joinChannel("", channelName, uid, {
                clientRoleType: ClientRoleType.ClientRoleBroadcaster,
            });
            showMessage('Joining channel...');

        } catch (e) {
            console.error(e);
             showMessage(`Error joining channel: ${e instanceof Error ? e.message : String(e)}`);
        }
    };

    const leave = () => {
        try {
            const agoraEngine = agoraEngineRef.current;
            if (!agoraEngine) {
                 showMessage('Agora engine is not initialized');
                 return;
            }
            agoraEngine.leaveChannel();
            // State updates (isJoined, remoteUid) are handled by the onLeaveChannel event handler
        } catch (e) {
            console.error(e);
             showMessage(`Error leaving channel: ${e instanceof Error ? e.message : String(e)}`);
        }
    };

    return {
        isJoined,
        remoteUid,
        message,
        join,
        leave,
    };
};

export default useAgoraCall;
