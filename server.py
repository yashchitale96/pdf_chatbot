import os
import shutil
import cloudinary
import cloudinary.uploader
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import CharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

app = FastAPI()

# Allow CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOCS_DIR = "docs"
DB_DIR = "db/chroma_db"
os.makedirs(DOCS_DIR, exist_ok=True)

# Try initialization, handle case where API keys might not be present right at startup
embeddings = None
db = None
llm = None
try:
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    db = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
    llm = ChatOpenAI(model="gpt-4o-mini")
except Exception as e:
    print(f"Warning: Could not initialize AI models. {e}")

# In-memory session store
sessions = {}

class ChatRequest(BaseModel):
    message: str
    session_id: str

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    file_path = os.path.join(DOCS_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Upload to Cloudinary as a raw asset
        public_id = os.path.splitext(file.filename)[0]
        upload_result = cloudinary.uploader.upload(
            file_path,
            resource_type="raw",
            folder="pdf_chatbot",
            public_id=public_id,
            overwrite=True,
        )
        cloudinary_url = upload_result["secure_url"]

        # Load and split the document
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        text_splitter = CharacterTextSplitter(chunk_size=800, chunk_overlap=100)
        chunks = text_splitter.split_documents(documents)

        # Tag each chunk with the Cloudinary URL
        for chunk in chunks:
            chunk.metadata["cloudinary_url"] = cloudinary_url

        # Add to vector store
        global db
        if not db:
            raise HTTPException(status_code=500, detail="AI models not initialized.")

        db.add_documents(chunks)
        os.remove(file_path)

        return {
            "filename": file.filename,
            "cloudinary_url": cloudinary_url,
            "message": f"Successfully ingested {len(chunks)} chunks",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
async def chat(request: ChatRequest):
    if not llm or not db:
        raise HTTPException(status_code=500, detail="AI models not initialized.")
        
    session_id = request.session_id
    user_message = request.message
    
    if session_id not in sessions:
        sessions[session_id] = []
        
    chat_history = sessions[session_id]
    
    # 1. Contextualize the question
    if chat_history:
        messages = [
            SystemMessage(content="Given the chat history, rewrite the new question to be standalone and searchable. Just return the rewritten question.")
        ] + chat_history + [
            HumanMessage(content=f"New question: {user_message}")
        ]
        result = llm.invoke(messages)
        search_question = result.content.strip()
    else:
        search_question = user_message
        
    # 2. Retrieve documents
    retriever = db.as_retriever(search_kwargs={"k": 5})
    docs = retriever.invoke(search_question)
    
    # 3. Formulate answer
    combined_input = f"""Based on the following documents, please answer this question: {user_message}

    Documents:
    {"\n".join([f"- {doc.page_content}" for doc in docs])}

    Please provide a clear, helpful answer using only the information from these documents. If you can't find the answer in the documents, say "I don't have enough information to answer that question based on the provided documents."
    """
    
    messages = [
        SystemMessage(content="You are a helpful assistant that answers questions based on provided documents and conversation history.")
    ] + chat_history + [
        HumanMessage(content=combined_input)
    ]
    
    result = llm.invoke(messages)
    answer = result.content
    
    # Update Session History
    chat_history.append(HumanMessage(content=user_message))
    chat_history.append(AIMessage(content=answer))
    
    return {
        "answer": answer,
        "sources": [{"content": d.page_content, "source": d.metadata.get("source", "")} for d in docs]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
