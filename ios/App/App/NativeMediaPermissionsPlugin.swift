import AVFoundation
import Capacitor
import Foundation

@objc(NativeMediaPermissionsPlugin)
public class NativeMediaPermissionsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeMediaPermissionsPlugin"
    public let jsName = "NativeMediaPermissions"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "check", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise)
    ]

    @objc func check(_ call: CAPPluginCall) {
        call.resolve(status())
    }

    @objc func request(_ call: CAPPluginCall) {
        let wantCam = call.getBool("camera") ?? true
        let wantMic = call.getBool("microphone") ?? true
        let group = DispatchGroup()

        if wantCam {
            group.enter()
            AVCaptureDevice.requestAccess(for: .video) { _ in
                group.leave()
            }
        }
        if wantMic {
            group.enter()
            AVCaptureDevice.requestAccess(for: .audio) { _ in
                group.leave()
            }
        }

        group.notify(queue: DispatchQueue.main) {
            call.resolve(self.status())
        }
    }

    private func status() -> [String: String] {
        [
            "camera": map(AVCaptureDevice.authorizationStatus(for: .video)),
            "microphone": map(AVCaptureDevice.authorizationStatus(for: .audio))
        ]
    }

    private func map(_ value: AVAuthorizationStatus) -> String {
        switch value {
        case .authorized:
            return "granted"
        case .denied, .restricted:
            return "denied"
        case .notDetermined:
            return "prompt"
        @unknown default:
            return "prompt"
        }
    }
}
