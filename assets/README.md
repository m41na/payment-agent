This folder is intended to contain image assets used by the Expo project (icon.png, splash.png, adaptive-icon.png, favicon.png).

The dev environment currently cannot create binary image files automatically. To remove the console warning about missing assets, please add the following PNG files to this folder:

- icon.png (recommended 1024x1024)
- splash.png (recommended 1242x2436 or a large image)
- adaptive-icon.png (foreground image for Android)
- favicon.png (for web)

You can create simple placeholders using any image editor, or run the following on your machine:

# macOS / Linux
mkdir -p assets
convert -size 1024x1024 xc:#3B82F6 assets/icon.png

# Windows (PowerShell)
mkdir assets
# Use an image editor or tools like ImageMagick to generate assets\icon.png

After adding the files, restart the Expo dev server.
