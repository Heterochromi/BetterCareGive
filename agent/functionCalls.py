import aiohttp
from typing import Annotated
from livekit.agents import llm
from convex import ConvexClient
from dotenv import load_dotenv
import os

# Get the directory where functionCalls.py resides
script_dir = os.path.dirname(os.path.abspath(__file__))
# Construct the path to .env.local relative to the script directory
dotenv_path = os.path.join(script_dir, ".env.local")
load_dotenv(dotenv_path=dotenv_path)

private_convex_key = os.getenv("private_convex_key")

print(private_convex_key)

client = ConvexClient(os.getenv("CONVEX_URL"))


# first define a class that inherits from llm.FunctionContext
class AssistantFnc(llm.FunctionContext):
    def __init__(self, user_id: str):
        super().__init__() 
        self.user_id = user_id
    @llm.ai_callable()
    async def get_user_schedule(self):
        """Retrieves the user's current schedule from the database """
        print(f"Getting schedule for user: {self.user_id}") # Example usage
        # Add implementation for getting location here...
        events = client.query("agentroom:getPatientSchedule", {"patient_id": self.user_id, "key": private_convex_key})

        print(events)
        return f"schedule in JSON format is {events}"
        pass # Placeholder

