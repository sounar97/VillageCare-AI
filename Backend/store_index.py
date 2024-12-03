from src.helper import load_pdf_file, text_split, download_hugging_face_embeddings
from pinecone import Pinecone, ServerlessSpec
from langchain_community.vectorstores import Pinecone as LangChainPinecone
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Pinecone API key and environment
PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')

# Create an instance of the Pinecone client
pc = Pinecone(api_key=PINECONE_API_KEY)

# Define index name
index_name = "medicalbot"

# Check if the index already exists
if index_name not in pc.list_indexes().names():
    # Create the index
    pc.create_index(
        name=index_name,
        dimension=384,
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"
        )
    )

# Ensure the index exists
if index_name not in pc.list_indexes().names():
    raise ValueError(f"Index '{index_name}' was not created successfully.")

# Load and process PDF data
extracted_data = load_pdf_file(data='Data/')
text_chunks = text_split(extracted_data)

# Download Hugging Face embeddings
embeddings = download_hugging_face_embeddings()

# Embed and upsert data into the Pinecone index using LangChain's wrapper
docsearch = LangChainPinecone.from_documents(
    documents=text_chunks,
    embedding=embeddings,
    index_name=index_name  # Pass index_name as a string
)

print("Index created and documents added successfully!")
