# 🧠 DocMind AI: Document Intelligence Platform

A full-stack **Retrieval-Augmented Generation (RAG)** application that allows users to upload documents and ask questions about their content using AI-generated, context-grounded answers.

Built with a **React Frontend**, **Node.js/Express Backend**, and **FastAPI AI Service** powered by **LangChain, ChromaDB, and Google Gemini**.

---

## 📸 Overview

**DocMind AI** allows users to upload documents in **PDF, DOCX, TXT, and MD** formats, process their content, and ask questions about the uploaded documents.

The application uses **Retrieval-Augmented Generation (RAG)** to retrieve relevant information from the uploaded documents before generating an answer with a Gemini language model.

### Main Flow

**Document → Text Extraction → Chunking → Embeddings → ChromaDB → Similarity Search → Context → Gemini → Answer + Sources**

---

## 🏗 System Architecture

The application is divided into three main components:

### 1. 🖥️ React Frontend

* **Framework:** React + Vite
* **UI:** Glassmorphism-based interface
* **Icons:** Lucide React
* **Features:**
    * Document upload
    * Document library
    * Document indexing status
    * Chunk count display
    * AI chat interface
    * Suggested questions
    * Source references
    * Loading and error feedback

---

### 2. ⚙️ Node.js / Express Backend

* **Framework:** Node.js + Express
* **Role:** Acts as the backend gateway between the React frontend and AI service.
* **Responsibilities:**
    * Handles frontend API requests
    * Proxies document operations to the FastAPI service
    * Proxies AI chat requests
    * Handles API responses and errors
    * Provides the application backend layer

For the current local/demo version, application data is stored locally rather than using MongoDB.

---

### 3. 🧠 FastAPI AI Service

* **Framework:** FastAPI
* **Language:** Python
* **RAG Framework:** LangChain
* **Vector Database:** ChromaDB
* **LLM:** Google Gemini
* **Embeddings:** Gemini Embeddings

The AI service handles document processing, indexing, retrieval, and AI-powered question answering.

### RAG Process

1. User uploads a document.
2. The document text is extracted.
3. The text is divided into smaller chunks.
4. Chunks are converted into vector embeddings.
5. Embeddings are stored in ChromaDB.
6. When a question is asked, relevant chunks are retrieved using similarity search.
7. Retrieved context is provided to the Gemini LLM.
8. Gemini generates an answer based on the retrieved document content.
9. Relevant sources are returned with the answer.

---

## 🛠 Tech Stack

| Component | Technologies |
| :--- | :--- |
| **Frontend** | React, Vite, Lucide React, CSS |
| **Backend** | Node.js, Express, Axios |
| **AI Service** | Python, FastAPI, LangChain |
| **LLM** | Google Gemini |
| **Vector Database** | ChromaDB |
| **Embeddings** | Gemini `models/gemini-embedding-001` |
| **Supported Documents** | PDF, DOCX, TXT, MD |

---

## 🚀 Installation & Setup

### 1. Prerequisites

* Node.js v18+
* Python 3.10+
* Google Gemini API Key

---

### 2. AI Intelligence Service

```bash
cd AI

python -m venv .venv

.\.venv\Scripts\activate

pip install -r requirements.txt
