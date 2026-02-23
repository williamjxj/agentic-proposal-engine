# Proposal Generation Workflow

This diagram illustrates the end-to-end workflow for generating AI-powered proposals.

## Workflow Overview

```mermaid
graph TB
    subgraph "1. Input Collection"
        A[User Inputs]
        B[Project Details]
        C[Requirements]
        D[Budget/Timeline]
    end
    
    subgraph "2. Context Gathering"
        E[Keyword Extraction]
        F[Competitive Analysis]
        G[Web Scraping]
        H[Knowledge Base Search]
    end
    
    subgraph "3. RAG Processing"
        I[Vector Store Query]
        J[Semantic Search]
        K[Retrieve Past Projects]
        L[Extract Relevant Context]
    end
    
    subgraph "4. AI Generation"
        M[Prompt Construction]
        N[LLM API Call]
        O[OpenAI/DeepSeek]
        P[Response streaming]
    end
    
    subgraph "5. Post-Processing"
        Q[Format Output]
        R[Apply Strategy]
        S[Quality Check]
        T[User Review]
    end
    
    subgraph "6. Finalization"
        U[User Edits]
        V[Save Draft]
        W[Export Document]
        X[Submit Proposal]
    end
    
    A --> B --> C --> D
    D --> E
    E --> F --> G
    E --> H
    
    H --> I --> J
    J --> K --> L
    G --> L
    
    L --> M --> N
    N --> O --> P
    
    P --> Q --> R
    R --> S --> T
    
    T --> U --> V
    V --> W --> X
    
    style A fill:#00d4ff,stroke:#333,stroke-width:2px
    style O fill:#10a37f,stroke:#333,stroke-width:2px
    style X fill:#4caf50,stroke:#333,stroke-width:2px
```

## Detailed Workflow Stages

### 1. Input Collection
- User provides project title, description, requirements
- Budget range and timeline constraints
- Platform-specific details (Upwork, Freelancer, etc.)

### 2. Context Gathering
- **Keyword Extraction**: Extract relevant technical keywords from requirements
- **Competitive Analysis**: Analyze competing proposals if available
- **Web Scraping**: Gather real-time market data and trends
- **Knowledge Base Search**: Query stored documents for relevant context

### 3. RAG Processing
- Embed user query into vector space
- Perform semantic search across ChromaDB vector store
- Retrieve top-k most relevant past projects (k=5 default)
- Extract context snippets with metadata

### 4. AI Generation
- Construct optimized prompt with:
  - System instructions
  - Retrieved context from RAG
  - User requirements
  - Bidding strategy parameters
- Stream response from OpenAI GPT-4 or DeepSeek
- Handle token limits and chunking

### 5. Post-Processing
- Format markdown output with proper sections
- Apply bidding strategy (conservative/standard/aggressive)
- Quality checks:
  - Word count validation
  - Required sections present
  - Grammar and spelling
- Present to user for review

### 6. Finalization
- User can edit generated content in rich text editor
- Save multiple draft versions
- Export to PDF/DOCX format
- Submit directly to platform (future feature)

## Key Technologies

- **LangChain**: Orchestration framework for LLM chains
- **ChromaDB**: Vector database for semantic similarity search
- **Playwright**: Web scraping for competitive intelligence
- **FastAPI**: Async API with streaming responses
- **React**: Interactive UI with real-time updates
