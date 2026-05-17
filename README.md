# ChillBuddy AI Voice Assistant 🎙️✨

An intelligent, multilingual AI Voice Assistant built with React, FastAPI, and Gemini Flash. Features dual personalities: a precise Professional Academic Tutor with multimodal vision, and "ChillBuddy", an empathetic stress-buster with mood detection, culturally-adapted humor, and guided breathing exercises.

## 🌟 Key Features

*   🧠 **Dual AI Modes:** Switch seamlessly between a strict, highly-accurate Academic Tutor (specializing in Math/Coding) and "ChillBuddy", a personalized stress-relieving companion.
*   👁️ **Multimodal Vision:** Upload images of complex math equations or graphs, and the AI will "see" and solve them instantly using Gemini Flash.
*   🗣️ **Native Voice Synthesis:** High-quality, real-time voice responses using Edge-TTS, featuring dynamic pitch/speed adjustments for different personas (e.g., energetic teenager) and natural mathematical pronunciation.
*   ❤️ **Emotion & Mood Detection:** The AI dynamically alters its tone based on the user's emotional state, offering 4-4-6 breathing exercises, curated relaxation tasks, and emergency support detection.
*   🌍 **Multilingual:** Fully supports English, Telugu, Hindi, and Tamil with culturally-adapted, non-translated localized humor.
*   💬 **Persistent Memory:** Context-aware conversations that remember user preferences and past interactions (saved securely in your local browser).

## 🛠️ Technology Stack

*   **Frontend:** React, Vite, Lucide-React, React-Markdown, Rehype-Katex
*   **Backend:** Python, FastAPI, Uvicorn
*   **AI Engine:** Google Gemini Flash 1.5
*   **Voice Engine:** Edge-TTS & Web Speech API

## 🚀 How to Run Locally

### 1. Backend Setup (FastAPI)
Navigate to the backend folder, create a virtual environment, install dependencies, and start the server:
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # On Windows
pip install fastapi uvicorn google-generativeai edge-tts pillow python-multipart
python main.py
```
*(Ensure you have a `.env` file in the backend directory containing your `GEMINI_API_KEY`)*

### 2. Frontend Setup (React)
Open a new terminal, navigate to the frontend folder, install the packages, and start the dev server:
```bash
cd frontend
npm install
npm run dev
```

### 3. Open the App
Click the link provided by Vite (usually `http://localhost:5173/`) and enjoy your AI assistant!
