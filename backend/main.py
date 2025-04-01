import uvicorn
from app.api.app import create_app
from app.core.init_data import init_app_data

app = create_app()

@app.on_event("startup")
def startup_event():
    """应用启动时的事件处理"""
    # 初始化默认数据
    init_app_data()

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 