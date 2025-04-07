"use node";

import { v } from "convex/values";
import { query, action } from "./_generated/server";
import { AgentDispatchClient } from 'livekit-server-sdk';
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { v4 as uuidv4 } from 'uuid';

async function createExplicitDispatch(roomName: string, agentName: string , metadata: any) {
  const agentDispatchClient = new AgentDispatchClient(process.env.LIVEKIT_URL ?? "", process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);

  // create a dispatch request for an agent named "test-agent" to join "my-room"
  const dispatch = await agentDispatchClient.createDispatch(roomName, agentName);
  console.log('created dispatch', dispatch);

  const dispatches = await agentDispatchClient.listDispatch(roomName);
  console.log(`there are ${dispatches.length} dispatches in ${roomName}`);
}

import { AccessToken } from 'livekit-server-sdk';
import AgentRoom from '../components/AgentRoom';
import { createAgentRoom } from './agentroom';

const createToken = async (roomName: string, participantName: string) => {
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: participantName,
    // Token to expire after 10 minutes
    ttl: '3h',
  });
  at.addGrant({ roomJoin: true, room: roomName });

  return await at.toJwt();
};

export const createDispatch = action({
  args: { 
    metadata: v.any()
  },
  handler: async (ctx, args) => {
    const identity = await getAuthUserId(ctx);
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const roomName = uuidv4();
  
    const agentName = "Dementia_Bot";
    const dispatch = await createExplicitDispatch(roomName, agentName , args.metadata);
    const token = await createToken(roomName, agentName);
    
    // If you need to store the result in the database, call a mutation
    await ctx.runMutation(internal.agentroom.createAgentRoom, { 
      patient_id: identity,
      room_name: roomName,
      token: token
     });
  },
});