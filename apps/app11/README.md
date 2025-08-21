# Loom Reviewer (app11)

- Review Loom videos and send decisions to monday.com
- Paste Loom URLs to load and review videos
- Swipe right to pass, left to fail (or use buttons)
- Automatically creates/updates items in monday.com boards
- Links with monday.com API for project management integration

## Setup

1. `cd apps/app11`
2. `npm i`
3. `npm run dev`

## Usage

1. Link your monday.com API token
2. Load boards, then select your board
3. Pick the Source group (where the incoming links live)
4. Pick the Passed and Failed groups (where items should be moved)
5. Enter the Link column id that stores Loom URLs (e.g. `link`) and click "Load from Source group" to queue videos
6. Swipe or use the buttons: right = Passed (moves the item to the Passed group), left = Failed (moves to the Failed group)
7. Alternatively, paste a Loom URL manually to review without a monday.com item; the app will find/create an item and move it accordingly
