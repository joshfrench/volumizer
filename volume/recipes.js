// Recipe presets for the mold investment calculator.
// To add a new preset, add an entry to this object. `key` becomes the
// data-preset value; `label` is the pill button text (HTML allowed, e.g. &amp;);
// `description` shows below the pills when this preset is active;
// `ingredients` is the ordered list of { name, parts } — the first
// ingredient is treated as the fixed reference ("Water", 1 part).
const RECIPE_PRESETS = {
  '111': {
    label: '1 : 1 : 1',
    description: 'Standard recipe for hand-built molds.',
    ingredients: [
      { name: 'Water', parts: 1 },
      { name: 'Silica', parts: 1 },
      { name: 'Plaster', parts: 1 }
    ]
  },
  '6040': {
    label: '60 / 40',
    description: 'Thinner mix for pouring.',
    ingredients: [
      { name: 'Water', parts: 1 },
      { name: 'Silica', parts: 1.1 },
      { name: 'Plaster', parts: 0.7 }
    ]
  },
  'bandust': {
    label: 'R&amp;R Bandust 101',
    description: 'Premixed R&R powder.',
    ingredients: [
      { name: 'Water', parts: 1 },
      { name: 'R&R Bandust 101', parts: 2 }
    ]
  }
};

// Which preset is preselected based on the mold shape chosen in step 1.
const DEFAULT_PRESET_BY_SHAPE = {
  handbuilt: '111',
  box: '6040',
  cylinder: '6040'
};
