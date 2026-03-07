# ChromaDB Setup Guide - Hybrid Mode 🔄

**Last Updated**: March 7, 2026  
**Status**: Hybrid mode now supported

---

## Overview

The auto-bidder platform now supports **two ChromaDB deployment modes**:

1. **Local File-Based** (PersistentClient) - For development
2. **Docker HTTP** (HttpClient) - For production/scaling

The mode is automatically selected based on environment configuration.

---

## 🔀 Mode Selection Logic

The system decides which mode to use based on `.env` configuration:

```python
if CHROMA_HOST is set:
    ✅ Use HTTP Client → Connect to Docker ChromaDB
else:
    ✅ Use Persistent Client → Local file-based ChromaDB
```

**Priority**: `CHROMA_HOST` takes precedence. If set (even to empty string), it attempts HTTP connection.

---

## 🛠️ Mode 1: Local File-Based (Development)

### When to Use
- ✅ Local development and debugging
- ✅ Single developer environment
- ✅ Testing and experimentation
- ✅ No Docker overhead needed

### Configuration

**backend/.env**:
```bash
# ChromaDB Configuration
# CHROMA_HOST=                  # Leave unset or comment out
CHROMA_PERSIST_DIR=./chroma_db  # Local storage directory
EMBED_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

### Data Location
```
backend/chroma_db/
├── chroma.sqlite3                          # ChromaDB metadata
└── <collection_uuid>/                      # User collections
    ├── data_level0.bin
    ├── header.bin
    ├── index_metadata.pickle
    └── ...
```

### Pros & Cons

**Pros**:
- ✅ Simple setup (no Docker needed)
- ✅ Fast access (no network overhead)
- ✅ Easy to inspect/debug
- ✅ Portable (commit to git for small datasets)

**Cons**:
- ❌ Not scalable (single process only)
- ❌ No isolation (shares filesystem)
- ❌ Harder to backup/replicate

---

## 🐳 Mode 2: Docker HTTP (Production)

### When to Use
- ✅ Production deployments
- ✅ Multiple backend instances (load balancing)
- ✅ Containerized environments
- ✅ Need isolation and scaling
- ✅ Team collaboration (shared ChromaDB)

### Configuration

**backend/.env**:
```bash
# ChromaDB Configuration
CHROMA_HOST=localhost           # For local Docker: localhost
                                # For Docker Compose network: chromadb
CHROMA_PORT=8001               # External port (8001 → 8000 internal)
# CHROMA_PERSIST_DIR is ignored when CHROMA_HOST is set
EMBED_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

### Docker Setup

**1. Start ChromaDB container**:

```bash
# Using docker-compose (recommended)
docker-compose up -d chromadb

# Or direct docker run
docker run -d \
  --name auto-bidder-chromadb \
  -p 8001:8000 \
  -v chromadb_data:/chroma/chroma \
  -e IS_PERSISTENT=TRUE \
  -e ANONYMIZED_TELEMETRY=FALSE \
  chromadb/chroma:latest
```

**2. Verify it's running**:

```bash
# Check container status
docker ps | grep chromadb

# Test HTTP endpoint
curl http://localhost:8001/api/v1/heartbeat
# Should return: {"nanosecond heartbeat": <timestamp>}
```

**3. Update backend .env**:

```bash
CHROMA_HOST=localhost
CHROMA_PORT=8001
```

**4. Restart backend**:

```bash
# Backend will now connect to Docker ChromaDB via HTTP
uvicorn app.main:app --reload
```

### Data Location

Data is stored in Docker volume:

```bash
# List volumes
docker volume ls | grep chromadb

# Inspect volume
docker volume inspect chromadb_data

# Location (typically):
# Mac/Linux: /var/lib/docker/volumes/chromadb_data/_data
# Windows: \\wsl$\docker-desktop-data\version-pack-data\community\docker\volumes\chromadb_data\_data
```

### Pros & Cons

**Pros**:
- ✅ Scalable (multiple backend instances)
- ✅ Isolated (containerized)
- ✅ Easy backup (Docker volumes)
- ✅ Production-ready

**Cons**:
- ❌ Requires Docker
- ❌ Network overhead (slight latency)
- ❌ More complex setup

---

## 🔄 Switching Between Modes

### From Local → Docker

**Step 1: Export existing data** (if you have data in `backend/chroma_db/`):

```python
# backend/scripts/export_chromadb.py
import chromadb
from pathlib import Path

# Connect to local ChromaDB
local_client = chromadb.PersistentClient(path="./chroma_db")

# Get all collections
collections = local_client.list_collections()

print(f"Found {len(collections)} collections:")
for col in collections:
    count = col.count()
    print(f"  - {col.name}: {count} documents")

# Export logic (manual or automated)
# TODO: Implement export/import if needed
```

**Step 2: Start Docker ChromaDB**:

```bash
docker-compose up -d chromadb
```

**Step 3: Import data** (if needed):

```python
# backend/scripts/import_to_docker_chromadb.py
import chromadb

# Connect to Docker ChromaDB
docker_client = chromadb.HttpClient(host='localhost', port=8001)

# Import collections
# TODO: Implement import logic
```

**Step 4: Update .env**:

```bash
# Comment out or remove CHROMA_PERSIST_DIR
# CHROMA_PERSIST_DIR=./chroma_db

# Add Docker connection
CHROMA_HOST=localhost
CHROMA_PORT=8001
```

**Step 5: Restart backend**:

```bash
uvicorn app.main:app --reload
```

---

### From Docker → Local

**Step 1: Update .env**:

```bash
# Comment out Docker settings
# CHROMA_HOST=localhost
# CHROMA_PORT=8001

# Add local path
CHROMA_PERSIST_DIR=./chroma_db
```

**Step 2: Restart backend**:

```bash
uvicorn app.main:app --reload
```

---

## 🏗️ Production Deployment Patterns

### Pattern 1: Docker Compose (Recommended)

```yaml
# docker-compose.yml
services:
  chromadb:
    image: chromadb/chroma:latest
    volumes:
      - chromadb_data:/chroma/chroma
    environment:
      - IS_PERSISTENT=TRUE
    networks:
      - app-network
  
  backend:
    build: ./backend
    environment:
      - CHROMA_HOST=chromadb    # Use service name
      - CHROMA_PORT=8000        # Internal port (no mapping needed)
    depends_on:
      - chromadb
    networks:
      - app-network

volumes:
  chromadb_data:

networks:
  app-network:
```

### Pattern 2: Kubernetes

```yaml
# chromadb-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: chromadb
spec:
  ports:
    - port: 8000
  selector:
    app: chromadb
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chromadb
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: chromadb
        image: chromadb/chroma:latest
        env:
        - name: IS_PERSISTENT
          value: "TRUE"
        volumeMounts:
        - name: data
          mountPath: /chroma/chroma
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: chromadb-pvc
```

Backend deployment:
```yaml
# backend-deployment.yaml
env:
  - name: CHROMA_HOST
    value: "chromadb"     # K8s service name
  - name: CHROMA_PORT
    value: "8000"
```

---

## 🔍 Troubleshooting

### Issue: "Connection refused" when using Docker mode

**Solution**:

1. Check ChromaDB is running:
   ```bash
   docker ps | grep chromadb
   ```

2. Check port mapping:
   ```bash
   docker port auto-bidder-chromadb
   # Should show: 8000/tcp -> 0.0.0.0:8001
   ```

3. Test endpoint:
   ```bash
   curl http://localhost:8001/api/v1/heartbeat
   ```

4. Check backend logs for connection errors

---

### Issue: "Collection not found" after switching modes

**Cause**: Data exists in one mode but not the other

**Solution**: Migrate data using export/import scripts (see switching guides above)

---

### Issue: Both CHROMA_HOST and CHROMA_PERSIST_DIR set

**Behavior**: `CHROMA_HOST` takes precedence - uses HTTP client

**Solution**: Comment out the one you don't want to use

---

## 📊 Current Status

To check which mode is currently active:

```bash
# Check backend logs on startup
uvicorn app.main:app --reload

# Look for log message:
# "ChromaDB HTTP client connected to localhost:8001"  → Docker mode
# "ChromaDB PersistentClient initialized at ./chroma_db"  → Local mode
```

Or check programmatically:

```python
from app.services.vector_store import vector_store

print(f"ChromaDB Mode: {vector_store.mode}")
# Outputs: "http" or "persistent"
```

---

## 📝 Recommendations

### For Development
- ✅ Use **Local mode** (PersistentClient)
- ✅ Faster iteration, easier debugging
- ✅ No Docker overhead

### For Production
- ✅ Use **Docker mode** (HttpClient)
- ✅ Better isolation and scalability
- ✅ Easier to backup and replicate

### For Teams
- ✅ Use **Docker mode** with shared instance
- ✅ All developers connect to same ChromaDB
- ✅ Consistent data across team

---

## 🔐 Security Notes

### Local Mode
- Data stored in plain text in `backend/chroma_db/`
- Accessible to anyone with filesystem access
- Don't commit sensitive data to git

### Docker Mode
- Network access required (HTTP)
- Secure with authentication in production:
  ```bash
  # ChromaDB supports authentication (enterprise feature)
  docker run -e CHROMA_AUTH_PROVIDER=basic \
             -e CHROMA_AUTH_CREDENTIALS=user:password \
             chromadb/chroma:latest
  ```

---

## 🚀 Next Steps

1. ✅ **Current setup works** - Hybrid mode now supported
2. ⏭️ **Choose your mode** - Update .env based on your needs
3. ⏭️ **Migrate data** (optional) - If switching modes
4. ⏭️ **Set up backups** - Especially for production Docker mode
5. ⏭️ **Monitor performance** - Check logs for any connection issues

---

**Questions or issues?** Check backend logs for ChromaDB connection details.
