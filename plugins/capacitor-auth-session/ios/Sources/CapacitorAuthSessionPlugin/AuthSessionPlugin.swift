import Foundation
import Capacitor
import AuthenticationServices

@objc(AuthSessionPlugin)
public class AuthSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AuthSessionPlugin"
    public let jsName = "AuthSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise)
    ]

    private var authSession: ASWebAuthenticationSession?
    private var currentCall: CAPPluginCall?

    @objc func start(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let url = URL(string: urlString),
              let callbackUrlScheme = call.getString("callbackUrlScheme") else {
            call.reject("Missing required parameters: url and callbackUrlScheme")
            return
        }

        let preferEphemeral = call.getBool("preferEphemeralSession") ?? true

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            self.currentCall = call

            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: callbackUrlScheme
            ) { callbackURL, error in
                if let error = error {
                    let nsError = error as NSError
                    if nsError.domain == ASWebAuthenticationSessionErrorDomain,
                       nsError.code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                        call.reject("User cancelled the authentication session")
                    } else {
                        call.reject("Authentication error: \(error.localizedDescription)")
                    }
                    return
                }

                if let callbackURL = callbackURL {
                    call.resolve(["url": callbackURL.absoluteString])
                } else {
                    call.reject("No callback URL received")
                }
            }

            session.prefersEphemeralWebBrowserSession = preferEphemeral

            if #available(iOS 13.0, *) {
                session.presentationContextProvider = self
            }

            self.authSession = session

            if !session.start() {
                call.reject("Failed to start authentication session")
            }
        }
    }
}

extension AuthSessionPlugin: ASWebAuthenticationPresentationContextProviding {
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return self.bridge?.webView?.window ?? ASPresentationAnchor()
    }
}
