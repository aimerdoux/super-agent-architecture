# Self-Evolving Agent Setup Guide

## Vision
Build a personalized, multi-task agent that evolves through:
- **Skills**: Extendable capabilities
- **Heartbeat**: Self-improvement loops
- **Memory**: Persistent learning via Pinecone RAG

## API Keys Used (Target: ≤10)
1. **Pinecone** - Vector database for semantic memory (REQUIRED)
   - Index: `clawdoux`
   - Environment: `us-west1-gcp`
   - API Key: `pcsk_3vcgcX_Q4VziHP7A8pGRhaCAPeFgro2jAUCJrVTArQQMBpDFM3ujeeUgefyAhsqq3TWXdp`
2. OpenAI - OPTIONAL (using local Ollama instead)

## Prerequisites
- OpenClaw installed
- Ollama running locally (for embeddings)
- Pinecone account + index created

## Step-by-Step Setup

### 1. Install Ollama
```bash
# Windows
winget install Ollama.Ollama

# Start Ollama
ollama serve

# Pull embedding model
ollama pull nomic-embed-text
```

### 2. Create Pinecone Index
1. Go to pinecone.io
2. Create index: `clawdoux`
3. Dimension: 768 (nomic-embed-text)
4. Metric: cosine

### 3. Configure OpenClaw
```bash
openclaw config patch --raw
```

Paste the following configuration:
```json
{
  "skills": {
    "pinecone-memory": {
      "enabled": true,
      "config": {
        "apiKey": "your-pinecone-api-key",
        "environment": "your-environment",
        "indexName": "clawdoux"
      }
    }
  }
}
```

### 4. Test Memory
```bash
# Test storing a memory
openclaw skill run pinecone-memory memory_index --text "Test memory from setup" --metadata "{\"source\": \"setup-test\"}"

# Test recalling memories
openclaw skill run pinecone-memory memory_recall --query "setup test"
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenClaw Core                            │
├─────────────────────────────────────────────────────────────┤
│  Skills Layer                                                │
│  ├── pinecone-memory (RAG storage & retrieval)              │
│  └── [Your custom skills here]                              │
├─────────────────────────────────────────────────────────────┤
│  Memory Layer                                                │
│  ├── Pinecone Vector DB (768-dim embeddings via Ollama)     │
│  └── Local file system (daily logs, MEMORY.md)              │
├─────────────────────────────────────────────────────────────┤
│  Heartbeat Layer                                             │
│  ├── Self-improvement loops                                  │
│  └── Proactive checks (email, calendar, etc.)               │
└─────────────────────────────────────────────────────────────┘
```

### Key Components
- **pinecone-memory skill**: Handles embedding generation (Ollama) and vector storage (Pinecone)
- **Ollama**: Local embedding service (nomic-embed-text, 768 dimensions, 8192 context)
- **Pinecone**: Cloud vector database for persistent semantic memory

## Self-Improvement Loop

The agent evolves through:

1. **Memory Indexing**: Store important decisions, facts, and context
2. **Memory Recall**: Retrieve relevant past context for current tasks
3. **Memory Summary**: Extract and index key points from conversations
4. **Heartbeat Checks**: Regular self-assessment and improvement triggers

### Example: Memory Summary Workflow
```javascript
// Extract key points from a conversation transcript
await memory_summary({
  transcript: conversationText,
  sessionId: "session-123",
  maxPoints: 10
});
```

## Troubleshooting

### Ollama Issues
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve

# Verify model is pulled
ollama list
```

### Pinecone Issues
- Ensure your API key has the correct permissions
- Verify index name matches configuration
- Check environment matches your Pinecone console

### Embedding Errors
- Confirm `nomic-embed-text` is pulled: `ollama list`
- Check Ollama is listening on port 11434
- Verify no firewall is blocking local requests

### Common Error Messages
- `Ollama embedding failed: Connection refused` → Ollama not running
- `Pinecone authentication failed` → Check API key
- `Index not found` → Verify index name in config
