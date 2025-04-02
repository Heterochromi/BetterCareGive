import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import useAgoraCall from "@/hooks/useAgoraCall";
import {useVoiceChatStore } from "@/lib/store";
import CallModal from "./modal/call-modal";

export const VoiceCalls = () => {
  const { isJoined, remoteUid, message, join, leave } = useAgoraCall();
  // Fetch the ongoing call for the current user (if they are the receiver)
  const ongoingCall = useQuery(api.chat.getOngoingCallForUser);

  const isInCall = useVoiceChatStore((state) => state.isInCall)


  const setReceiverJoined = useMutation(api.chat.setReceiverJoined);
  const endCallMutation = useMutation(api.chat.endCall);

  const handleAccept = async () => {
    if (!ongoingCall) return;
    try {
      await setReceiverJoined({ callId: ongoingCall._id });
      // Join the Agora channel after accepting
      console.log("Call accepted, attempting to join channel:", ongoingCall.channel_name);
      join(ongoingCall.channel_name);
      // TODO: Update Zustand state if needed (e.g., setIsInCall(true))
    } catch (error) {
      console.error("Failed to accept call:", error);
      // Optionally end the call record if joining fails critically
      await handleRejectOrClose();
    }
  };

  const handleRejectOrClose = async () => {
    if (!ongoingCall) return;
    try {
      await endCallMutation({ callId: ongoingCall._id });
      console.log("Call rejected/closed and ended.");
      leave(); // Ensure leaving Agora channel if somehow joined
      // TODO: Update Zustand state if needed (e.g., setIsInCall(false))
    } catch (error) {
      console.error("Failed to end call:", error);
    }
    // The modal will close automatically because ongoingCall will become null after the mutation invalidates the query
  };

  // This component currently handles the RECEIVER side based on the ongoingCall query.
  // isCurrentUserCaller is false because getOngoingCallForUser fetches calls where the user is the receiver.
  const isCurrentUserCaller = false;

  return (
    <CallModal
      visible={(!!ongoingCall && !isJoined) || isInCall} // Show modal if there's a call and we haven't joined Agora yet
      callDetails={ongoingCall}
      isCurrentUserCaller={isCurrentUserCaller}
      onAccept={handleAccept}
      onRejectOrCancel={handleRejectOrClose}
    />
  );
};

