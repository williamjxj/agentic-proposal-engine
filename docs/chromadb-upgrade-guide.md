# ChromaDB Version Upgrade Guide 🔄

**Issue**: ChromaDB Docker container uses v2 API, but Python client v0.4.22 uses v1 API  
**Solution**: Upgrade Python chromadb package to v0.5.0+

---

## Quick Summary

Your system is currently using:
- ✅ **Local ChromaDB** (working) - 7 collections with data
- ⏸️ **Docker ChromaDB** (available but incompatible) - needs client upgrade

---

## Option 1: Keep Using Local Mode (Current - No Action Needed) ✅

**Status**: Already working  
**Best for**: Development, single developer

Your current setup:
```bash
# .env
CHROMA_PERSIST_DIR=./chroma_db
# CHROMA_HOST=          # Commented out
```

**Pros**:
- ✅ Working now
- ✅ Simple and fast
- ✅ Data already exists (7 collections)

---

## Option 2: Upgrade to Docker Mode (Future - Recommended for Production)

### Step 1: Upgrade ChromaDB Python Client

```bash
# Activate venv
cd /Users/william.jiang/my-apps/auto-bidder/backend
source venv/bin/activate  # or `. venv/bin/activate`

# Check current version
pip show chromadb | grep Version
# Should show: Version: 0.4.22

# Upgrade to latest (v0.5.x supports v2 API)
pip install --upgrade chromadb

# Verify upgrade
pip show chromadb | grep Version
# Should show: Version: 0.5.x or higher

# Update requirements
pip freeze | grep chromadb >> requirements.txt
```

### Step 2: Migrate Data (Optional but Recommended)

If you want to use Docker ChromaDB with your existing data:

```python
#!/usr/bin/env python3
"""
Migrate ChromaDB data from local to Docker.
Run AFTER upgrading chromadb package.
"""

import chromadb
from pathlib import Path

# Source: Local ChromaDB
local_client = chromadb.PersistentClient(path="./chroma_db")

# Destination: Docker ChromaDB
docker_client = chromadb.HttpClient(host='localhost', port=8001)

# Get all collections
collections = local_client.list_collections()

print(f"Found {len(collections)} collections to migrate:")

for col in collections:
    print(f"\nMigrating: {col.name}")
    count = col.count()
    
    if count == 0:
        print(f"  Skipping (empty collection)")
        continue
    
    # Get all data from source
    data = col.get()
    
    # Create collection in destination
    dest_col = docker_client.get_or_create_collection(
        name=col.name,
        metadata=col.metadata
    )
    
    # Add data in batches
    batch_size = 100
    for i in range(0, len(data['ids']), batch_size):
        batch_ids = data['ids'][i:i+batch_size]
        batch_embeddings = data['embeddings'][i:i+batch_size] if data['embeddings'] else None
        batch_documents = data['documents'][i:i+batch_size] if data['documents'] else None
        batch_metadatas = data['metadatas'][i:i+batch_size] if data['metadatas'] else None
        
        dest_col.add(
            ids=batch_ids,
            embeddings=batch_embeddings,
            documents=batch_documents,
            metadatas=batch_metadatas
        )
    
    print(f"  ✅ Migrated {count} documents")

print("\n✨ Migration complete!")
```

Save as `backend/migrate_chromadb.py` and run:

```bash
python migrate_chromadb.py
```

### Step 3: Enable Docker Mode

Update `.env`:

```bash
# ChromaDB Configuration (Hybrid Mode)
# CHROMA_PERSIST_DIR=./chroma_db  # Comment out local mode

# Enable Docker mode:
CHROMA_HOST=localhost
CHROMA_PORT=8001
```

### Step 4: Restart and Test

```bash
# Restart backend
pkill -f uvicorn     # or Ctrl+C if running in terminal
uvicorn app.main:app --reload

# Test
python test_chromadb_hybrid.py
```

Expected output:
```
🔧 Active Mode: HTTP
   ✅ Connected to Docker ChromaDB at localhost:8001
```

---

## Docker ChromaDB Version Info

Check your Docker image version:

```bash
# Check running container
docker inspect auto-bidder-chromadb | grep 'Image'

# Pull latest ChromaDB (if needed)
docker-compose pull chromadb
docker-compose up -d chromadb
```

---

## Troubleshooting

### Error: "v1 API is deprecated"

**Cause**: Python client too old  
**Fix**: Upgrade chromadb: `pip install --upgrade chromadb`

### Error: "Could not connect to tenant"

**Cause**: Version mismatch or ChromaDB not running  
**Fix**: 
1. Check Docker: `docker ps | grep chromadb`
2. Upgrade client: `pip install chromadb>=0.5.0`
3. Restart both services

### Error: "Connection refused"

**Cause**: Docker ChromaDB not running  
**Fix**: `docker-compose up -d chromadb`

---

## Current Status

✅ **System is working** with local mode  
⏭️ **Optional upgrade** to Docker mode for production benefits  
📊 **Data safe** in `./chroma_db` directory  

---

## Recommendations

### For Now (Development)
✅ **Keep using local mode** - It's working perfectly

### For Production (Future)
1. Upgrade chromadb to v0.5.x+
2. Migrate data to Docker
3. Enable Docker mode in .env
4. Get benefits of containerization

---

## Questions?

Run test: `python backend/test_chromadb_hybrid.py`  
Check logs: `tail -f app.log` (or wherever your logs go)  
Verify Docker: `docker logs auto-bidder-chromadb`
