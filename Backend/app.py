from flask import Flask, jsonify, request
from flask_cors import CORS
from src.helper import download_hugging_face_embeddings
from langchain_pinecone import Pinecone
from langchain_openai import OpenAI
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
from src.prompt import *
import os

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Load environment variables
load_dotenv()
PINECONE_API_KEY = os.environ.get('PINECONE_API_KEY')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY
os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY

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


@app.route("/")
def index():
    return jsonify({"message": "Welcome to the Medical Chatbot API"})


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "Backend is running"})


@app.route("/get", methods=["GET","POST"])
def chat():
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


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8080, debug=True)  # Set debug=True for development
