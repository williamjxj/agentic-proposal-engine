#!/bin/bash

# Railway Setup Helper Script
# This script helps you set up your Railway deployment step by step

set -e

echo "=========================================="
echo "  Railway Deployment Setup Helper"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI is not installed${NC}"
    echo ""
    echo "Install it with one of the following commands:"
    echo "  npm install -g @railway/cli"
    echo "  brew install railway"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI found${NC}"
echo ""

# Login check
echo "Step 1: Checking Railway login status..."
if railway whoami &> /dev/null; then
    echo -e "${GREEN}✅ Already logged in to Railway${NC}"
    railway whoami
else
    echo -e "${YELLOW}🔐 Please log in to Railway...${NC}"
    railway login
fi
echo ""

# Check if already linked to a project
echo "Step 2: Checking Railway project..."
if railway status &> /dev/null; then
    echo -e "${GREEN}✅ Already linked to a Railway project${NC}"
    railway status
    echo ""
    read -p "Do you want to use a different project? (y/N): " use_different
    if [[ $use_different =~ ^[Yy]$ ]]; then
        railway unlink
        railway link
    fi
else
    echo -e "${YELLOW}📦 Creating/linking Railway project...${NC}"
    railway init
fi
echo ""

# List current services
echo "Step 3: Current services in your project:"
railway service
echo ""

# Offer to add PostgreSQL
read -p "${BLUE}Add PostgreSQL database? (Y/n): ${NC}" add_postgres
if [[ ! $add_postgres =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}Adding PostgreSQL...${NC}"
    echo "Run this command in Railway dashboard or CLI:"
    echo "  railway add --database postgresql"
    echo ""
    echo "Or visit: https://railway.app/project/new/database"
    echo ""
    read -p "Press Enter when PostgreSQL is added..."
fi

# Offer to run migrations
read -p "${BLUE}Run database migrations now? (Y/n): ${NC}" run_migrations
if [[ ! $run_migrations =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}Running migrations...${NC}"
    railway run python backend/scripts/run_migrations.py
fi
echo ""

# Display next steps
echo ""
echo -e "${GREEN}=========================================="
echo "  Setup Complete! 🎉"
echo -e "==========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Add ChromaDB service manually in Railway dashboard:"
echo "   - Click '+ New' → 'Empty Service'"
echo "   - Name: chromadb"
echo "   - Docker Image: chromadb/chroma:latest"
echo "   - Environment Variables:"
echo "     IS_PERSISTENT=TRUE"
echo "     ANONYMIZED_TELEMETRY=FALSE"
echo ""
echo "2. Configure environment variables for your FastAPI service:"
echo "   railway variables"
echo ""
echo "3. Deploy your backend:"
echo "   railway up"
echo ""
echo "4. View logs:"
echo "   railway logs"
echo ""
echo "5. Get your backend URL:"
echo "   railway domain"
echo ""
echo -e "${BLUE}📚 Full guide: docs/railway-deployment-guide.md${NC}"
echo ""
