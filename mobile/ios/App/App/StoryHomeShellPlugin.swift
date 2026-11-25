import Capacitor
import Foundation

/// Native calls for the bundled offline screen. Exposes nothing about the user or device.
@objc(StoryHomeShellPlugin)
final class StoryHomeShellPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "StoryHomeShellPlugin"
    let jsName = "StoryHomeShell"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "retry", returnType: CAPPluginReturnPromise),
    ]

    @objc func retry(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let bridge = self?.bridge, let webView = bridge.webView else {
                call.reject("The app is not ready.")
                return
            }
            let target = StoryHomeShellState.lastFailedAppURL ?? bridge.config.appStartServerURL
            StoryHomeShellState.lastFailedAppURL = nil
            webView.load(URLRequest(url: target))
            call.resolve()
        }
    }
}
