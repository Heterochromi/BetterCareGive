import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import useAgoraCall from "@/hooks/useAgoraCall";
// import {useVoiceChatStore } from "@/lib/store";
import CallModal from "./modal/Call-modal";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/convex/user";
export const VoiceCalls = () => {
  const {ongoingCall ,isCurrentUserCaller,isJoined, remoteUid, message, join, leave } = useAgoraCall();



  const endCallMutation = useMutation(api.chat.endCall);

  const handleAccept = async () => {
    if (!ongoingCall) return;
    try {
      join({ channelName: ongoingCall.channel_name, callId: ongoingCall._id });
    } catch (error) {
      await handleRejectOrClose();
    }
  };

  const handleRejectOrClose = async () => {
    if (!ongoingCall) return;
    try {
      await endCallMutation({ callId: ongoingCall._id });
      leave(); 
    } catch (error) {
      console.error("Failed to end call:", error);
    }
  };



  return (
    <CallModal
      visible={!!ongoingCall}
      callDetails={ongoingCall}
      isCurrentUserCaller={isCurrentUserCaller}
      onAccept={handleAccept}
      onRejectOrCancel={handleRejectOrClose}
    />
  );
};

