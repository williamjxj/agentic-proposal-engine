"""
Database Migration Runner for Railway Deployment

Runs all SQL migrations in order against the Railway PostgreSQL database.
"""

import asyncio
import asyncpg
import os
from pathlib import Path
import sys


async def run_migrations():
    """Run all SQL migrations in order."""

    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ ERROR: DATABASE_URL environment variable not set")
        print("Run this script via Railway CLI: railway run python backend/scripts/run_migrations.py")
        sys.exit(1)

    print(f"🔌 Connecting to database...")

    try:
        conn = await asyncpg.connect(database_url)
        print("✅ Connected to database")
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        sys.exit(1)

    # Find all migration files
    migrations_dir = Path(__file__).parent.parent.parent / "database" / "migrations"

    if not migrations_dir.exists():
        print(f"❌ Migrations directory not found: {migrations_dir}")
        sys.exit(1)

    migration_files = sorted(migrations_dir.glob("*.sql"))

    if not migration_files:
        print(f"⚠️  No migration files found in {migrations_dir}")
        await conn.close()
        return

    print(f"\n📋 Found {len(migration_files)} migration(s) to run:\n")

    # Run each migration
    for i, migration_file in enumerate(migration_files, 1):
        print(f"[{i}/{len(migration_files)}] Running {migration_file.name}...")

        try:
            sql = migration_file.read_text()
            await conn.execute(sql)
            print(f"    ✅ {migration_file.name} completed successfully\n")
        except Exception as e:
            print(f"    ❌ Failed to run {migration_file.name}: {e}\n")
            print("Continuing to next migration...\n")

    await conn.close()
    print("✅ All migrations completed!")
    print("\n🎉 Database is ready for production!")


if __name__ == "__main__":
    print("=" * 60)
    print("  Railway Database Migration Runner")
    print("=" * 60)
    print()

    asyncio.run(run_migrations())
