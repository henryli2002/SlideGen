#!/bin/bash
# 启动脚本：同时启动后端和前端开发服务器

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 启动 AI PPT 生成器..."
echo ""

# 启动后端
echo "▶ 启动后端 (FastAPI + uvicorn)..."
cd "$PROJECT_ROOT/backend"
source venv/bin/activate

# 加载 .env 文件以获取端口配置
if [ -f .env ]; then
  set -o allexport
  source .env
  set +o allexport
fi

# 使用环境变量中的端口，如果未设置则默认为 8004
uvicorn app.main:app --reload --host 0.0.0.0 --port ${BACKEND_PORT:-8004} &
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
# 注意：此处的端口号来自 backend/.env 文件，如果修改了该文件，这里的显示也会同步更新
echo "  前端：http://localhost:${FRONTEND_PORT:-5173}"
echo "  后端：http://localhost:${BACKEND_PORT:-8004}"
echo "  API 文档：http://localhost:${BACKEND_PORT:-8004}/docs"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 捕获退出信号，清理进程
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '已停止所有服务'" INT TERM

wait
