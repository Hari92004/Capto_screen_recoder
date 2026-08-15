from PIL import Image, ImageDraw
import os

img_path = r"d:\Abtalks\Fligo\src\assets\icon.png"
out_path = r"d:\Abtalks\Fligo\src\assets\icon.png"

img = Image.open(img_path)
width, height = img.size

# The squircle icon is located roughly between 16% to 84% of width and height
# Let's crop tightly to the squircle icon
left = int(width * 0.17)
top = int(height * 0.17)
right = int(width * 0.83)
bottom = int(height * 0.83)

cropped = img.crop((left, top, right, bottom))
cropped = cropped.resize((512, 512), Image.Resampling.LANCZOS)

# Create smooth rounded rectangle mask for transparent background
mask = Image.new('L', (512, 512), 0)
draw = ImageDraw.Draw(mask)
corner_radius = 110
draw.rounded_rectangle([(0, 0), (512, 512)], radius=corner_radius, fill=255)

# Apply mask to convert to clean transparent PNG
output = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
output.paste(cropped.convert('RGBA'), (0, 0), mask=mask)

output.save(out_path, format='PNG')
print("Successfully cropped and formatted icon to 512x512 rounded transparent squircle!")
