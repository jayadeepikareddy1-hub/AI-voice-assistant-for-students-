from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time
import os
import base64
from io import BytesIO
from PIL import Image
import google.generativeai as genai
from dotenv import load_dotenv
import asyncio
import edge_tts
import uuid
from fastapi.staticfiles import StaticFiles

# Load environment variables
load_dotenv()

# Configure Gemini AI
gemini_model = None
api_key = os.getenv("GEMINI_API_KEY")
if api_key and api_key != "your_gemini_api_key_here":
    try:
        genai.configure(api_key=api_key)
        # Instantiate the model
        gemini_model = genai.GenerativeModel('gemini-flash-latest')
    except Exception as e:
        print(f"Error initializing Gemini: {e}")

app = FastAPI(title="AI Voice Assistant API")

# Add CORS middleware to allow the React frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("audio", exist_ok=True)
app.mount("/audio", StaticFiles(directory="audio"), name="audio")

class Attachment(BaseModel):
    name: str
    type: str
    data: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    language: str = "en"
    gender: str = "Female"
    is_stress_buster: bool = False
    attachments: list[Attachment] = []
    history: list[ChatMessage] = []
    user_name: str = ""

class ChatResponse(BaseModel):
    response: str
    audio_url: str = ""
    
@app.get("/")
def read_root():
    return {"status": "AI Voice Assistant Backend is running"}

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    user_message = request.message.strip()
    lang = request.language.strip()
    
    # Map the requested language abbreviation to a full language name for the LLM
    lang_map = {
        "en": "English",
        "te": "Telugu",
        "hi": "Hindi",
        "ta": "Tamil"
    }
    
    # Safely extract just the language code (e.g. 'te' from 'te-IN')
    lang_code = lang.split('-')[0].lower() if '-' in lang else lang.lower()
    mapped_lang_name = lang_map.get(lang_code, "English")

    voices_map = {
        "en": {
            "Female": "en-IN-NeerjaNeural", 
            "Male": "en-IN-PrabhatNeural",
            "TeenagerFemale": "en-IN-NeerjaNeural",
            "TeenagerMale": "en-IN-PrabhatNeural"
        },
        "te": {
            "Female": "te-IN-ShrutiNeural", 
            "Male": "te-IN-MohanNeural",
            "TeenagerFemale": "te-IN-ShrutiNeural",
            "TeenagerMale": "te-IN-MohanNeural"
        },
        "hi": {
            "Female": "hi-IN-SwaraNeural", 
            "Male": "hi-IN-MadhurNeural",
            "TeenagerFemale": "hi-IN-KavyaNeural",
            "TeenagerMale": "hi-IN-MadhurNeural"
        },
        "ta": {
            "Female": "ta-IN-PallaviNeural", 
            "Male": "ta-IN-ValluvarNeural",
            "TeenagerFemale": "ta-IN-PallaviNeural",
            "TeenagerMale": "ta-IN-ValluvarNeural"
        }
    }
    gender_key = request.gender if request.gender else "Female"
    # Ensure exact match or fallback to default Female voice
    lang_voices = voices_map.get(lang_code, voices_map["en"])
    voice_name = lang_voices.get(gender_key, lang_voices["Female"])

    response_text = ""
    
    # Try using Real LLM first
    if gemini_model:
        try:
            # Build conversation memory text
            history_text = "\n".join([f"{'AI' if msg.role == 'model' else 'User'}: {msg.content}" for msg in request.history[-10:]])
            history_context = f"\n--- CONVERSATION HISTORY (Last 10 msgs) ---\n{history_text}\n" if request.history else ""

            if request.is_stress_buster:
                prompt = (
                    f"You are 'ChillBuddy', an highly empathetic, cool companion and the user's best friend. "
                    f"The user's name is '{request.user_name}'. Address them by this name occasionally to be friendly.\n"
                    f"MISSION: Be their ultimate stress-buster and mood-lifter! "
                    f"INSTRUCTIONS:\n"
                    f"1. MOOD DETECTION & TONE: Analyze the user's mood (stressed, sad, angry, anxious, happy). "
                    f"Adapt your tone accordingly: calm and soothing for anxious/stressed, energetic for sad/low motivation.\n"
                    f"2. EMERGENCY DETECT: If the user expresses severe distress (e.g., 'I want to disappear', 'can't handle this'), gently encourage them to contact trusted people or a professional helpline.\n"
                    f"3. STRESS RELIEF ARSENAL: Depending on their mood, offer one of the following:\n"
                    f"   - Breathing: Guide them through a 4-4-6 pattern ('Inhale for 4 seconds... hold for 4... exhale for 6...').\n"
                    f"   - Motivation: Give uplifting quotes, remind them to hydrate, or suggest taking a quick break.\n"
                    f"   - Relaxation: Suggest a 2-minute activity (meditation, stretching, lo-fi/nature music recommendations).\n"
                    f"   - Humor: Generate a culturally relevant joke, pun, or fun fact native to {mapped_lang_name} (do NOT translate English jokes).\n"
                    f"4. Keep it highly conversational, supportive, brief for a voice assistant, and use relevant emojis.\n"
                    f"Respond ENTIRELY in {mapped_lang_name} using its native script.\n"
                    f"\n"
                    f"User's query: '{user_message}'"
                    f"{history_context}"
                )
            else:
                prompt = (
                    f"You are a 'Professional Study Tutor'. "
                    f"The user's name is '{request.user_name}'. Address them by this name occasionally.\n"
                    f"MISSION: Provide precise and professional academic help. "
                    f"FORMATTING RULES: "
                    f"1. Use direct answers first. "
                    f"2. IMPORTANT: Use MATHEMATICAL SYMBOLS strictly (e.g., use 'π' for pi, '∇' for grad, '∫' for integral, '∂' for partial, '∑' for sum, '±', '≠', '≈', 'θ', 'λ'). "
                    f"3. LATEX EQUATIONS: Use LaTeX format with dollar symbols for equations when needed (e.g., $E = E^o - \\frac{{0.0592 V}}{{n}} \\log Q$ or $x^2 + 5$). "
                    f"4. Use '$' for inline math and '$$' for large, centered equations. "
                    f"5. Keep formatting compact. Do not leave empty lines between sentences. "
                    f"6. Give the DIRECT answer immediately. DO NOT over-explain. "
                    f"7. For coding or tech questions, provide accurate, fully functional code snippets and exact technical answers. "
                    f"8. Use symbols like 💡 for tips or ✅ for correct answers. "
                    f"Respond ENTIRELY in {mapped_lang_name} using its native script. "
                    f"\n"
                    f"User's query: '{user_message}'"
                    f"{history_context}"
                )
            
            # Construct multimodal content
            content = [prompt]
            if request.attachments:
                for att in request.attachments:
                    try:
                        # Handle base64 image data
                        if "image" in att.type or att.data.startswith("data:image"):
                            # Remove the data:image/...;base64, prefix if present
                            base64_str = att.data.split(",")[1] if "," in att.data else att.data
                            img_data = base64.b64decode(base64_str)
                            img = Image.open(BytesIO(img_data))
                            content.append(img)
                        elif "application/pdf" in att.type or att.name.endswith(".pdf"):
                            # For now, just note the PDF is present
                            # (Full PDF parsing requires more setup, but vision handles images)
                            pass 
                    except Exception as img_err:
                        print(f"Error processing attachment {att.name}: {img_err}")

            response = await asyncio.to_thread(gemini_model.generate_content, content)
            if response and response.text:
                response_text = response.text.strip() # Keep markdown for frontend rendering
        except Exception as e:
            print(f"Gemini API Error: {e}")
            error_str = str(e)
            if "429" in error_str or "quota" in error_str.lower():
                response_text = "I am receiving too many requests right now! Please wait a few seconds and try your question again."
            else:
                response_text = ""
    
    # Fallback to Mock Responses if LLM is disabled/fails
    if not response_text:
        time.sleep(1)
        # Default responses (purely localized, no English mixing)
        responses = {
            "en": {
                "default": "Sorry, I didn't catch that. Could you ask something else?",
                "hello": "Hello! I am your personal study assistant. What subject would you like help with today?",
                "math": "Mathematics is my strong suit! We can work on algebra, calculus, or any topic you are stuck on. What's the problem?",
                "science": "Science is fascinating. I can explain complex physical phenomena or chemical equations.",
                "history": "Let's explore history together. Which era are you currently studying?",
                "bye": "Goodbye! Keep up the good work!"
            },
            "te": {
                "default": "క్షమించండి, నాకు అర్థం కాలేదు. మీరు ఇంకేదైనా అడగగలరా?",
                "hello": "నమస్కారం! నేను మీ అధ్యయన సహాయకుడిని. ఈ రోజు ఏ సబ్జెక్ట్‌లో సహాయం కావాలి?",
                "math": "గణితం నాకు చాలా ఇష్టం! మనం బీజగణితం, కాలిక్యులస్ లేదా మరేదైనా అంశాన్ని సాధించవచ్చు.",
                "science": "సైన్స్ చాలా ఆసక్తికరంగా ఉంటుంది. మీరు ఏమి నేర్చుకోవాలనుకుంటున్నారు?",
                "history": "మనం చరిత్రను కలిసి చదువుకుందాం. మీరు ఏ కాలం గురించి నేర్చుకుంటున్నారు?",
                "bye": "వీడ్కోలు! బాగా చదువుకోండి!"
            },
            "hi": {
                "default": "क्षमा करें, मुझे समझ नहीं आया। क्या आप कुछ और पूछ सकते हैं?",
                "hello": "नमस्ते! मैं आपका निजी अध्ययन सहायक हूँ। आज आप किस विषय में मदद चाहेंगे?",
                "math": "गणित मेरा पसंदीदा विषय है! हम बीजगणित, कैलकुलस या किसी भी विषय पर काम कर सकते हैं।",
                "science": "विज्ञान बहुत रोचक है। आप क्या सीखना चाहते हैं?",
                "history": "आइए एक साथ इतिहास का अन्वेषण करें। आप वर्तमान में किस युग का अध्ययन कर रहे हैं?",
                "bye": "अलविदा! अच्छा काम करते रहें!"
            },
            "ta": {
                "default": "மன்னிக்கவும், எனக்கு புரியவில்லை. வேறு ஏதாவது கேட்க முடியுமா?",
                "hello": "வணக்கம்! நான் உங்கள் தனிப்பட்ட படிப்பு உதவியாளர். இன்று எந்தப் பாடத்தில் உதவி வேண்டும்?",
                "math": "கணிதம் எனக்கு மிகவும் பிடிக்கும்! நீங்கள் எந்த கணித பிரச்சனையை தீர்க்க வேண்டும்?",
                "science": "அறிவியல் மிகவும் சுவாரஸ்யமானது. நீங்கள் என்ன கற்றுக்கொள்ள விரும்புகிறீர்கள்?",
                "history": "நாம் ஒன்றாக வரலாற்றைப் படிப்போம். நீங்கள் எந்த காலகட்டத்தை பற்றி படிக்கிறீர்கள்?",
                "bye": "பிரியாவிடை! உங்கள் படிப்பை தொடருங்கள்!"
            }
        }
        
        # Map the requested language to our dictionaries, fallback to English
        lang_key = lang_code if lang_code in responses else "en"
        lang_dict = responses.get(lang_key, responses["en"])
        
        response_text = lang_dict["default"]
        
        user_message_lower = request.message.lower()
        if "hello" in user_message_lower or "hi" in user_message_lower or "నమస్కారం" in user_message_lower or "नमस्ते" in user_message_lower or "வணக்கம்" in user_message_lower:
            response_text = lang_dict["hello"]
        elif "math" in user_message_lower or "గణితం" in user_message_lower or "गणित" in user_message_lower or "கணிதம்" in user_message_lower:
            response_text = lang_dict["math"]
        elif "science" in user_message_lower or "సైన్స్" in user_message_lower or "विज्ञान" in user_message_lower or "அறிவியல்" in user_message_lower:
            response_text = lang_dict["science"]
        elif "history" in user_message_lower or "చరిత్ర" in user_message_lower or "इतिहास" in user_message_lower or "வரலாறு" in user_message_lower:
            response_text = lang_dict["history"]
        elif "bye" in user_message_lower or "goodbye" in user_message_lower or "వీడ్కోలు" in user_message_lower or "अलविदा" in user_message_lower or "பிரியாவிடை" in user_message_lower:
            response_text = lang_dict["bye"]
            
    audio_url = ""
    if response_text:
        try:
            audio_filename = f"{uuid.uuid4()}.mp3"
            audio_filepath = os.path.join("audio", audio_filename)
            # Adjust rate and pitch for teenager voices to sound more energetic/youthful
            rate = "+10%" if "Teenager" in gender_key else "+0%"
            pitch = "+5Hz" if "Teenager" in gender_key else "+0Hz"
            
            # Clean up text for TTS so it doesn't say "dollar" or "asterisk"
            tts_text = response_text.replace('$', '').replace('*', '').replace('#', '')
            
            # Convert common LaTeX math to spoken words
            import re
            tts_text = re.sub(r'\\frac{(.*?)}{(.*?)}', r'\1 over \2', tts_text)
            tts_text = re.sub(r'\\sqrt{(.*?)}', r'square root of \1', tts_text)
            tts_text = re.sub(r'\^2', r' squared', tts_text)
            tts_text = re.sub(r'\^3', r' cubed', tts_text)
            tts_text = re.sub(r'\^{(.*?)}', r' to the power of \1', tts_text)
            tts_text = re.sub(r'\\pi', r'pi', tts_text)
            tts_text = re.sub(r'\\theta', r'theta', tts_text)
            tts_text = re.sub(r'\\pm', r'plus or minus', tts_text)
            tts_text = re.sub(r'\\log', r'log', tts_text)
            tts_text = re.sub(r'\\int', r'integral of', tts_text)
            tts_text = re.sub(r'\\sum', r'sum of', tts_text)
            tts_text = re.sub(r'\\approx', r'approximately equals', tts_text)
            tts_text = re.sub(r'\\neq', r'not equal to', tts_text)
            tts_text = tts_text.replace('=', ' equals ')
            tts_text = tts_text.replace('\\', '') # remove any remaining backslashes
            
            communicate = edge_tts.Communicate(tts_text, voice_name, rate=rate, pitch=pitch)
            await communicate.save(audio_filepath)
            # Remove any trailing newlines from base URL and format
            audio_url = f"http://localhost:8000/audio/{audio_filename}"
        except Exception as e:
            print(f"Edge TTS Error: {e}")
            
    return ChatResponse(response=response_text, audio_url=audio_url)

@app.post("/api/voice")
async def process_voice(request: Request):
    # This is a placeholder for actual audio processing endpoint
    # You would typically accept a file upload containing the audio
    return {"message": "Voice processing activated. Note: Requires real speech-to-text integration."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
