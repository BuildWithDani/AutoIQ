# Assets Folder

Place your application icons here:

- `icon.png` - Application icon (256x256 or larger, PNG format)
- `icon.ico` - Windows icon (for electron-builder, can be generated from PNG)
- `icon.icns` - macOS icon (for electron-builder, can be generated from PNG)

## Icon Requirements

- **PNG**: 256x256 minimum, 512x512 recommended
- **ICO**: Windows icon format (multi-resolution)
- **ICNS**: macOS icon format

## Converting Icons

You can use online tools or command-line tools to convert:
- PNG to ICO: Use online converters or ImageMagick
- PNG to ICNS: Use `iconutil` on macOS or online converters

## Current Setup

The Electron app will look for icons in this folder. Update `electron-builder.yml` if you place icons elsewhere.

