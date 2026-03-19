export const MIN_SHAPE_SIZE = 28

const clampValue = (value, min, max) => Math.min(max, Math.max(min, value))

export const getResizedShapePatch = ({ interaction, worldPoint, maxSize = 1400 }) => {
  const deltaWorldX = worldPoint.x - interaction.startWorld.x
  const deltaWorldY = worldPoint.y - interaction.startWorld.y

  const nextWidth = clampValue(interaction.baseShape.width + deltaWorldX, MIN_SHAPE_SIZE, maxSize)
  const nextHeight = clampValue(interaction.baseShape.height + deltaWorldY, MIN_SHAPE_SIZE, maxSize)
  const topLeftX = interaction.baseShape.x - interaction.baseShape.width / 2
  const topLeftY = interaction.baseShape.y - interaction.baseShape.height / 2

  return {
    width: nextWidth,
    height: nextHeight,
    x: topLeftX + nextWidth / 2,
    y: topLeftY + nextHeight / 2,
  }
}
