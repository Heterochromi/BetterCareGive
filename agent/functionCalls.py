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

    # the llm.ai_callable decorator marks this function as a tool available to the LLM
    # by default, it'll use the docstring as the function's description
    @llm.ai_callable()
    async def get_weather(
        self,
        # by using the Annotated type, arg description and type are available to the LLM
        location: Annotated[
            str, llm.TypeInfo(description="The location to get the weather for")
        ],
    ):
        """Called when the user asks about the weather. This function will return the weather for the given location."""
        print(f"Fetching weather for user: {self.user_id}") # Example usage
        url = f"https://wttr.in/{location}?format=%C+%t"
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    weather_data = await response.text()
                    return f"The weather in {location} is {weather_data}."
                else:
                    raise f"Failed to get weather data, status code: {response.status}"
    @llm.ai_callable()
    async def get_user_schedule(self):
        """Retrieves the user's current schedule from the database """
        print(f"Getting schedule for user: {self.user_id}") # Example usage
        # Add implementation for getting location here...
        events = client.query("agentroom:getPatientSchedule", {"patient_id": self.user_id, "key": private_convex_key})

        print(events)
        return f"schedule in JSON format is {events}"
        pass # Placeholder

# You'll need to provide the user_id when creating the instance now
# fnc_ctx = AssistantFnc(user_id="some_user_id_from_backend")