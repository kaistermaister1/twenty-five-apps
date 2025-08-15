import SwiftUI

struct ContentView: View {
    @StateObject private var cameraService = CameraService()
    @State private var isSaving: Bool = false
    @State private var showError: Bool = false
    @State private var errorMessage: String = ""

    var body: some View {
        ZStack {
            CameraPreviewView(session: cameraService.captureSession)
                .ignoresSafeArea()

            VStack {
                Spacer()
                Button(action: capture) {
                    ZStack {
                        Circle()
                            .fill(Color.white.opacity(0.9))
                            .frame(width: 76, height: 76)
                        Circle()
                            .stroke(Color.white, lineWidth: 4)
                            .frame(width: 90, height: 90)
                    }
                }
                .padding(.bottom, 32)
                .disabled(isSaving)
            }
        }
        .onAppear {
            cameraService.configureSession()
        }
        .alert("Error", isPresented: $showError, actions: {
            Button("OK", role: .cancel) {}
        }, message: {
            Text(errorMessage)
        })
    }

    private func capture() {
        isSaving = true
        cameraService.capturePhoto { result in
            DispatchQueue.main.async {
                isSaving = false
                switch result {
                case .success:
                    break
                case .failure(let error):
                    errorMessage = error.localizedDescription
                    showError = true
                }
            }
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}


