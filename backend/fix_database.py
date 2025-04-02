"""
数据库修复脚本 - 为documents表添加缺少的列
"""
import os
import sys
from sqlalchemy import create_engine, text

sys.path.append(os.path.abspath('.'))
from app.core.config import settings

def main():
    """添加缺少的列到documents表"""
    # 创建数据库连接
    print("正在连接数据库...")
    
    # 从设置中提取数据库连接信息
    db_url = str(settings.SQLALCHEMY_DATABASE_URI)
    print(f"使用数据库连接: {db_url}")
    
    engine = create_engine(db_url)
    
    # 定义需要添加的列
    columns_to_add = [
        ("filename", "VARCHAR"),
        ("file_size", "INTEGER DEFAULT 0"),
        ("text_content", "TEXT"),
        ("is_processed", "BOOLEAN DEFAULT false"),
        ("vectorized", "BOOLEAN DEFAULT false")
    ]
    
    # 先检查表是否存在
    with engine.connect() as conn:
        check_table = text("""
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'documents';
        """)
        
        has_table = conn.execute(check_table).fetchone()
        if not has_table:
            print("documents表不存在，无需修复")
            return
    
    # 检查content列是否存在，如果存在需要重命名为text_content
    with engine.connect() as conn:
        with conn.begin():
            # 检查content列是否存在
            check_content = text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'documents' AND column_name = 'content';
            """)
            
            has_content = conn.execute(check_content).fetchone()
            
            if has_content:
                print("将 content 列重命名为 text_content...")
                try:
                    conn.execute(text("ALTER TABLE documents RENAME COLUMN content TO text_content;"))
                    print("列重命名成功")
                    # 如果重命名成功，则不需要再添加text_content
                    columns_to_add = [col for col in columns_to_add if col[0] != "text_content"]
                except Exception as e:
                    print(f"重命名列失败: {str(e)}")
    
    # 添加缺少的列
    with engine.connect() as conn:
        with conn.begin():
            for column_name, column_type in columns_to_add:
                # 检查列是否存在
                check_query = text(f"""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'documents' AND column_name = '{column_name}';
                """)
                
                result = conn.execute(check_query).fetchone()
                if not result:
                    print(f"添加 {column_name} 列...")
                    try:
                        conn.execute(text(f"ALTER TABLE documents ADD COLUMN {column_name} {column_type};"))
                        print(f"{column_name} 列添加成功")
                    except Exception as e:
                        print(f"添加 {column_name} 列失败: {str(e)}")
                else:
                    print(f"{column_name} 列已存在")
    
    print("数据库修复完成!")

if __name__ == "__main__":
    main() 