# GojoAssistant Simple —— 后端服务
# 放在仓库根目录，这样 Zeabur 无需配置 Root Directory 即可直接部署
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# 先只拷依赖清单，最大化利用 Docker 层缓存（改业务代码不会重装依赖）
COPY gojo_pub-main/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 再拷源码
COPY gojo_pub-main/ ./gojo_pub-main/

# backend/ 下的模块是扁平导入（import config / from db import ...）
# 必须把 backend 作为工作目录，否则 sys.path 找不到模块
WORKDIR /app/gojo_pub-main/backend

EXPOSE 8080

# Zeabur 会注入 PORT，本地/兜底用 8080
CMD ["sh", "-c", "python -m uvicorn gojo_server:app --host 0.0.0.0 --port ${PORT:-8080}"]
