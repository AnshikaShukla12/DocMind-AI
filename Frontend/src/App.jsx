import { useEffect, useRef, useState } from "react";
import {
  Upload,
  FileText,
  Trash2,
  Send,
  Database,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  FolderOpen,
  X,
} from "lucide-react";

const API_BASE = `${import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000/api"}/ai`;

const EXAMPLE_QUESTIONS = [
  "What is this document about?",
  "Summarize the main points",
  "What are the important findings?",
  "Explain this in simple terms",
];

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatErrorMessage(err) {
  if (!err) return "";
  const msg = typeof err === "string" ? err : err.message || "An unexpected error occurred.";
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
    return "Unable to connect to the server. Please ensure the backend and AI services are running.";
  }
  return msg;
}

async function readResponse(response) {
  const body = await response.text();
  const contentType = response.headers.get("content-type") || "";

  if (!body.trim() || !contentType.includes("application/json")) {
    return null;
  }

  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [activeDocumentId, setActiveDocumentId] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState("");
  const [question, setQuestion] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const docListRef = useRef(null);

  const activeDocument = documents.find((item) => item.id === activeDocumentId);

  useEffect(() => {
    void loadDocuments();
  }, []);

  useEffect(() => {
    if (!activeDocumentId || !conversationId) {
      return;
    }
    void loadHistory(activeDocumentId, conversationId);
  }, [activeDocumentId, conversationId]);

  async function loadDocuments() {
    try {
      const response = await fetch(`${API_BASE}/documents`);
      const data = await readResponse(response);
      if (Array.isArray(data)) {
        setDocuments(data);
        if (!activeDocumentId && data.length > 0) {
          setActiveDocumentId(data[0].id);
        }
      }
    } catch (err) {
      setError(formatErrorMessage("Failed to load documents. Please check your connection."));
    }
  }

  async function loadHistory(documentId, nextConversationId) {
    try {
      const response = await fetch(
        `${API_BASE}/documents/${documentId}/history?conversation_id=${nextConversationId}`,
      );
      if (!response.ok) return;
      const data = await readResponse(response);
      if (!Array.isArray(data?.messages)) return;
      setMessages(
        data.messages.map((item, index) => ({
          id: `${item.role}-${index}`,
          role: item.role,
          content: item.content,
          sources: [],
        })),
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/documents/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await readResponse(response);
      if (!response.ok) {
        throw new Error(data?.error || data?.detail || "Upload failed. Please upload a valid document.");
      }
      if (!data) {
        throw new Error("Upload returned an empty response.");
      }
      const newDoc = {
        ...data,
        id: data.id || data.doc_id,
        chunks: data.chunks ?? data.chunk_count ?? 0,
        created_at: data.created_at || new Date().toISOString(),
      };
      setDocuments((current) => [newDoc, ...current]);
      setActiveDocumentId(newDoc.id);
      setConversationId("");
      setMessages([]);
    } catch (uploadError) {
      setError(formatErrorMessage(uploadError));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDelete(documentId) {
    try {
      const response = await fetch(`${API_BASE}/documents/${documentId}`, {
        method: "DELETE",
      });
      if (!response.ok) return;

      const nextDocuments = documents.filter((item) => item.id !== documentId);
      setDocuments(nextDocuments);
      if (activeDocumentId === documentId) {
        setActiveDocumentId(nextDocuments[0]?.id || "");
        setConversationId("");
        setMessages([]);
      }
    } catch (err) {
      setError(formatErrorMessage("Failed to delete document."));
    }
  }

  async function handleSubmit(event) {
    if (event) event.preventDefault();
    if (!question.trim() || !activeDocumentId) return;

    const outgoingQuestion = question.trim();
    const optimisticMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: outgoingQuestion,
      sources: [],
    };

    setMessages((current) => [...current, optimisticMessage]);
    setQuestion("");
    setIsThinking(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: activeDocumentId,
          question: outgoingQuestion,
          conversation_id: conversationId || null,
        }),
      });
      const data = await readResponse(response);
      if (!response.ok) {
        throw new Error(data?.error || data?.detail || "Chat request failed.");
      }
      if (!data) {
        throw new Error("Chat returned an empty response.");
      }

      setConversationId(data.conversation_id);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer,
          sources: data.sources,
        },
      ]);
    } catch (chatError) {
      setError(formatErrorMessage(chatError));
      setMessages((current) => current.filter((item) => item.id !== optimisticMessage.id));
      setQuestion(outgoingQuestion);
    } finally {
      setIsThinking(false);
    }
  }

  function handleSelectQuestion(sample) {
    setQuestion(sample);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }

  function handleQuickAction(action) {
    if (action === "upload") {
      fileInputRef.current?.click();
    } else if (action === "ask") {
      textareaRef.current?.focus();
    } else if (action === "documents") {
      docListRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="user-profile">
            <div className="avatar">D</div>
            <div className="user-info">
              <span className="user-name">Workspace User</span>
              <span className="user-status">Local Demo</span>
            </div>
          </div>
          <h1>DocMind AI</h1>
          <p className="lede">
            Intelligent document analysis and grounded AI insights.
          </p>
        </div>

        <div className="panel">
          <label className="upload-card">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={handleUpload}
              hidden
            />
            <Upload size={24} className="upload-icon" />
            <span>{isUploading ? "Uploading & indexing..." : "Upload document"}</span>
            <small>Supports PDF, DOCX, TXT, MD</small>
          </label>
          {error ? (
            <div className="alert-banner error">
              <span>{error}</span>
              <button
                type="button"
                className="alert-close"
                onClick={() => setError("")}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          ) : null}
        </div>

        <div className="panel documents-panel">
          <div className="panel-header">
            <h2>Library</h2>
            <div className="badge">{documents.length}</div>
          </div>
          <div className="document-list" ref={docListRef}>
            {documents.map((document) => (
              <div
                key={document.id}
                role="button"
                tabIndex={0}
                className={`document-card ${document.id === activeDocumentId ? "active" : ""}`}
                onClick={() => {
                  setActiveDocumentId(document.id);
                  setConversationId("");
                  setMessages([]);
                }}
              >
                <div className="doc-icon">
                  <FileText size={18} />
                </div>
                <div className="doc-content">
                  <div className="doc-header-row">
                    <strong className="doc-name" title={document.filename}>
                      {document.filename}
                    </strong>
                    <span className="status-pill ready">Ready</span>
                  </div>
                  <div className="doc-meta">
                    <span>{document.chunks ?? document.chunk_count ?? 0} chunks</span>
                    <span>•</span>
                    <span>{formatDate(document.created_at) || "Recently"}</span>
                  </div>
                  <div className="document-footer">
                    <span className="doc-details-text">
                      {document.embedded_with ? `Indexed with ${document.embedded_with}` : "Indexed"}
                    </span>
                    <button
                      className="delete-btn"
                      title="Delete document"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDelete(document.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {documents.length === 0 && !isUploading ? (
              <div className="empty-card">
                <FolderOpen size={28} />
                <strong>No documents yet</strong>
                <p>Upload a PDF, DOCX, TXT, or MD file to start asking questions.</p>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <main className="chat-layout">
        <section className="hero-panel">
          <div className="hero-content">
            <div className="badge accent">Secure Gateway Active</div>
            <h2>{activeDocument ? activeDocument.filename : "DocMind Workspace"}</h2>
            <p>
              {activeDocument
                ? "Asking questions grounded in your selected source."
                : "Select or upload a document to begin intelligent analysis."}
            </p>

            <div className="quick-actions">
              <span className="quick-actions-label">Quick Actions:</span>
              <button
                type="button"
                className="quick-action-btn"
                onClick={() => handleQuickAction("upload")}
              >
                <Upload size={14} /> Upload Document
              </button>
              <button
                type="button"
                className="quick-action-btn"
                onClick={() => handleQuickAction("ask")}
              >
                <MessageSquare size={14} /> Ask AI
              </button>
              <button
                type="button"
                className="quick-action-btn"
                onClick={() => handleQuickAction("documents")}
              >
                <FileText size={14} /> View Documents
              </button>
            </div>
          </div>

          <div className="hero-metrics">
            <div className="metric-card">
              <Database size={20} className="metric-icon" />
              <div>
                <strong>{activeDocument?.chunks ?? activeDocument?.chunk_count ?? 0}</strong>
                <span>Chunks</span>
              </div>
            </div>
            <div className="metric-card">
              <ShieldCheck size={20} className="metric-icon" />
              <div>
                <strong>{messages.filter((m) => m.role === "assistant").length}</strong>
                <span>Secure Replies</span>
              </div>
            </div>
          </div>
        </section>

        <section className="chat-panel">
          <div className="messages">
            {messages.length === 0 && (
              <div className="empty-chat">
                <div className="empty-icon">💬</div>
                <h3>Start a Conversation</h3>
                <p>
                  {activeDocument
                    ? "Select a suggested question below or type your prompt to analyze this document."
                    : "Select a document from your library to begin querying."}
                </p>
              </div>
            )}

            {messages.map((message) => (
              <article key={message.id} className={`message ${message.role}`}>
                <div className="message-role">
                  {message.role === "user" ? "You" : "AI Assistant"}
                </div>
                <div className="message-body">{message.content}</div>
                {message.sources?.length ? (
                  <div className="sources-container">
                    <span className="sources-label">Sources:</span>
                    <div className="sources-grid">
                      {message.sources.map((source, index) => (
                        <div
                          key={index}
                          className="source-pill"
                          title={source.content || "Source snippet"}
                        >
                          Source {index + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}

            {isThinking && (
              <div className="typing-indicator">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
                DocMind AI is analyzing the document...
              </div>
            )}
          </div>

          <form className="composer-container" onSubmit={handleSubmit}>
            {activeDocumentId && (
              <div className="suggestions-container">
                <span className="suggestions-label">Suggested Questions:</span>
                <div className="suggestions-list">
                  {EXAMPLE_QUESTIONS.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      className="suggestion-chip"
                      onClick={() => handleSelectQuestion(item)}
                    >
                      <Sparkles size={12} /> {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="composer-wrapper">
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={
                  activeDocumentId
                    ? "Ask a question about this document..."
                    : "Select a document first to start asking questions"
                }
                disabled={!activeDocumentId || isThinking}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (question.trim()) handleSubmit(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!activeDocumentId || isThinking || !question.trim()}
                className="send-button"
                title="Send question"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
