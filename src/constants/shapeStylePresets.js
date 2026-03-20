export const SHAPE_STYLE_PRESET_PATCHES = {
  default: null,
  outline: {
    fillColor: '#ffffff',
    strokeColor: '#1a73e8',
    strokeWidth: 2,
    opacity: 1,
  },
  highlight: {
    fillColor: '#ffd86b',
    strokeColor: '#a56b00',
    strokeWidth: 3,
    opacity: 1,
  },
}

export const getShapeStylePresetPatch = (preset) => SHAPE_STYLE_PRESET_PATCHES[preset] || null
