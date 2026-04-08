# 2D Sand Game Design

## Goal

Run a fast, direct, single-page falling-sand sandbox in plain JavaScript without Rust/WASM on the interaction path.

## World Model

The world is a fixed 2D grid of cells.

- one byte for species
- one byte for per-cell tone or lifetime
- one visit-token buffer to avoid clearing update markers every frame

## Material Set

- `sand`: falls and piles
- `water`: falls, flows, and extinguishes fire
- `stone`: static terrain
- `wood`: static flammable structure
- `fire`: rises, ignites nearby flammables, and burns out
- `oil`: dark flammable liquid
- `photo`: stamped image particles that mostly hold shape
- `empty`: cleared space

## Simulation

The simulation is a lightweight cellular automata update loop.

- bottom-to-top scan order
- alternating horizontal scan direction for less directional bias
- direct typed-array writes
- incremental particle counting

The target is responsive sandbox behavior, not physically accurate fluids.

## Rendering

Rendering is a single `putImageData` pass on a 2D canvas.

- packed `Uint32` pixel writes
- material palettes with tone variation
- cheap neighbor-based highlight and shadow cues

This keeps the renderer simple and fast while still making particles read as distinct materials.

## Input

- click and drag to paint
- selectable brush sizes
- pause, clear, and reseed actions
- photo mode stamps local images into the world as mapped particles

## Scenes

The startup and preset scenes are code-authored compositions of circles, lines, and stone lettering. `CODY` is written in stone directly inside the simulation world.
