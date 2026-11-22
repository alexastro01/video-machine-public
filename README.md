# Video Machine

Video Machine is a local production engine for animated shorts. Remotion assembles scenes and captions on a frame-based timeline. The project also includes Three.js renderers, Blender scene scripts and tooling for HyperFrames edits.

## Run the example

Install Node.js 22.13 or newer, then run:

```sh
npm ci
npm run studio
```

Open **ShadowPilot** in Remotion Studio to watch the illustrated pilot with captions. The demo is silent and needs no API keys. **IllustratedCast** shows the original character rig and poses.

To render the demo locally:

```sh
npx remotion render src/public-entry.tsx ShadowPilot renders/shadow-pilot.mp4
```

## Browse the engine

- `src/engine/` defines episode manifests, timing, motion and caption helpers.
- `src/scenes/` and `src/pixel/` contain the illustrated scenes and 3D pixel worlds.
- `episodes/` holds episode manifests and the data used by the renderer source.
- `scripts/` contains the authoring and validation tools. Run `npm run episode -- projects` to list the project presets.

The production entry point is `src/index.ts`. The original episodes require their local artwork, audio or clips at the paths recorded in their manifests. This public copy includes the source and the files needed for the silent demo. Production media stays local.

Run `npm run lint` and `npm test` to check the public copy. Video Machine source is available under the [MIT License](LICENSE). The fonts and bundled third-party code retain their accompanying license notices.
