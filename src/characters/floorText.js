export function setupExampleText(environmentManager) {
  // Add welcome text
  environmentManager.addFloorText(
    "Uchinoko Kawaii",
    { x: 0, z: 10 },
    {
      font: "10px Silkscreen",
      color: "#FFFFFF",
      outline: false,
      outlineColor: "#000000",
      outlineWidth: 2,
      scale: 4,
    }
  );

  // Add directional text
  environmentManager.addFloorText(
    "Welcome!",
    { x: 0, z: 5 },
    {
      font: "16px Silkscreen",
      color: "#ffffffff",
      // outline: true,
      outlineColor: "#1cf7ffff",
      scale: 2,
    }
  );

  // Add instructions
  environmentManager.addFloorText(
    "Use        to move around",
    { x: 0, z: 12 },
    {
      font: "14px Silkscreen",
      color: "#ffffffff",
      // outline: true,
      outlineColor: "#ffffffff",
      scale: 2,
    }
  );

  environmentManager.addFloorText(
    "Press    to reset position",
    { x: 0, z: 14 },
    {
      font: "10px Silkscreen",
      color: "#ffffffff",
      // outline: true,
      outlineColor: "#ffffffff",
      scale: 2,
    }
  );

  environmentManager.addFloorText(
    "Use    to grab objects",
    { x: 0, z: 16 },
    {
      font: "10px Silkscreen",
      color: "#ffffffff",
      // outline: true,
      outlineColor: "#ffffffff",
      scale: 2,
    }
  );
}

export function setupCreatorText(environmentManager) {
  environmentManager.addFloorText(
    "This site has been created by",
    { x: -20, z: -12 },
    {
      font: "10px Silkscreen",
      color: "#FFFFFF",
      outline: false,
      outlineColor: "#000000",
      outlineWidth: 2,
      scale: 2,
    }
  );
  environmentManager.addFloorText(
    "Kyoronginus",
    { x: -20, z: -10 },
    {
      font: "10px Silkscreen",
      color: "#FFFFFF",
      outline: false,
      outlineColor: "#000000",
      outlineWidth: 2,
      scale: 2,
    }
  ),
    environmentManager.addFloorText(
      "Visit my other projects",
      { x: -20, z: -2 },
      {
        font: "10px Silkscreen",
        color: "#FFFFFF",
        outline: false,
        outlineColor: "#000000",
        outlineWidth: 2,
        scale: 2,
      }
    );
}

export function setupGalleryText(environmentManager) {
  environmentManager.addFloorText(
    "2023-2024",
    { x: 14, z: -25 },
    {
      font: "10px Silkscreen",
      color: "#FFFFFF",
      outline: false,
      outlineColor: "#000000",
      outlineWidth: 2,
      scale: 2,
    }
  );
  environmentManager.addFloorText(
    "2024-2025",
    { x: 14, z: -15 },
    {
      font: "10px Silkscreen",
      color: "#FFFFFF",
      outline: false,
      outlineColor: "#000000",
      outlineWidth: 2,
      scale: 2,
    }
  );
}
