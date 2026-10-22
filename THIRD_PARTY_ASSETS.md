# Third-party game content

The original source code in this repository is licensed under MIT. Card names,
rules text, game terminology, and artwork from **Legends of Runeterra** belong to
Riot Games and their respective owners. The repository's MIT license does not
apply to that content.

`src/cards.js` contains card metadata derived from Riot Games' official
[Data Dragon](https://developer.riotgames.com/docs/lor#data-dragon) Foundations
(`set1`) data, pinned to version `7_10_0`, in English (`en_us`) and Traditional
Chinese (`zh_tw`). Each source JSON URL and SHA-256 digest is recorded in its
`DATASET` export. Flavor text and other narrative passages are excluded.

Artwork URLs point directly to Riot's versioned Data Dragon CDN; artwork files
are not copied into this repository. `art` links to the full illustration and
`render` links to the official Traditional Chinese card image.

Regenerate the metadata with `node scripts/sync-cards.mjs`. The pinned version
uses the balance values and wording in that release; it is not a snapshot of
the game's original launch balance. A catalog entry does not imply that the
card's behavior is implemented by the game engine.
