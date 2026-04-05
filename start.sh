#!/bin/bash
# 启动脚本：同时启动后端和前端开发服务器

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

# 加载 .env 获取端口配置
cd "$PROJECT_ROOT/backend"
if [ -f .env ]; then
  set -o allexport
  source .env
  set +o allexport
fi
BACKEND_PORT=${BACKEND_PORT:-8004}
FRONTEND_PORT=${FRONTEND_PORT:-5173}

# 按端口+进程名杀进程，避免误杀无关程序
kill_by_port() {
  local port=$1
  local name=$2
  lsof -i :$port -sTCP:LISTEN 2>/dev/null | awk -v n="$name" 'NR>1 && tolower($1)~n {print $2}' | sort -u | while read pid; do
    kill -9 "$pid" 2>/dev/null && echo "  已终止 $name 进程 (PID: $pid, 端口: $port)"
  done
}

cleanup() {
  echo ""
  echo "正在停止所有服务..."
  kill_by_port $BACKEND_PORT "python"
  kill_by_port $FRONTEND_PORT "node"
  echo "已停止所有服务"
}

trap cleanup INT TERM EXIT

echo "🚀 启动 AI PPT 生成器..."
echo ""

# 先清理可能残留的旧进程（仅杀 Python/Node）
kill_by_port $BACKEND_PORT "python"
kill_by_port $FRONTEND_PORT "node"
sleep 1

# 启动后端
echo "▶ 启动后端 (FastAPI + uvicorn)..."
cd "$PROJECT_ROOT/backend"
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port $BACKEND_PORT &
BACKEND_PID=$!
echo "  后端 PID: $BACKEND_PID"

# 等待后端启动
sleep 2

# 启动前端
echo "▶ 启动前端 (Vite)..."
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
echo "  前端 PID: $FRONTEND_PID"

echo ""
echo "✅ 服务已启动："
echo "  前端：http://localhost:$FRONTEND_PORT"
echo "  后端：http://localhost:$BACKEND_PORT"
echo "  API 文档：http://localhost:$BACKEND_PORT/docs"
echo ""
echo "按 Ctrl+C 停止所有服务"

wait
