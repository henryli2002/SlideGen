# 本地图片生成服务接口规范

本文档描述 SlideGen 与本地图片生成服务之间的 HTTP 接口契约。  
你可以基于任意本地模型（Stable Diffusion、FLUX、ComfyUI 等）实现此服务。

---

## 配置方式

在 `backend/.env` 中设置服务地址：

```env
LOCAL_IMAGE_MODEL_URL=http://localhost:8001
```

SlideGen 后端会在图片生成降级时（Pexels 未配置 / Gemini 生成失败）自动调用此服务。

---

## 接口定义

### `POST /generate`

生成一张图片。

#### 请求

- **Method**: `POST`
- **URL**: `http://{your-host}:{port}/generate`
- **Content-Type**: `application/json`

**Request Body:**

```json
{
  "prompt": "technology abstract background",
  "width": 800,
  "height": 450
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `prompt` | string | 是 | 图片描述，来自幻灯片内容关键词，通常为英文单词或短语 |
| `width` | integer | 是 | 目标图片宽度（像素），当前固定为 `800` |
| `height` | integer | 是 | 目标图片高度（像素），当前固定为 `450` |

---

#### 响应

**Content-Type**: `application/json`  
**HTTP 200 OK**

服务可选择以下两种方式之一返回图片：

**方式 A：返回 URL**（推荐，适合服务本身能对外提供图片访问的场景）

```json
{
  "type": "url",
  "data": "http://localhost:8001/outputs/generated_abc123.png"
}
```

**方式 B：返回 Base64 Data URL**（适合无法对外暴露文件访问的场景）

```json
{
  "type": "base64",
  "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `type` | `"url"` \| `"base64"` | 返回类型标识 |
| `data` | string | 方式A：图片的可访问 URL；方式B：完整的 data URL（含 MIME 头） |

---

#### 错误处理

任何 HTTP 4xx / 5xx 状态码或网络超时，SlideGen 将自动跳过并降级到 Picsum 保底图片。  
**无需特殊错误格式**，只要返回非 200 状态码即可。

超时设置：SlideGen 对本地服务的请求超时为 **60 秒**。

---

## 参考实现示例

### 方式一：Stable Diffusion WebUI (AUTOMATIC1111) 包装器

AUTOMATIC1111 自带 API，启动时加 `--api` 参数即可。你可以写一个简单的 FastAPI 代理：

```python
from fastapi import FastAPI
from pydantic import BaseModel
import httpx, base64

app = FastAPI()
SD_API = "http://127.0.0.1:7860"

class GenerateRequest(BaseModel):
    prompt: str
    width: int = 800
    height: int = 450

@app.post("/generate")
async def generate(req: GenerateRequest):
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(f"{SD_API}/sdapi/v1/txt2img", json={
            "prompt": req.prompt + ", high quality, professional, clean background",
            "negative_prompt": "text, watermark, low quality",
            "width": req.width,
            "height": req.height,
            "steps": 20,
            "cfg_scale": 7,
        })
        image_b64 = resp.json()["images"][0]
    return {"type": "base64", "data": f"data:image/png;base64,{image_b64}"}
```

启动：`uvicorn server:app --port 8001`

---

### 方式二：ComfyUI API 包装器

ComfyUI 启动后默认监听 `8188` 端口，可通过 `/prompt` API 提交工作流。  
参考 [ComfyUI API 文档](https://github.com/comfyanonymous/ComfyUI/blob/master/server.py)，将输出图片的 base64 编码后返回。

---

### 方式三：Ollama（如支持图片生成的扩展）

若使用支持图片生成的本地服务，按上述 JSON 格式包装其输出即可。

---

## 注意事项

1. **并发**：SlideGen 可能同时发送多个请求（最多 5 个并发），请确保你的服务能够处理。
2. **图片尺寸**：生成的图片会被 PPTist 前端裁剪适配，不需要精确匹配 800×450，但比例接近 16:9 效果最好。
3. **内容安全**：prompt 来自 LLM 生成的内容关键词，通常是无害的主题词（如 "technology"、"teamwork"）。
4. **Base64 图片大小**：若使用 Base64 方式，建议压缩图片到 500KB 以内，避免 JSON 过大影响流式传输性能。
