#!/usr/bin/env python3
"""
Test script to verify ChromaDB hybrid mode is working correctly.

Usage:
    python test_chromadb_hybrid.py
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.vector_store import vector_store
from app.config import settings


def main():
    print("=" * 60)
    print("ChromaDB Hybrid Mode Test")
    print("=" * 60)

    # 1. Show configuration
    print("\n📋 Current Configuration:")
    print(f"   CHROMA_HOST: {settings.chroma_host or '(not set)'}")
    print(f"   CHROMA_PORT: {settings.chroma_port}")
    print(f"   CHROMA_PERSIST_DIR: {settings.chroma_persist_dir}")

    # 2. Show which mode is active
    print(f"\n🔧 Active Mode: {vector_store.mode.upper()}")

    if vector_store.mode == "http":
        print(f"   ✅ Connected to Docker ChromaDB at {settings.chroma_host}:{settings.chroma_port}")
    else:
        print(f"   ✅ Using local file-based ChromaDB at {settings.chroma_persist_dir}")

    # 3. Test connection by listing collections
    print("\n📦 Testing Connection...")
    try:
        collections = vector_store.client.list_collections()
        print(f"   ✅ Success! Found {len(collections)} collection(s)")

        if collections:
            print("\n   Collections:")
            for col in collections:
                count = col.count()
                print(f"     - {col.name}: {count} documents")
        else:
            print("   (No collections yet - this is normal for a fresh install)")

    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
        print("\n💡 Troubleshooting tips:")
        if vector_store.mode == "http":
            print("   - Is Docker ChromaDB running? Check with: docker ps | grep chromadb")
            print("   - Can you reach it? Test with: curl http://localhost:8001/api/v1/")
        else:
            print("   - Check if directory exists: ls -la ./chroma_db")
            print("   - Check permissions on ./chroma_db directory")
        return 1

    # 4. Show recommendations
    print("\n" + "=" * 60)
    print("📊 Summary:")
    print("=" * 60)

    if vector_store.mode == "http":
        print("✅ Using Docker ChromaDB (production-ready mode)")
        print("\n💡 Tips:")
        print("   - Data is stored in Docker volume 'chromadb_data'")
        print("   - Multiple backend instances can share this ChromaDB")
        print("   - Backup: docker run --rm -v chromadb_data:/data -v $(pwd):/backup ubuntu tar czf /backup/chromadb-backup.tar.gz /data")
    else:
        print("✅ Using Local ChromaDB (development mode)")
        print("\n💡 Tips:")
        print("   - Data is in ./chroma_db directory")
        print("   - To switch to Docker mode, set CHROMA_HOST=localhost in .env")
        print("   - Backup: tar czf chromadb-backup.tar.gz ./chroma_db")

    print("\n✨ ChromaDB is ready to use!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
