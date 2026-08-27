import Capacitor
import UIKit

class BridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeMediaPermissionsPlugin())
        paintWebViewWhite()
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        paintWebViewWhite()
    }

    private func paintWebViewWhite() {
        webView?.isOpaque = true
        webView?.backgroundColor = .white
        webView?.scrollView.backgroundColor = .white
    }
}
