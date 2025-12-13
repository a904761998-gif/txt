from PIL import Image, ImageDraw
import os

def create_icon(size, filename):
    """创建现代风格的渐变图标"""
    # 创建带透明度的图像
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 绘制圆角矩形背景（渐变效果通过多个圆形叠加模拟）
    margin = size // 8
    rect_size = size - 2 * margin
    
    # 绘制渐变背景 - 从蓝紫到粉橙
    for i in range(rect_size):
        progress = i / rect_size
        # 渐变色计算
        r = int(102 + (255 - 102) * progress)
        g = int(126 + (152 - 126) * progress)
        b = int(234 + (0 - 234) * progress)
        color = (r, g, b, 255)
        
        # 绘制渐变层
        draw.rectangle(
            [margin, margin + i, margin + rect_size, margin + i + 1],
            fill=color
        )
    
    # 圆角处理
    corner_radius = size // 5
    # 创建圆角遮罩
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        [margin, margin, margin + rect_size, margin + rect_size],
        radius=corner_radius,
        fill=255
    )
    
    # 应用遮罩
    output = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    output.paste(img, (0, 0), mask)
    
    # 绘制图标符号 - 一个现代化的文档/工具图标
    icon_margin = size // 3
    icon_size = size - 2 * icon_margin
    
    # 绘制白色的文档符号
    symbol_draw = ImageDraw.Draw(output)
    
    # 绘制三条横线（代表文本/工具）
    line_height = icon_size // 8
    line_spacing = icon_size // 4
    line_color = (255, 255, 255, 220)
    
    for i in range(3):
        y = icon_margin + i * line_spacing + line_height
        symbol_draw.rounded_rectangle(
            [icon_margin + line_height, y, 
             size - icon_margin - line_height, y + line_height],
            radius=line_height // 2,
            fill=line_color
        )
    
    # 保存图标
    output.save(filename, 'PNG')
    print(f"Created {filename}")

# 创建图标目录
icon_dir = os.path.join(os.path.dirname(__file__), 'icons')

# 创建不同尺寸的图标
create_icon(16, os.path.join(icon_dir, 'icon16.png'))
create_icon(48, os.path.join(icon_dir, 'icon48.png'))
create_icon(128, os.path.join(icon_dir, 'icon128.png'))

print("所有图标创建完成！")
