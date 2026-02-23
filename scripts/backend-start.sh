#!/bin/bash

cd ~/my-apps/auto-bidder/backend/

pkill -f "uvicorn app.main:app"  # Stop current server

source venv/bin/activate

uvicorn app.main:app --reload --port 8000
