import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import generate, export

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

logger = logging.getLogger(__name__)

# 创建 FastAPI 实例
app = FastAPI(
    title="AI PPT 生成器",
    description="通过大模型实时流式生成幻灯片内容",
    version="1.0.0"
)

# 配置 CORS（开发环境允许 Vite 默认端口）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载路由
app.include_router(generate.router)
app.include_router(export.router)


@app.get("/")
async def health_check():
    """健康检查接口"""
    return {"status": "ok", "message": "AI PPT 生成器后端运行正常"}
