import os
import uuid
import json
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai

app = FastAPI(title="Multilingual Hotel Concierge Bot")

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_methods = ["*"],
    allow_headers = ["*"],
)

# Configure Gemini API
from dotenv import load_dotenv
load_dotenv()

# Assumes GEMINI_API_KEY is available in the environment variables
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

system_instruction = """You are a multilingual hotel concierge bot.
Automatically detect the user's language and always respond in that same language.
You can recommend transport, tours, and restaurants. Provide all prices in INR.
When the user confirms a booking,ask their basic details like name, contact number, date and time of service required. Then generate a 6-digit booking ID, the service name, the price in INR, and a confirmation message. Do not hallucinate previous bookings. Keep responses clean and concise.

If the user indicates an EMERGENCY or asks for help/police, IMMEDIATELY ask for their current location. Once they provide their location, provide them with the nearest police station to that location and emergency contact numbers (like 100 or 112 in India). Treat this with highest priority.

If the user asks for directions to a specific place or category of places (like restaurants, tourist spots, or emergency services like a police station), and you know their location (or have asked for it), you MUST append a JSON block at the very end of your response exactly like this to trigger the map UI:
---MAP_DATA---
{"origin": "User's Location", "origin_lat": "17.3850", "origin_lon": "78.4867", "destination": "Name of Destination", "dest_lat": "17.4156", "dest_lon": "78.4750", "travelMode": "DRIVING"}
---END_MAP_DATA---
Please estimate the latitude and longitude coordinates as accurately as possible for both origin and destination. Ensure they are valid numerical strings. The travelMode must be one of: DRIVING, WALKING, BICYCLING, or TRANSIT.

CRITICAL INSTRUCTION: When you have collected all details and are finally confirming the booking with the user, you MUST append a JSON block at the very end of your response exactly like this:
---BOOKING_DATA---
{"booking_id": "123456", "service": "Service Name", "price": "Price in INR", "date": "Date and Time", "name": "User Name"}
---END_BOOKING_DATA---

If you are recommending places (like restaurants, hotels, tourist spots), you MUST append a JSON block at the very end of your response exactly like this to trigger the frontend cards UI:
---PLACES_DATA---
[
  {"name": "Place Name 1", "description": "Short description of the place", "rating": "4.5", "address": "Address 1", "type": "Restaurant"},
  {"name": "Place Name 2", "description": "Short description", "rating": "4.2", "address": "Address 2", "type": "Tourist Spot"}
]
---END_PLACES_DATA---
"""

# Initialize the generative model
model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    system_instruction=system_instruction
)

# In-memory dictionary to store chat sessions (No Vector DB, No RAG)
chat_sessions = {}

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    session_id = request.session_id or str(uuid.uuid4())
    
    # Initialize a new chat session if it doesn't exist
    if session_id not in chat_sessions:
        chat_sessions[session_id] = model.start_chat()
        
    chat = chat_sessions[session_id]
    
    try:
        # Send user message and get response
        response = chat.send_message(request.message)
        reply = response.text
        
        booking_data = None
        map_data = None
        
        # Extract booking data if present
        booking_pattern = r"---BOOKING_DATA---\s*(\{.*?\})\s*---END_BOOKING_DATA---"
        match_booking = re.search(booking_pattern, reply, re.DOTALL)
        if match_booking:
            try:
                booking_data = json.loads(match_booking.group(1))
                # Remove the block from the reply text
                reply = re.sub(booking_pattern, "", reply, flags=re.DOTALL).strip()
            except json.JSONDecodeError:
                pass
                
        # Extract map data if present
        map_pattern = r"---MAP_DATA---\s*(\{.*?\})\s*---END_MAP_DATA---"
        match_map = re.search(map_pattern, reply, re.DOTALL)
        if match_map:
            try:
                map_data = json.loads(match_map.group(1))
                reply = re.sub(map_pattern, "", reply, flags=re.DOTALL).strip()
            except json.JSONDecodeError:
                pass
                
        places_data = []
        # Extract places data if present
        places_pattern = r"---PLACES_DATA---\s*(\[.*?\])\s*---END_PLACES_DATA---"
        match_places = re.search(places_pattern, reply, re.DOTALL)
        if match_places:
            try:
                places_data = json.loads(match_places.group(1))
                reply = re.sub(places_pattern, "", reply, flags=re.DOTALL).strip()
            except json.JSONDecodeError:
                pass
                
    except Exception as e:
        reply = f"Error processing request: {str(e)}"
        
    return {
        "reply": reply, 
        "session_id": session_id, 
        "booking": booking_data, 
        "map_data": map_data,
        "places_data": places_data
    }
