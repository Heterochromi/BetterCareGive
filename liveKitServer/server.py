import os
import asyncio
import logging
from datetime import datetime
from typing import List, Optional # Add typing imports

from livekit import api
# Note: llm types might be slightly different, adjust if needed based on livekit-agents version
from livekit.agents import JobContext, WorkerOptions, llm
# Ensure VoiceAssistant and other necessary components are imported correctly
from livekit.agents.voice_assistant import VoiceAssistant
# Import google plugin, but NOT mem0 plugin
from livekit.plugins import google
# Import the actual Mem0 client SDK
from mem0 import Mem0

from flask import Flask, request, jsonify
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)

# Load environment variables from .env file
load_dotenv()

# Get LiveKit and Mem0 credentials
livekit_url = os.getenv('LIVEKIT_URL', 'http://localhost:7880') # Default if not set
api_key = os.getenv('LIVEKIT_API_KEY')
api_secret = os.getenv('LIVEKIT_API_SECRET')
mem0_api_key = os.getenv('MEM0_API_KEY')

if not api_key or not api_secret:
    raise ValueError("LIVEKIT_API_KEY or LIVEKIT_API_SECRET not found in .env file.")

if not mem0_api_key:
    raise ValueError("MEM0_API_KEY not found in .env file.")


# --- Flask App Setup (Modified for Async and Agent) ---
app = Flask(__name__)

# Keep the original token generation endpoint
@app.route('/getToken', methods=['GET'])
async def getToken():
    # Allow specifying identity and name via query parameters for flexibility
    identity = request.args.get('identity', 'default-identity')
    name = request.args.get('name', 'Agent User')
    room_name = request.args.get('room', 'my-agent-room') # Get room name from request

    token = api.AccessToken(api_key, api_secret) \
        .with_identity(identity) \
        .with_name(name) \
        .with_grants(api.VideoGrants(
            room_join=True,
            room=room_name, # Use the room name from the request
            can_publish=True,
            can_subscribe=True,
            # Allow agent framework to work
            hidden=False,
            recorder=False
        ))
    return jsonify(jwt=token.to_jwt()) # Return as JSON


# --- LiveKit Agent Setup ---

async def get_current_time() -> str:
    """Gets the current time in ISO format."""
    now = datetime.now()
    return now.isoformat()


class Mem0ChatHistory:
    """
    Manages chat history using the Mem0 SDK, conforming to the expected
    interface for VoiceAssistant's chat_history parameter.
    """
    def __init__(self, mem0_client: Mem0, agent_id: str):
        self._mem0 = mem0_client
        # Unique identifier for this agent's memory stream in Mem0
        self._agent_id = agent_id
        # Optional: Consider adding user_id if you want per-user memory within an agent
        # self._user_id = user_id
        logging.info(f"Mem0ChatHistory initialized for agent_id: {self._agent_id}")

    async def add_message(self, message: llm.ChatMessage):
        """Adds a message to the Mem0 memory."""
        # Map role from llm.ChatRole enum to string expected by Mem0
        # (Assuming Mem0 expects 'user', 'assistant', 'tool', etc.)
        role = message.role.value # e.g., 'user', 'assistant', 'tool'
        content = message.text

        if not content: # Don't add empty messages
            logging.debug(f"Skipping empty message for role {role}")
            return

        try:
            # Use agent_id to associate memory with this specific agent instance/room
            # Add user_id here if tracking per-user memory:
            # await self._mem0.add(data=content, agent_id=self._agent_id, user_id=self._user_id, role=role)
            logging.debug(f"Adding to Mem0 (agent: {self._agent_id}): Role={role}, Content='{content[:50]}...'")
            # Using await assuming Mem0 SDK's add method is async
            await self._mem0.add(data=content, agent_id=self._agent_id, role=role)
            logging.debug("Message added to Mem0 successfully.")
        except Exception as e:
            # Log detailed error, including stack trace if possible
            logging.error(f"Failed to add message to Mem0 for agent {self._agent_id}: {e}", exc_info=True)

    @property
    async def messages(self) -> List[llm.ChatMessage]:
        """Retrieves message history from Mem0 and formats it for the LLM."""
        history_messages = []
        try:
            # Retrieve history for the agent_id
            # Add user_id filter if needed: user_id=self._user_id
            logging.debug(f"Retrieving history from Mem0 for agent: {self._agent_id}")
            # Using await assuming Mem0 SDK's history method is async
            history = await self._mem0.history(agent_id=self._agent_id)
            logging.debug(f"Retrieved {len(history)} items from Mem0 history for agent: {self._agent_id}.")

            # Convert Mem0 history format (list of dicts likely) to llm.ChatMessage
            for mem in history:
                # Adjust keys based on actual Mem0 history response format
                role_str = mem.get("role", "user").lower() # Default role if missing
                content = mem.get("content", "")

                if not content: # Skip empty messages from history
                    continue

                # Map role string back to llm.ChatRole enum
                try:
                    role_enum = llm.ChatRole(role_str)
                except ValueError:
                    logging.warning(f"Unknown role '{role_str}' in Mem0 history for agent {self._agent_id}, defaulting to USER.")
                    role_enum = llm.ChatRole.USER

                # Handle potential Tool calls/results if stored differently
                # Depending on how VoiceAssistant/LLM expects tool history,
                # you might need specific formatting here.
                # For now, adding as simple text.
                history_messages.append(llm.ChatMessage(role=role_enum, text=content))

            logging.debug(f"Formatted {len(history_messages)} messages for LLM from agent {self._agent_id}.")

        except Exception as e:
            logging.error(f"Failed to retrieve history from Mem0 for agent {self._agent_id}: {e}", exc_info=True)
            # Return empty list on failure to avoid breaking the LLM call
            return []

        # Return the formatted history
        # The VoiceAssistant will likely combine this with the current turn's messages
        return history_messages


async def agent_entrypoint(ctx: JobContext):
    """
    Entrypoint for the LiveKit Agent.
    This function is called when the agent connects to a room.
    """
    logging.info("Agent connected to room: %s", ctx.room.name)

    # Initialize Mem0 plugin
    # Store memories associated with the room name
    mem0_plugin = Mem0(api_key=mem0_api_key)

    # Initialize Google LLM Plugin (using Vertex AI Gemini)
    # Ensure GOOGLE_APPLICATION_CREDENTIALS is set or ADC is configured
    google_llm = google.LLM(model="gemini-2.0-flash") # Or choose another Gemini model

    # Initialize Google STT and TTS Plugins
    google_stt = google.STT()
    google_tts = google.TTS(voice="en-US-Standard-C") # Choose a voice

    # Create the VoiceAssistant
    assistant = VoiceAssistant(
        llm=google_llm,
        stt=google_stt,
        tts=google_tts,
        chat_history=Mem0ChatHistory(mem0_client=mem0_plugin, agent_id=f"agent-{ctx.room.name}"),
        # Add system prompt, temperature, etc. here if needed
        # prompt="You are a helpful voice assistant.",
        # temperature=0.7,
    )

    # Add Mem0 plugin to store conversation turns automatically
    assistant.add_plugin(mem0_plugin)

    # Start the assistant
    assistant.start(ctx.room)

    await asyncio.sleep(1) # Keep the entrypoint running briefly

    # Optional: Add logic here to handle specific events from ctx.room if needed
    # For example, listen for participant disconnections to clean up resources

    logging.info("Agent started for room: %s", ctx.room.name)
    # The assistant runs in the background, keep the entrypoint alive
    # Or manage its lifecycle based on room events
    await assistant.join() # Wait until the assistant is done (e.g., room closed)
    logging.info("Agent finished for room: %s", ctx.room.name)


# --- Worker and Server Execution ---

async def run_agent_worker():
    """Runs the LiveKit Agent Worker."""
    worker_opts = WorkerOptions(
        entrypoint=agent_entrypoint,
        url=livekit_url,
        api_key=api_key,
        api_secret=api_secret,
    )
    worker = api.AgentWorker(worker_opts)
    logging.info("Agent Worker started.")
    await worker.run()


async def run_flask_app():
    """Runs the Flask app using Uvicorn."""
    # We need to import uvicorn here to avoid potential top-level await issues
    # if this file is imported elsewhere.
    import uvicorn
    config = uvicorn.Config(app, host="0.0.0.0", port=5000, log_level="info")
    server = uvicorn.Server(config)
    logging.info("Flask server starting on http://0.0.0.0:5000")
    await server.serve()


async def main():
    """Runs both the Flask app and the Agent Worker concurrently."""
    # Run Flask and Agent Worker concurrently
    await asyncio.gather(
        run_flask_app(),
        run_agent_worker()
    )


if __name__ == '__main__':
    # Use asyncio.run to start the main async function
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Shutting down...")

# Remove the old synchronous app.run()
# if __name__ == '__main__':
#     app.run(debug=True) # only for development. remove debug=true for production.