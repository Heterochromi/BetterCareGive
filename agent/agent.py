import logging

from dotenv import load_dotenv
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    llm,
    metrics,
    JobRequest,
)
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import google, turn_detector, silero , cartesia
from mem0 import AsyncMemoryClient

load_dotenv(dotenv_path=".env.local")
logger = logging.getLogger("voice-agent")

mem0 = AsyncMemoryClient()

async def entrypoint(ctx: JobContext):
    initial_ctx = llm.ChatContext().append(
        role="system",
        text=(
           'You are a voice assistant desined to help patients with dementia to go on with their daily lives, Your interface with users will be voice, so you should only respond with words and not with any other characters such as *, #, etc.'
        ),
    )

    logger.info(f"connecting to room {ctx.room.name} with agent name")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()
    user_attributes = participant.attributes
    my_user_id = user_attributes.get("myUserID")
    async def _enrich_with_memory(agent: VoicePipelineAgent, chat_ctx: llm.ChatContext):
        """Add memories and Augment chat context with relevant memories"""
        if not chat_ctx.messages:
            return
        
        # Store user message in Mem0
        user_msg = chat_ctx.messages[-1]
        await mem0.add(
            [{"role": "user", "content": user_msg.content}], 
            user_id=my_user_id
        )
        
        # Search for relevant memories
        results = await mem0.search(
            user_msg.content, 
            user_id=my_user_id,
        )
        
        # Augment context with retrieved memories
        if results:
            memories = ' '.join([result["memory"] for result in results])
            logger.info(f"Enriching with memory: {memories}")
            
            rag_msg = llm.ChatMessage.create(
                text=f"Relevant Memory: {memories}\n",
                role="assistant",
            )
            
            # Modify chat context with retrieved memories
            chat_ctx.messages[-1] = rag_msg
            chat_ctx.messages.append(user_msg)
    logger.info(f"starting voice assistant for participant {participant.identity}")

    agent = VoicePipelineAgent(
        stt=google.STT(),
        llm=google.LLM(model="gemini-2.0-flash-001"),# Using Gemini 1.5 Flash
        tts=google.TTS(),
        vad=silero.VAD.load(),
        turn_detector=turn_detector.EOUModel(),
        min_endpointing_delay=0.5,
        max_endpointing_delay=5.0,
        chat_ctx=initial_ctx,
        before_llm_cb=_enrich_with_memory,
    )

    usage_collector = metrics.UsageCollector()

    @agent.on("metrics_collected")
    def on_metrics_collected(agent_metrics: metrics.AgentMetrics):
        metrics.log_metrics(agent_metrics)
        usage_collector.collect(agent_metrics)

    agent.start(ctx.room, participant)


    # The agent should be polite and greet the user when it joins :)
    await agent.say("Hey, how can I help you today?", allow_interruptions=True)


async def request_fnc(req: JobRequest):
    logging.info("received agent request - accepting")
    await req.accept(
        name="Dementia_Bot",
        # Set the unique identity for the agent in this room
        identity=f"agent-assistant-{req.job.id}", # Example: Use job ID for uniqueness
        # metadata= ... # Optional metadata
    )


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            request_fnc=request_fnc, # Pass your request handler here
        ),
    )
