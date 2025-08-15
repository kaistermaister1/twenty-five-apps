# Torch Camera (App 04)

An iOS camera app that keeps the torch (continuous flash/LED) ON while you take photos and saves them directly to the Camera Roll.

Web apps on iOS cannot control the device torch/flash. This folder contains a small landing page, and a native SwiftUI implementation is provided under `ios/`.

## Build the native iOS app

See `ios/README.md` for full Xcode setup and source files.

### Why native?

Safari/PWAs on iOS expose only limited camera controls and no torch control, so continuous light isn’t possible on the web. The native app uses `AVFoundation` to keep the torch on during live preview and capture.