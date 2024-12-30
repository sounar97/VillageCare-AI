from flask import Flask, jsonify, request
from flask_cors import CORS
from src.helper import download_hugging_face_embeddings
from src.prompt import system_prompt
from langchain_pinecone import Pinecone
from langchain_openai import OpenAI
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
import os
import tempfile
import base64
import openai
import whisper
import io
import subprocess
import numpy as np
import soundfile as sf
from pydub import AudioSegment



# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Load environment variables
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# Load Whisper model
model = whisper.load_model("base")

# Load embeddings and initialize retriever
embeddings = download_hugging_face_embeddings()
index_name = "medicalbot"
docsearch = Pinecone.from_existing_index(index_name=index_name, embedding=embeddings)
retriever = docsearch.as_retriever(search_type="similarity", search_kwargs={"k": 3})

# Initialize LLM and chain
llm = OpenAI(temperature=0.4, max_tokens=500)
prompt = ChatPromptTemplate.from_messages(
    [
        ("system", system_prompt),
        ("human", "{input}"),
    ]
)
question_answer_chain = create_stuff_documents_chain(llm, prompt)
rag_chain = create_retrieval_chain(retriever, question_answer_chain)

# GPT-4 Vision Sample Prompt
image_prompt = """You are a dermatologist analyzing skin disease images. Analyze the uploaded image and provide the following details:
1. Identify the skin condition (e.g., dandruff, eczema, psoriasis, burns, or other skin issues).
2. Describe the symptoms observed from the image.
3. Suggest possible causes and next steps for the condition.
Always include a disclaimer: 'Consult with a dermatologist before making any decisions.'"""

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')
    
def analyze_image_with_gpt4(image_path):
    try:
        base64_image = encode_image(image_path)
        response = openai.chat.completions.create(
            model="gpt-4-turbo",  # GPT-4 Vision (image input support)
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": image_prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ]
                }
            ],
            max_tokens=1000
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error during analysis: {str(e)}"
    
def transcribe_audio(audio_bytes):
    try:
        audio_file = io.BytesIO(audio_bytes)
        transcription = model.transcribe(audio_file)
        return transcription["text"]
    except Exception as e:
        return f"Error during transcription: {str(e)}"

@app.route("/")
def index():
    return jsonify({"message": "Welcome to the Medical Chatbot and Image Analysis API"})

@app.route("/get", methods=["POST"])
def text_chat():
    """
    Text-based chat interaction with language translation.
    """
    try:
        data = request.get_json()
        msg = data.get("msg", "")
        language = data.get("language", "en")  # Default to English

        if not msg:
            return jsonify({"error": "Message is required"}), 400

        print(f"User Input: {msg} | Language: {language}")

        # Translate the input to English if not in English
        if language != "en":
            translation_response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "Translate the following text to English."
                    },
                    {
                        "role": "user",
                        "content": msg
                    }
                ]
            )
            msg = translation_response.choices[0].message.content
            print(f"Translated Input: {msg}")

        # Get the response from RAG Chain
        response = rag_chain.invoke({"input": msg})
        answer = response.get("answer", "I couldn't understand your request. Please try again.")

        # Translate the response back to the user's language
        if language != "en":
            translation_response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": f"Translate the following text to {language}."
                    },
                    {
                        "role": "user",
                        "content": answer
                    }
                ]
            )
            answer = translation_response.choices[0].message.content

        print(f"Response in {language}: {answer}")
        return jsonify({"answer": answer}), 200

    except Exception as e:
        print(f"Error during text chat processing: {str(e)}")
        return jsonify({"error": f"Something went wrong: {str(e)}"}), 500



@app.route('/voice', methods=['POST'])
def voice_chat():
    try:
        # Check if audio file is in the request
        if "audio" not in request.files:
            return jsonify({"error": "No audio file provided"}), 400

        audio_file = request.files["audio"]

        # Save the uploaded audio temporarily as .m4a
        temp_audio_path = tempfile.NamedTemporaryFile(delete=False, suffix=".m4a").name
        audio_file.save(temp_audio_path)
        print(f"Audio saved to temporary path: {temp_audio_path}")

        # Convert .m4a to .wav
        temp_wav_path = tempfile.NamedTemporaryFile(delete=False, suffix=".wav").name
        try:
            AudioSegment.from_file(temp_audio_path).export(temp_wav_path, format="wav")
            print(f"Audio converted to WAV at: {temp_wav_path}")
        except Exception as e:
            print(f"Error converting audio to WAV: {str(e)}")
            return jsonify({"error": "Error converting audio to WAV"}), 500

        # Load the .wav file using soundfile
        audio, sample_rate = sf.read(temp_wav_path, dtype="float32")

        # Ensure audio is mono
        if audio.ndim > 1:
            audio = np.mean(audio, axis=1)

        # Run Whisper transcription
        print("Transcribing audio...")
        result = model.transcribe(temp_wav_path, fp16=False)
        transcription = result["text"]
        print(f"Transcription: {transcription}")

        # Send transcribed text to the /get logic
        print("Fetching response from the bot...")
        response = rag_chain.invoke({"input": transcription})
        response_text = response.get("answer", "I couldn't understand your request. Please try again.")
        print(f"Bot Response: {response_text}")

        # Cleanup temporary files
        os.unlink(temp_audio_path)
        os.unlink(temp_wav_path)

        # Return both transcription and response
        return jsonify({
            "transcription": transcription,
            "response": response_text
        }), 200

    except Exception as e:
        print(f"Error during voice processing: {str(e)}")
        return jsonify({"error": f"Error during transcription: {str(e)}"}), 500

@app.route("/analyze_image", methods=["POST"])
def analyze_image():
    """
    Handle image uploads and process with GPT-4 Vision.
    """
    try:
        if "image" not in request.files:
            print("Error: No image file uploaded")
            return jsonify({"error": "No image file uploaded"}), 400

        image_file = request.files["image"]
        if image_file.filename == "":
            print("Error: Empty file name")
            return jsonify({"error": "Empty file name"}), 400

        # Save the uploaded image temporarily
        print("Saving uploaded image...")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp_file:
            temp_file_path = tmp_file.name
            image_file.save(temp_file_path)
            print(f"Image saved to temporary path: {temp_file_path}")

        # Analyze the image
        print("Analyzing the image with GPT-4...")
        result = analyze_image_with_gpt4(temp_file_path)
        print(f"GPT-4 Vision Response: {result}")

        # Cleanup temporary file
        os.unlink(temp_file_path)
        print("Temporary file cleaned up.")

        return jsonify({"result": result}), 200

    except Exception as e:
        print(f"Error during image processing: {str(e)}")
        return jsonify({"error": f"Failed to process image: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
