#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════╗
# ║     Administration Management Plan System Setup Script         ║
# ║   Creates a fresh instance with clean database                ║
# ╚═══════════════════════════════════════════════════════════════╝

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Administration Management Plan System (AMPS) Setup            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Get the directory where this script is located (source project)
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"

# Prompt for project name
echo -e "${YELLOW}Enter project name (default: plan-administration-management-system):${NC}"
read -r PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-plan-administration-management-system}

# Prompt for destination directory
echo -e "${YELLOW}Enter destination directory (default: ~/Desktop):${NC}"
read -r DEST_DIR
DEST_DIR=${DEST_DIR:-~/Desktop}
DEST_DIR=$(eval echo "$DEST_DIR")  # Expand ~

# Full target path
TARGET_PATH="$DEST_DIR/$PROJECT_NAME"

echo ""
echo -e "${BLUE}📁 Creating project at: ${GREEN}$TARGET_PATH${NC}"
echo ""

# Check if target already exists
if [ -d "$TARGET_PATH" ]; then
    echo -e "${RED}❌ Error: Directory already exists: $TARGET_PATH${NC}"
    echo -e "${YELLOW}Remove it first or choose a different name.${NC}"
    exit 1
fi

# Create destination directory
mkdir -p "$TARGET_PATH"

# Copy project files (EXCLUDING node_modules, database, and uploads)
echo -e "${BLUE}📋 Copying project files...${NC}"
rsync -av --progress "$SOURCE_DIR/" "$TARGET_PATH/" \
    --exclude 'node_modules' \
    --exclude 'server/node_modules' \
    --exclude 'server/calendar.db' \
    --exclude 'server/calendar.db-shm' \
    --exclude 'server/calendar.db-wal' \
    --exclude 'server/uploads/*' \
    --exclude '.git' \
    --exclude 'dist' \
    > /dev/null 2>&1

# Navigate to new project
cd "$TARGET_PATH"

# Ensure uploads directory exists
mkdir -p server/uploads

# Install frontend dependencies (fresh install)
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
npm install

# Install server dependencies (fresh install)
echo -e "${BLUE}📦 Installing server dependencies...${NC}"
cd server && npm install && cd ..

# Success message
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ Setup Complete!                               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📍 Project location:${NC} $TARGET_PATH"
echo ""
echo -e "${YELLOW}🚀 To start the app:${NC}"
echo ""
echo "   # Terminal 1 - Start the server"
echo "   cd $TARGET_PATH/server && node index.js"
echo ""
echo "   # Terminal 2 - Start the frontend"
echo "   cd $TARGET_PATH && npm run dev"
echo ""
echo -e "${YELLOW}🔗 URLs:${NC}"
echo "   Frontend:    http://localhost:5173"
echo "   Admin Panel: http://localhost:3001"
echo ""
echo -e "${YELLOW}👤 Default Admin:${NC}"
echo "   Username: admin"
echo "   Password: admin123"
echo ""

# Ask if user wants to start the app now
echo -e "${YELLOW}Start the app now? (y/n):${NC}"
read -r START_NOW

if [ "$START_NOW" = "y" ] || [ "$START_NOW" = "Y" ]; then
    echo -e "${BLUE}🚀 Starting server...${NC}"
    cd "$TARGET_PATH/server"
    node index.js &
    SERVER_PID=$!
    sleep 2
    
    echo -e "${BLUE}🚀 Starting frontend...${NC}"
    cd "$TARGET_PATH"
    npm run dev &
    FRONTEND_PID=$!
    
    echo ""
    echo -e "${GREEN}✅ App is running!${NC}"
    echo -e "   Server PID: $SERVER_PID"
    echo -e "   Frontend PID: $FRONTEND_PID"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop both processes${NC}"
    
    # Wait for user to stop
    wait
fi
