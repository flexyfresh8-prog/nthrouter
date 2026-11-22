/**
 * NthRouter iOS shell — a thin WKWebView around the bundled SPA.
 * Tuned for iPad first: full window fill (no letterboxing — see the
 * launch-screen storyboard in build_ipa.py), full safe-area pinning
 * (Split View / Stage Manager), keyboard avoidance, interactive
 * drag-to-dismiss keyboard, native back/forward swipe navigation, and
 * all four iPad orientations including portrait-upsidedown.
 *
 * Design notes:
 *  - The SPA is copied into the app bundle as "www/". We serve index.html via
 *    WKURLSchemeHandler ("app") instead of loadFileURL, which gives the app a
 *    real origin, proper caching headers and no file:// quirks — the SPA's
 *    localStorage (the encrypted key vault) then behaves exactly like on desktop.
 *  - Content is served only from "app://nthrouter/" and no navigation outside
 *    that origin is allowed in the main webview; external links open in Safari.
 *  - Dark mode follows the system (trait collection), piped into the page by
 *    pre-seeding the SPA store's settings.theme before first paint — so the
 *    app opens dark on a dark iPad (matching the reference look: dark two-pane
 *    chat) and light on a light one. The persisted user preference wins once
 *    they've chosen one in Settings.
 *  - Everything runs locally; the only network the SPA performs is direct
 *    calls to AI providers from the webview.
 */
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
#import <CoreServices/CoreServices.h>

static NSString *const kScheme = @"app";
static NSString *const kHost = @"nthrouter";

#pragma mark - Scheme handler: serves www/ out of the bundle

@interface AppSchemeHandler : NSObject <WKURLSchemeHandler>
@end

@implementation AppSchemeHandler

- (void)webView:(WKWebView *)webView startURLSchemeTask:(id <WKURLSchemeTask>)task {
    dispatch_async(dispatch_get_main_queue(), ^{
        [self serve:task];
    });
}

- (void)serve:(id <WKURLSchemeTask>)task {
    NSURL *url = task.request.URL;
    NSString *path = url.path.length > 1 ? [url.path substringFromIndex:1] : @"index.html";

    // Resolve inside www/ only — a request like app://x/../../etc must fail.
    NSString *wwwDir = [[[NSBundle mainBundle] resourcePath] stringByAppendingPathComponent:@"www"];
    NSString *filePath = [wwwDir stringByAppendingPathComponent:path];
    NSString *canonical = [[filePath stringByStandardizingPath] stringByDeletingLastPathComponent];
    if (![canonical hasPrefix:wwwDir]) {
        [task didFailWithError:[NSError errorWithDomain:NSCocoaErrorDomain code:NSFileReadNoSuchFileError userInfo:@{NSLocalizedDescriptionKey: @"path outside bundle"}]];
        return;
    }

    if (![[NSFileManager defaultManager] fileExistsAtPath:filePath]) {
        // SPA routing: every unknown path falls back to index.html.
        filePath = [wwwDir stringByAppendingPathComponent:@"index.html"];
    }

    NSString *ext = [filePath pathExtension];
    NSDictionary *mimes = @{
        @"html": @"text/html", @"js": @"text/javascript", @"css": @"text/css",
        @"svg": @"image/svg+xml", @"png": @"image/png", @"json": @"application/json",
        @"woff2": @"font/woff2", @"ico": @"image/x-icon",
    };
    CFStringRef uti = NULL;
    NSString *mime = mimes[ext];
    if (!mime) {
        uti = UTTypeCreatePreferredIdentifierForTag(kUTTagClassFilenameExtension, (__bridge CFStringRef)ext, NULL);
        if (uti) {
            mime = (__bridge_transfer NSString *)UTTypeCopyPreferredTagWithClass(uti, kUTTagClassMIMEType);
            if (!mime) mime = @"application/octet-stream";
        } else {
            mime = @"application/octet-stream";
        }
    }

    NSData *data = [NSData dataWithContentsOfFile:filePath];
    if (!data) {
        [task didFailWithError:[NSError errorWithDomain:NSCocoaErrorDomain code:NSFileReadNoSuchFileError userInfo:@{NSLocalizedDescriptionKey: [NSString stringWithFormat:@"missing %@", path]}]];
        return;
    }

    // CORS headers are REQUIRED: the built index.html loads its assets with
    // the crossorigin attribute, so WebKit performs a real CORS check against
    // app://nthrouter. Without Access-Control-Allow-Origin the module script
    // and CSS fail to load → blank white page.
    NSHTTPURLResponse *resp = [[NSHTTPURLResponse alloc] initWithURL:url
        statusCode:200 HTTPVersion:@"HTTP/1.1"
        headerFields:@{
            @"Content-Type": mime,
            @"Access-Control-Allow-Origin": kHost,
            @"Cache-Control": @"no-cache",
        }];
    [task didReceiveResponse:resp];
    [task didReceiveData:data];
    [task didFinish];
}

- (void)webView:(WKWebView *)webView stopURLSchemeTask:(id <WKURLSchemeTask>)task {
    /* nothing to cancel — the read already finished synchronously */
}

@end

#pragma mark - View controller

@interface WebVC : UIViewController <WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler>
@property (strong, nonatomic) WKWebView *web;
@property (strong, nonatomic) NSLayoutConstraint *bottomToKeyboard;
@end

@implementation WebVC

- (void)viewDidLoad {
    [super viewDidLoad];

    // Blank-screen watchdog: if the first paint never happens in 12s (a
    // failed module load, a JS exception, anything we didn't predict), fall
    // back to a plain loadFileURL which bypasses the scheme handler entirely.
    // The app stays usable instead of showing a white box.
    [self performSelector:@selector(watchdogFire) withObject:nil afterDelay:12.0];

    WKWebViewConfiguration *config = [WKWebViewConfiguration new];
    [config setURLSchemeHandler:[[AppSchemeHandler alloc] init] forURLScheme:kScheme];
    config.preferences.javaScriptEnabled = YES;
    config.defaultWebpagePreferences.preferredContentMode = WKContentModeRecommended;
    config.applicationNameForUserAgent = @"NthRouter-iOS/1.2";

    WKUserContentController *u = config.userContentController;
    [u addScriptMessageHandler:self name:@"nth"];

    self.web = [[WKWebView alloc] initWithFrame:CGRectZero configuration:config];
    self.web.translatesAutoresizingMaskIntoConstraints = NO;
    self.web.navigationDelegate = self;
    self.web.UIDelegate = self;

    // iPad niceties:
    // The SPA handles its own safe areas (viewport-fit=cover + env()), so stop
    // the scroll view from double-padding them.
    self.web.scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
    // Drag inside the page to dismiss the keyboard (Safari-style), so the chat
    // input never traps the viewport.
    self.web.scrollView.keyboardDismissMode = UIScrollViewKeyboardDismissModeInteractive;
    self.web.scrollView.bounces = NO;
    if (@available(iOS 13.4, *)) {
        // Pencil/trackpad scrolling over the page.
        self.web.scrollView.panGestureRecognizer.allowedScrollTypesMask = UIScrollTypeMaskAll;
    }
    // Edge-swipe back/forward through in-app history, like Safari on iPad.
    self.web.allowsBackForwardNavigationGestures = YES;

    [self.view addSubview:self.web];
    [NSLayoutConstraint activateConstraints:@[
        [self.web.topAnchor constraintEqualToAnchor:self.view.topAnchor],
        [self.web.leftAnchor constraintEqualToAnchor:self.view.leftAnchor],
        [self.web.rightAnchor constraintEqualToAnchor:self.view.rightAnchor],
    ]];

    if (@available(iOS 15.0, *)) {
        // One constraint handles both keyboard shown (rises with the keyboard)
        // and hidden (parks at the view bottom) — Split View and Stage Manager safe.
        [self.web.bottomAnchor constraintEqualToAnchor:self.view.keyboardLayoutGuide.bottomAnchor].active = YES;
    } else {
        // iPadOS 13/14: bottom pinned to the view, nudged up by keyboard frames.
        self.bottomToKeyboard = [self.web.bottomAnchor constraintEqualToAnchor:self.view.bottomAnchor];
        self.bottomToKeyboard.active = YES;
        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(kbWillChangeFrame:)
                                                     name:UIKeyboardWillChangeFrameNotification
                                                   object:nil];
    }

    // Warm-dark behind the webview: on a dark iPad the letterbox margins and
    // any pre-paint frames are dark (matching the SPA's dark theme) instead
    // of white.
    UIColor *darkBG = [UIColor colorWithRed:0x17/255.0 green:0x13/255.0 blue:0x10/255.0 alpha:1];
    self.view.backgroundColor = darkBG;
    self.web.backgroundColor = darkBG;

    [self.web loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:[NSString stringWithFormat:@"%@://%@/", kScheme, kHost]]]];
}

- (void)watchdogFire {
    // Page painted a body (non-white content) → healthy, nothing to do.
    NSString *probe = @"(function(){var b=document.body;return !!(b&&(b.childElementCount||b.textContent.trim().length))})();";
    __weak typeof(self) weakSelf = self;
    [self.web evaluateJavaScript:probe completionHandler:^(id result, NSError *err) {
        if (!weakSelf) return;
        if (!err && [result boolValue]) return;  // healthy
        NSLog(@"[nth] watchdog: first paint failed (%@) — falling back to loadFileURL", err.localizedDescription);
        [weakSelf fallbackLoad];
    }];
}

- (void)fallbackLoad {
    // Plain file load: the scheme handler is bypassed and WebKit's own
    // file:// loading takes over. localStorage (the vault) is scoped to a
    // different origin this way, so this is a display-only fallback — but a
    // readable app beats a white box.
    NSString *www = [[NSBundle mainBundle] pathForResource:@"www/index" ofType:@"html"];
    [self.web loadFileURL:[NSURL fileURLWithPath:www]
        allowingReadAccessToURL:[NSURL fileURLWithPath:[www stringByDeletingLastPathComponent]]];
}

- (void)kbWillChangeFrame:(NSNotification *)note {
    CGRect kb = [note.userInfo[UIKeyboardFrameEndUserInfoKey] CGRectValue];
    // Keyboard frames are in window coordinates; intersect with this view to
    // get the actual overlap (correct in Split View, where the app window is
    // only part of the screen).
    CGRect frameInWindow = [self.view convertRect:self.view.bounds toView:nil];
    CGRect overlap = CGRectIntersection(kb, frameInWindow);
    CGFloat inset = CGRectIsNull(overlap) ? 0 : CGRectGetHeight(overlap);

    // Only shift when the keyboard actually covers us; animate alongside the
    // keyboard's own curve so the chat input bar tracks it exactly.
    NSNumber *durNum = note.userInfo[UIKeyboardAnimationDurationUserInfoKey];
    NSTimeInterval dur = durNum ? [durNum doubleValue] : 0.25;
    [UIView animateWithDuration:dur delay:0 options:UIViewAnimationOptionBeginFromCurrentState animations:^{
        self.bottomToKeyboard.constant = -inset;
        [self.view layoutIfNeeded];
    } completion:nil];
}

- (void)dealloc {
    [[NSNotificationCenter defaultCenter] removeObserver:self];
    [NSObject cancelPreviousPerformRequestsWithTarget:self];
}

- (void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear:animated];
    [self syncTheme];
}

- (void)traitCollectionDidChange:(UITraitCollection *)previous {
    [super traitCollectionDidChange:previous];
    if ([self.traitCollection hasDifferentColorAppearanceComparedToTraitCollection:previous]) [self syncTheme];
}

- (void)syncTheme {
    // Pre-seed the SPA store's theme to match the system BEFORE first paint:
    // store.init() reads localStorage('nthrouter.db.v1') and merges settings,
    // so if settings.theme is unset we write ours in. If the user has chosen a
    // theme in Settings (persisted), we don't touch it.
    BOOL dark = self.traitCollection.userInterfaceStyle == UIUserInterfaceStyleDark;
    NSString *js = [NSString stringWithFormat:
        @"(function(){try{"
        @"var raw=localStorage.getItem('nthrouter.db.v1');var s=raw?JSON.parse(raw):{};"
        @"if(!s.settings)s.settings={};"
        @"if(!s.settings.theme)s.settings.theme='%@';"
        @"localStorage.setItem('nthrouter.db.v1',JSON.stringify(s));"
        @"}catch(e){}})();", dark ? @"dark" : @"light"];
    [self.web evaluateJavaScript:js completionHandler:nil];
}

- (void)userContentController:(WKUserContentController *)userContentController didReceiveScriptMessage:(WKScriptMessage *)message {
    // The page uses this channel to report its state to the shell (currently informational).
    NSLog(@"[nth] %@", message.body);
}

#pragma mark - navigation policy

- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)action decisionHandler:(void (^)(WKNavigationActionPolicy))handler {
    NSURL *url = action.request.URL;
    BOOL ours = [url.scheme caseInsensitiveCompare:kScheme] == NSOrderedSame;
    if (ours) return handler(WKNavigationActionPolicyAllow);
    if (url) [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:nil];
    handler(WKNavigationActionPolicyCancel);
}

- (WKWebView *)webView:(WKWebView *)webView createWebViewWithConfiguration:(WKWebViewConfiguration *)configuration forNavigationAction:(WKNavigationAction *)action windowFeatures:(WKWindowFeatures *)window {
    // target=_blank etc. — send them through the same external-link policy.
    [[UIApplication sharedApplication] openURL:action.request.URL options:@{} completionHandler:nil];
    return nil;
}

- (void)webViewWebContentProcessDidTerminate:(WKWebView *)webView {
    // WebContent got jetsam'd — reload the SPA. localStorage survives (it is
    // persisted by WebKit separately from the process).
    [self.web reload];
}

@end

#pragma mark - App delegate + main

@interface AppDelegate : UIResponder <UIApplicationDelegate>
@property (strong, nonatomic) UIWindow *window;
@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
    WebVC *vc = [WebVC new];

    // Navigation controller so edge-swipe back/forward (iPad trackpad and
    // finger) has a real stack to work with, and the webview survives pushes.
    UINavigationController *nav = [[UINavigationController alloc] initWithRootViewController:vc];
    nav.navigationBarHidden = YES;

    self.window.rootViewController = nav;
    [self.window makeKeyAndVisible];
    return YES;
}

@end

int main(int argc, char *argv[]) {
    @autoreleasepool {
        return UIApplicationMain(argc, argv, nil, NSStringFromClass([AppDelegate class]));
    }
}
