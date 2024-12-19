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

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Load environment variables
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# MongoDB connection removed for simplicity since not required now.

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

@app.route("/")
def index():
    return jsonify({"message": "Welcome to the Medical Chatbot and Image Analysis API"})

@app.route("/get", methods=["POST"])
def text_chat():
    """
    Text-based chat interaction.
    """
    try:
        data = request.get_json()
        msg = data.get("msg", "")
        if not msg:
            return jsonify({"error": "Message is required"}), 400

        print("User Input:", msg)
        response = rag_chain.invoke({"input": msg})
        print("Response:", response["answer"])

        return jsonify({"answer": response["answer"]})
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Something went wrong, please try again."}), 500

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
