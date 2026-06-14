# Custom Recipe Save & Manage — Design Spec

**Date:** 2026-06-15
**Feature:** Allow users to save, load, and delete custom recipes in the mold investment calculator (step 4).

---

## Overview

Users can deviate from the three built-in recipe presets and save their own mixes to `localStorage`. Saved recipes appear in a collapsible "My recipes" section on step 4, can be loaded with a tap, and can be deleted with a confirmation.

---

## Step 4 Layout (revised order)

1. Preset pills (1:1:1 · 60/40 · R&R Bandust)
2. Preset description — hidden when no preset pill is active
3. My recipes collapsible — hidden entirely when no custom recipes exist
4. Recipe editor (ingredient rows + Add ingredient)
5. Save recipe button — hidden when recipe matches a preset or a saved custom recipe
6. Gut-check / nav buttons

---

## Data Model

Stored in `localStorage` under the key `volumizer_custom_recipes` as a JSON array:

```json
[
  {
    "key": "1718123456789",
    "name": "10% Grog",
    "ingredients": [
      { "name": "Water", "parts": 1 },
      { "name": "Silica", "parts": 1 },
      { "name": "Plaster", "parts": 1 },
      { "name": "Grog", "parts": 0.1 }
    ]
  }
]
```

- `key`: `Date.now().toString()` at save time — unique enough, no UUID needed.
- `ingredients`: same shape as `state.recipe`.
- Order in array = display order in "My recipes".

---

## "Save Recipe" Button

**Visibility:** shown when the current `state.recipe` does not match any built-in preset AND does not exactly match any saved custom recipe. Uses the existing `recipeMatchesPreset()` logic plus a new `recipeMatchesAnyCustom()` check.

**Recipe comparison:** two recipes match when they have the same number of ingredients and each ingredient has the same `name` (trimmed) and `parts` value.

**On click:** opens the Save modal.

---

## Save Modal

- Title: "Save recipe"
- Single text input, pre-filled with `"Custom mix N"` where N = `customRecipes.length + 1`
- Input text is pre-selected so the user can type immediately to replace it
- Buttons: Cancel (dismisses) | Save (commits)
- Save is disabled if the name field is empty
- On Save: append new entry to `customRecipes`, write to `localStorage`, close modal, re-render My recipes section, re-evaluate Save button visibility

---

## My Recipes Section

**Visibility:** the entire section (header + list) is hidden via `display:none` when `customRecipes.length === 0`.

**Collapsed state (default):**
```
⏵ My recipes
```

**Expanded state:**
```
⏷ My recipes
  10% Grog        [Delete]
  Custom mix 2    [Delete]
  R&R Glass Cast  [Delete]
```

- Collapsed by default each time step 4 is shown, except when a custom recipe is loaded (section opens automatically).
- Recipe name row is fully tappable to load the recipe.

**Loading a custom recipe:**
- Sets `state.recipe` to a deep copy of the stored ingredients
- Re-renders recipe rows
- Clears preset pill selection
- Hides preset description
- Collapses (or keeps open) "My recipes" — section stays open so user can see which recipe is loaded
- Save button re-evaluates (hides, since recipe now matches a saved custom)

---

## Delete Confirmation Modal

- Title: "Delete recipe?"
- Body: `"[Recipe name]" will be permanently removed.`
- Buttons: Cancel | Delete (red, `--danger` color)
- On Delete: remove entry from array, write to `localStorage`, close modal, re-render My recipes section, re-evaluate Save button visibility. If the deleted recipe was the currently loaded one, Save button re-evaluates (may now become visible).

---

## No Update Flow

There is no way to update/overwrite an existing custom recipe. "Save recipe" always creates a new entry. This is intentional for the initial version.

---

## Implementation Scope

All changes are confined to `volume/index.html`. No new files. New HTML (modal markup, My recipes section) added inline. New JS functions added inside the existing IIFE.

New JS functions:
- `loadCustomRecipes()` — reads + parses localStorage, returns array (empty array on parse error)
- `saveCustomRecipes(arr)` — serializes + writes to localStorage
- `recipeMatchesAnyCustom()` — compares `state.recipe` against all saved custom recipes
- `updateSaveButton()` — shows/hides Save button based on recipe state
- `updateMyRecipesSection()` — shows/hides section, re-renders recipe rows
- `openSaveModal()` — populates name field, shows modal, selects input
- `commitSave(name)` — appends, persists, updates UI
- `openDeleteModal(key, name)` — shows confirmation modal
- `commitDelete(key)` — removes, persists, updates UI
- `loadCustomRecipe(key)` — loads recipe into editor, updates UI

Integration hooks (existing functions to update):
- `setupStep4()` — call `updateMyRecipesSection()` and `updateSaveButton()`
- `renderRecipeRows()` — call `updateSaveButton()` after render
- Preset pill click handlers — call `updateSaveButton()`
- Recipe row input listeners — call `updateSaveButton()` on change
