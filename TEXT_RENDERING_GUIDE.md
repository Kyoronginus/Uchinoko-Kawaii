# HD-2D Text Rendering Guide

## Overview
This guide explains how to implement pixel-perfect text rendering using the Silkscreen font in your Three.js HD-2D scene. The system is designed to work seamlessly with the HD2DRenderer's post-processing pipeline while maintaining crisp, pixel-art aesthetics.

## Font Integration

### 1. Silkscreen Font Loading
The Silkscreen font is loaded via Google Fonts in the HTML file:

```html
<!-- In index.html -->
<link href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap" rel="stylesheet">

<!-- Fallback font-face declaration -->
<style>
    @font-face {
        font-family: 'Silkscreen';
        src: url('/fonts/Silkscreen-Regular.ttf') format('truetype');
    }
</style>
```

### 2. Font Preloading
A hidden element ensures the font is loaded before use:

```html
<div class="font-preload">Silkscreen Font Preload</div>
```

## Sharp Text Rendering

### Key Features for Pixel-Perfect Text:

1. **Canvas Settings for Crisp Rendering**:
```javascript
context.imageSmoothingEnabled = false;
context.webkitImageSmoothingEnabled = false;
context.mozImageSmoothingEnabled = false;
context.msImageSmoothingEnabled = false;
```

2. **High-Resolution Canvas with Pixel Ratio**:
```javascript
const pixelRatio = 2; // Higher resolution for crisp text
canvas.width = Math.ceil((textWidth + padding * 2) * pixelRatio);
canvas.height = Math.ceil((textHeight + padding * 2) * pixelRatio);
context.scale(pixelRatio, pixelRatio);
```

3. **Proper Texture Filtering**:
```javascript
texture.magFilter = THREE.NearestFilter;
texture.minFilter = THREE.NearestFilter;
texture.wrapS = THREE.ClampToEdgeWrapping;
texture.wrapT = THREE.ClampToEdgeWrapping;
texture.generateMipmaps = false;
texture.flipY = false;
```

## Usage Examples

### Basic Floor Text
```javascript
// Add simple text to the floor
const textId = environmentManager.addFloorText(
    'Welcome!', 
    { x: 0, z: 5 }
);
```

### Styled Text with Outline
```javascript
const textId = environmentManager.addFloorText(
    'Project Title', 
    { x: 10, z: 0 }, 
    {
        font: '20px Silkscreen',
        color: '#FFFFFF',
        outline: true,
        outlineColor: '#000000',
        outlineWidth: 2,
        scale: 3,
        pixelRatio: 3
    }
);
```

### Advanced Text Configuration
```javascript
const textId = environmentManager.addFloorText(
    'Interactive Zone', 
    { x: -5, z: 8 }, 
    {
        font: '16px Silkscreen',
        color: '#FFD700',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        outline: true,
        outlineColor: '#8B4513',
        outlineWidth: 1,
        padding: 12,
        scale: 2.5,
        pixelRatio: 2
    }
);
```

## TextManager API

### Core Methods

#### `addFloorText(text, position, options)`
Creates text on the floor surface.

**Parameters:**
- `text` (string): The text to display
- `position` (object): `{x, z}` world coordinates
- `options` (object): Styling options

**Options:**
```javascript
{
    font: '16px Silkscreen',        // Font family and size
    color: '#FFFFFF',               // Text color
    backgroundColor: 'rgba(0,0,0,0)', // Background color
    padding: 8,                     // Padding around text
    pixelRatio: 2,                  // Resolution multiplier
    outline: true,                  // Enable text outline
    outlineColor: '#000000',        // Outline color
    outlineWidth: 1,                // Outline thickness
    scale: 3                        // World scale multiplier
}
```

#### `updateText(id, newText, options)`
Updates existing text content and styling.

#### `removeText(id)`
Removes text from the scene and cleans up resources.

### EnvironmentManager Integration

The EnvironmentManager provides convenient methods for floor text:

```javascript
// Add text via EnvironmentManager
const id = environmentManager.addFloorText('Hello World', {x: 0, z: 0});

// Update text
environmentManager.updateFloorText(id, 'Updated Text');

// Remove text
environmentManager.removeFloorText(id);

// Access TextManager directly for advanced operations
const textManager = environmentManager.getTextManager();
```

## HD-2D Compatibility

### Render Pipeline Integration
The text system is designed to work with the HD2DRenderer's pipeline:

1. **Render Target Compatibility**: Text textures use NearestFilter to maintain sharpness through the 0.75 pixel ratio render target
2. **Post-Processing Safe**: Text remains crisp after the upscaling shader is applied
3. **Shadow Integration**: Text meshes can receive shadows from other objects

### Performance Considerations
- Text textures are cached and reused when possible
- High pixel ratios (2-3x) provide crisp rendering without excessive memory usage
- Proper resource disposal prevents memory leaks

## Best Practices

### 1. Font Size Guidelines
- Use font sizes that are multiples of 4px for best pixel alignment
- Recommended sizes: 12px, 16px, 20px, 24px
- Scale up using the `scale` parameter rather than increasing font size

### 2. Color Choices
- Use high contrast colors for readability
- Consider outline colors that complement the background
- Test colors against both light and dark floor areas

### 3. Positioning
- Place text slightly above the floor (y: 0.01) to avoid z-fighting
- Consider character movement paths when positioning text
- Group related text elements logically

### 4. Performance Optimization
```javascript
// Good: Reuse text when possible
const welcomeId = environmentManager.addFloorText('Welcome!', {x: 0, z: 5});

// Good: Update existing text instead of creating new
environmentManager.updateFloorText(welcomeId, 'Welcome Back!');

// Good: Clean up when no longer needed
environmentManager.removeFloorText(welcomeId);
```

## Troubleshooting

### Common Issues

1. **Blurry Text**: 
   - Increase `pixelRatio` in options
   - Ensure `imageSmoothingEnabled = false`
   - Check texture filtering settings

2. **Font Not Loading**:
   - Verify Google Fonts link in HTML
   - Check font-face fallback declaration
   - Use font preload element

3. **Text Not Visible**:
   - Check y-position (should be > 0)
   - Verify text color against background
   - Ensure proper alpha settings

4. **Performance Issues**:
   - Limit number of simultaneous text elements
   - Use appropriate pixel ratios
   - Clean up unused text objects

## Example Implementation

Here's a complete example of setting up text in your scene:

```javascript
// In your scene initialization
async function setupSceneText() {
    // Wait for font to load
    await environmentManager.getTextManager().loadFont();
    
    // Add welcome message
    const welcomeId = environmentManager.addFloorText(
        'Welcome to My Portfolio!',
        { x: 0, z: 10 },
        {
            font: '20px Silkscreen',
            color: '#FFFFFF',
            outline: true,
            outlineColor: '#000000',
            outlineWidth: 2,
            scale: 4,
            pixelRatio: 3
        }
    );
    
    // Add navigation hints
    const leftHintId = environmentManager.addFloorText(
        '← Projects',
        { x: -8, z: 0 },
        {
            font: '16px Silkscreen',
            color: '#FFD700',
            outline: true,
            outlineColor: '#8B4513',
            scale: 2
        }
    );
    
    // Store IDs for later updates if needed
    return { welcomeId, leftHintId };
}
```

This text rendering system provides a robust foundation for adding pixel-perfect text to your HD-2D scene while maintaining performance and visual quality.
