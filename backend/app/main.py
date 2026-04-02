"""
SlideGen 后端主入口

提供 AI 幻灯片内容流式生成 API，输出 PPTist AIPPT 格式数据。
PPTX/PDF 导出由 PPTist 前端内置功能处理，后端不再参与导出。
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import generate

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

logger = logging.getLogger(__name__)

# 创建 FastAPI 实例
app = FastAPI(
    title="SlideGen — AI 幻灯片生成后端",
    description="通过大模型流式生成 PPTist AIPPT 格式的幻灯片内容",
    version="3.0.0"
)

# 配置 CORS（开发环境允许 Vite 默认端口）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载路由
app.include_router(generate.router)


@app.get("/")
async def health_check():
    """健康检查接口"""
    return {
        "status": "ok",
        "version": "3.0.0",
        "message": "SlideGen 后端运行正常（PPTist AIPPT 模式）",
    }
