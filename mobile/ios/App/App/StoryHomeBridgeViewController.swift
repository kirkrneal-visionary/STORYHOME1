import Capacitor
import SafariServices
import UIKit
import WebKit

final class StoryHomeBridgeViewController: CAPBridgeViewController {
    // WKWebView holds its delegates weakly.
    private var delegateProxy: StoryHomeWebViewDelegateProxy?

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let bridge = bridge,
              let webView = webView,
              let capacitorHandler = webView.navigationDelegate as? WebViewDelegationHandler else { return }
        bridge.registerPluginInstance(StoryHomeShellPlugin())
        let proxy = StoryHomeWebViewDelegateProxy(bridge: bridge, capacitorHandler: capacitorHandler)
        webView.uiDelegate = proxy
        webView.navigationDelegate = proxy
        delegateProxy = proxy
    }
}

enum StoryHomeLinkRoute: Equatable {
    case app
    case inAppBrowser
    case system
    case ignore
}

enum StoryHomeLinks {
    static func appHosts(serverURL: URL) -> Set<String> {
        guard let host = serverURL.host?.lowercased() else { return [] }
        var hosts: Set<String> = [host]
        if host.hasPrefix("www.") {
            hosts.insert(String(host.dropFirst(4)))
        }
        return hosts
    }

    static func route(_ url: URL, appHosts: Set<String>, localURL: URL) -> StoryHomeLinkRoute {
        guard let scheme = url.scheme?.lowercased() else { return .ignore }
        switch scheme {
        case "http", "https":
            return appHosts.contains(url.host?.lowercased() ?? "") ? .app : .inAppBrowser
        case localURL.scheme?.lowercased():
            return .app
        case "about", "blob", "data", "javascript", "file":
            return .ignore
        default:
            return .system
        }
    }
}

final class StoryHomeShellState {
    static var lastFailedAppURL: URL?
}

/// Sits in front of Capacitor's WebViewDelegationHandler. Everything not implemented here
/// is forwarded to Capacitor unchanged.
final class StoryHomeWebViewDelegateProxy: NSObject, WKUIDelegate, WKNavigationDelegate {
    private weak var bridge: CAPBridgeProtocol?
    private weak var capacitorHandler: WebViewDelegationHandler?

    private static let offlineErrorCodes: Set<Int> = [
        NSURLErrorNotConnectedToInternet,
        NSURLErrorNetworkConnectionLost,
        NSURLErrorTimedOut,
        NSURLErrorCannotFindHost,
        NSURLErrorCannotConnectToHost,
        NSURLErrorDNSLookupFailed,
        NSURLErrorInternationalRoamingOff,
        NSURLErrorDataNotAllowed,
        NSURLErrorCallIsActive,
    ]

    init(bridge: CAPBridgeProtocol, capacitorHandler: WebViewDelegationHandler) {
        self.bridge = bridge
        self.capacitorHandler = capacitorHandler
        super.init()
    }

    override func responds(to aSelector: Selector!) -> Bool {
        if super.responds(to: aSelector) { return true }
        return capacitorHandler?.responds(to: aSelector) ?? false
    }

    override func forwardingTarget(for aSelector: Selector!) -> Any? {
        if let handler = capacitorHandler, handler.responds(to: aSelector) {
            return handler
        }
        return super.forwardingTarget(for: aSelector)
    }

    private func route(for url: URL) -> StoryHomeLinkRoute {
        guard let config = bridge?.config else { return .ignore }
        return StoryHomeLinks.route(
            url,
            appHosts: StoryHomeLinks.appHosts(serverURL: config.serverURL),
            localURL: config.localURL
        )
    }

    private func presentInAppBrowser(_ url: URL) {
        guard let presenter = bridge?.viewController, presenter.presentedViewController == nil else { return }
        let safari = SFSafariViewController(url: url)
        safari.dismissButtonStyle = .done
        presenter.present(safari, animated: true)
    }

    // MARK: WKNavigationDelegate

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let isTopLevel = navigationAction.targetFrame == nil || navigationAction.targetFrame?.isMainFrame == true
        if isTopLevel, let url = navigationAction.request.url, route(for: url) == .inAppBrowser {
            presentInAppBrowser(url)
            decisionHandler(.cancel)
            return
        }
        guard let handler = capacitorHandler else {
            decisionHandler(.allow)
            return
        }
        handler.webView(webView, decidePolicyFor: navigationAction, decisionHandler: decisionHandler)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        capacitorHandler?.webView(webView, didFailProvisionalNavigation: navigation, withError: error)
        showOfflineIfNeeded(webView, error: error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        capacitorHandler?.webView(webView, didFail: navigation, withError: error)
        showOfflineIfNeeded(webView, error: error)
    }

    private func showOfflineIfNeeded(_ webView: WKWebView, error: Error) {
        let nsError = error as NSError
        guard nsError.domain == NSURLErrorDomain,
              Self.offlineErrorCodes.contains(nsError.code),
              let localURL = bridge?.config.localURL else { return }
        if let failed = nsError.userInfo[NSURLErrorFailingURLErrorKey] as? URL,
           failed.scheme?.lowercased() == "https",
           route(for: failed) == .app {
            StoryHomeShellState.lastFailedAppURL = failed
        }
        webView.load(URLRequest(url: localURL.appendingPathComponent("offline.html")))
    }

    // MARK: WKUIDelegate

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        guard let url = navigationAction.request.url else { return nil }
        switch route(for: url) {
        case .app:
            webView.load(navigationAction.request)
        case .inAppBrowser:
            presentInAppBrowser(url)
        case .system:
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        case .ignore:
            break
        }
        return nil
    }
}
