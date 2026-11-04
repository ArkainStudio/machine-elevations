# Machine Elevations

**Every machine on peaq, drawn to scale.**

Machine Elevations draws each machine on [peaq](https://www.peaq.xyz/) as an architectural front elevation: dimension lines, callouts and a title block at scale 1:16. The drawing is generated from the machine's peaqID and its record in peaqOS. The same ID always gives the same drawing, and the drawing changes only when the record changes.

Live demo: **https://machine-elevations.vercel.app**

## How data becomes a drawing

| peaqOS data | Drawing |
| --- | --- |
| peaqID (DID) | Hashed into a seed that picks the body, the name and the blink and breathing rhythm |
| Operator DID | The drafting grid, so a whole fleet is drawn on the same paper |
| Machine Credit Rating | The finish: Drafting Paper until rated, Field (B, BB), Night Shift (BBB, A), Blueprint (AA), Gilded (AAA) |
| Event count | How alive the core is: pulse, glow and scanner speed. No events, no scanner |
| Bond status | Bonded machines breathe and blink. Unbonded machines are greyed out with their eyes shut |
| Negative flag | A redline revision stamp: flagged, under review |
| Revenue trend, home chain | Recorded in the title block |

Nothing is random at draw time. Rendering uses only the seed and the record.

## Data source

Records come from the public peaqOS Machine Credit Rating API:

- `https://mcr.peaq.xyz/mcr/did:peaq:<machine id>` for machines homed on peaq
- `https://mcr-20.peaq.xyz/mcr/did:peaq:<machine id>` for machines homed on Solana

Activated machines can be browsed at [app.peaq.xyz/machines](https://app.peaq.xyz/machines). If the browser cannot read the API directly, the demo accepts the API's JSON response pasted in.

## Run it

The demo is a single self-contained file. Open `index.html` in a browser, or serve the folder with any static host.

## Status

This is the proof of concept for a peaq ecosystem grant proposal. Planned next:

1. An open-source rendering library with a live data adapter and determinism tests
2. A new body system drawn for peaq machine types, and an image and metadata service per DID
3. A public gallery, fleet sheets per operator, and an embeddable widget for DePIN apps

## Credits and licence

Designed and built by Amir Keshavarzian ([Arkain](https://x.com/ArkainArt)), [ARKAIN STUDIO](https://www.arkain.studio/).

- Code: MIT licence (see `LICENSE`)
- Artwork: the robot bodies in this demo come from GRID_ARCHITECT_SERIES by ARKAIN STUDIO and are © ARKAIN STUDIO, used here for the demo only. Artwork made for the peaq version will be released under CC BY 4.0.
