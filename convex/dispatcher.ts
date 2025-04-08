"use node";

import { v } from "convex/values";
import { query, action, internalQuery } from "./_generated/server";
import { AgentDispatchClient } from 'livekit-server-sdk';
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import { v4 as uuidv4 } from 'uuid';
import { Id } from "./_generated/dataModel";
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

const createToken = async (roomName: string, participantName: string , identity: Id<"users"> , patient_name: string) => {
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: participantName,
    attributes: {
     myUserID: identity,
     patient_name: patient_name
    },
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

    const patient = await ctx.runQuery(internal.agentroom.getPatientInfo, {
      patient_id: identity
    });
  
    const agentName = "Dementia_Bot";
    const dispatch = await createExplicitDispatch(roomName, agentName , args.metadata);
    const token = await createToken(roomName, agentName , identity , patient?.name ?? "");
    
    // If you need to store the result in the database, call a mutation
    await ctx.runMutation(internal.agentroom.createAgentRoom, { 
      patient_id: identity,
      room_name: roomName,
      token: token
     });
  },
});