# Torch Camera (iOS)

An iOS SwiftUI app that keeps the torch (continuous flash/LED) ON while capturing photos and saves them to the Camera Roll.

Important: Building and running this app requires macOS and Xcode.

## Features

- Continuous torch on the back camera during live preview
- One-tap photo capture to Photos (Camera Roll)
- Graceful permission handling (Camera + Photo Library Add)

## Getting started (Xcode)

1. Open Xcode and create a new project:
   - iOS > App
   - Interface: SwiftUI
   - Language: Swift
   - Name: TorchCamera
2. In the project navigator, replace the generated files with the ones in this `ios` folder:
   - Replace `App` and `ContentView` with `TorchCameraApp.swift` and `ContentView.swift`
   - Add the `Camera` folder (`CameraService.swift`, `CameraPreviewView.swift`)
3. Update the project `Info.plist` with the keys below (or copy from `Info.sample.plist`):
   - `NSCameraUsageDescription` = "This app uses the camera to take photos."
   - `NSPhotoLibraryAddUsageDescription` = "This app saves captured photos to your library."
4. In Signing & Capabilities, set your Team and a unique Bundle Identifier.
5. Build and run on a real iPhone. The simulator has no camera or torch.

## Notes on torch vs flash

- The app uses the device torch (continuous LED) instead of the photo flash mode. This keeps light on while framing and during capture. For consistency, flash mode is set to off in capture settings.

## Files

- `TorchCameraApp.swift`: App entry point
- `ContentView.swift`: SwiftUI UI with preview and capture button
- `Camera/CameraService.swift`: Configures `AVCaptureSession`, enables torch, and handles capture/saving
- `Camera/CameraPreviewView.swift`: SwiftUI wrapper for the camera preview layer
- `Info.sample.plist`: Example Info.plist entries


