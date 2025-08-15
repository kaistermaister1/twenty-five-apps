import AVFoundation
import Photos
import UIKit

final class CameraService: NSObject, ObservableObject {
    let captureSession = AVCaptureSession()
    private let sessionQueue = DispatchQueue(label: "camera.session.queue")
    private var photoOutput = AVCapturePhotoOutput()
    private var videoDeviceInput: AVCaptureDeviceInput?

    func configureSession() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            setupSession()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                guard let self = self, granted else { return }
                self.setupSession()
            }
        default:
            // No camera access. Caller may present UI if desired.
            break
        }
    }

    private func setupSession() {
        sessionQueue.async {
            self.captureSession.beginConfiguration()
            self.captureSession.sessionPreset = .photo

            // Camera input
            guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
                return
            }
            do {
                let input = try AVCaptureDeviceInput(device: device)
                if self.captureSession.canAddInput(input) {
                    self.captureSession.addInput(input)
                    self.videoDeviceInput = input
                }
            } catch {
                return
            }

            // Photo output
            let output = AVCapturePhotoOutput()
            output.isHighResolutionCaptureEnabled = true
            if self.captureSession.canAddOutput(output) {
                self.captureSession.addOutput(output)
                self.photoOutput = output
            }

            self.captureSession.commitConfiguration()
            self.captureSession.startRunning()
            // Enable torch after session starts to ensure device is active
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                self.enableTorch(true)
            }
        }
    }

    func enableTorch(_ on: Bool) {
        guard let device = videoDeviceInput?.device, device.hasTorch else { return }
        do {
            try device.lockForConfiguration()
            if on {
                try device.setTorchModeOn(level: AVCaptureDevice.maxAvailableTorchLevel)
            } else {
                device.torchMode = .off
            }
            device.unlockForConfiguration()
        } catch {
            // Ignore torch errors silently
        }
    }

    func capturePhoto(completion: @escaping (Result<Void, Error>) -> Void) {
        let settings = AVCapturePhotoSettings()
        // Use torch as continuous light; disable flash auto
        if photoOutput.supportedFlashModes.contains(.off) {
            settings.flashMode = .off
        }
        settings.isHighResolutionPhotoEnabled = true

        let delegate = PhotoCaptureDelegate { [weak self] result in
            // Keep torch on after capture
            self?.enableTorch(true)
            completion(result)
        }
        photoOutput.capturePhoto(with: settings, delegate: delegate)
    }
}

private final class PhotoCaptureDelegate: NSObject, AVCapturePhotoCaptureDelegate {
    private let completion: (Result<Void, Error>) -> Void

    init(completion: @escaping (Result<Void, Error>) -> Void) {
        self.completion = completion
    }

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        if let error = error {
            completion(.failure(error))
            return
        }
        guard let data = photo.fileDataRepresentation(), let image = UIImage(data: data) else {
            completion(.failure(NSError(domain: "TorchCamera", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to get image data"])) )
            return
        }

        saveToPhotos(image: image, completion: completion)
    }

    private func saveToPhotos(image: UIImage, completion: @escaping (Result<Void, Error>) -> Void) {
        func performSave() {
            PHPhotoLibrary.shared().performChanges({
                PHAssetChangeRequest.creationRequestForAsset(from: image)
            }, completionHandler: { success, error in
                if let error = error {
                    completion(.failure(error))
                } else if success {
                    completion(.success(()))
                } else {
                    completion(.failure(NSError(domain: "TorchCamera", code: -2, userInfo: [NSLocalizedDescriptionKey: "Unknown save failure"])) )
                }
            })
        }

        let status = PHPhotoLibrary.authorizationStatus(for: .addOnly)
        switch status {
        case .authorized, .limited:
            performSave()
        case .notDetermined:
            PHPhotoLibrary.requestAuthorization(for: .addOnly) { newStatus in
                if newStatus == .authorized || newStatus == .limited {
                    performSave()
                } else {
                    completion(.failure(NSError(domain: "TorchCamera", code: -3, userInfo: [NSLocalizedDescriptionKey: "Photos permission denied"])) )
                }
            }
        default:
            completion(.failure(NSError(domain: "TorchCamera", code: -3, userInfo: [NSLocalizedDescriptionKey: "Photos permission denied"])) )
        }
    }
}


