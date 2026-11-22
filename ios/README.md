# iOS build (unsigned .ipa) — iPad-first

`ios/build_ipa.py` cross-compiles the NthRouter shell for **arm64-apple-ios** and packs an **unsigned** `.ipa` — entirely on Linux, no Xcode, no macOS, no Apple Developer account needed to produce it.

```
ios/
  shell/main.m       WKWebView shell: custom app:// scheme serves www/ from the bundle,
                     dark-mode sync, external links to Safari, jetsam reload
  build_ipa.py       compile + link + pack (clang-19 + ld64.lld + iPhoneOS16.5 SDK)
  build/             output (Payload/NthRouter.app) — gitignored
```

## How it works

1. **SPA** — `npm run build` produces `dist/` (plain static Vite output).
2. **Shell** — one Objective-C file (`ios/shell/main.m`) registers a `WKURLSchemeHandler` for the `app://` scheme and serves the SPA out of the app bundle. The webview gets a real origin (not `file://`), so the encrypted key vault (`localStorage`) behaves exactly like desktop. Path traversal is blocked, unknown paths fall back to `index.html` (SPA routing).
3. **Compile** — `clang` with `-target arm64-apple-ios14.0 -isysroot <iPhoneOS16.5.sdk>`; headers come from the SDK, and SDK `.tbd` stub libraries satisfy the link.
4. **Link** — `ld64.lld` (the Mach-O flavor of LLD — `ld.lld` is ELF-only).
5. **Pack** — `Payload/NthRouter.app/{NthRouter, Info.plist, entitlements.plist, AppIcon*.png, www/}` zipped with the Mach-O **STORED** (uncompressed) so re-signing tools can patch it safely.

## Toolchain setup (no root)

The sandbox has no Xcode and no macOS, so the toolchain is assembled from Debian packages + the community SDK:

```bash
# 1. clang + lld + resource headers, extracted without installing (no root needed)
mkdir -p /tmp/ios-debs /tmp/ios-root && cd /tmp/ios-debs
apt-get download clang-19 lld-19 llvm-19 llvm-19-runtime libllvm19 libclang-cpp19 \
             llvm-19-linker-tools binutils libclang-common-19-dev
for d in *.deb; do dpkg-deb -x "$d" /tmp/ios-root/; done

# 2. iOS SDK (headers + .tbd stubs) from theos/sdks
curl -sL https://github.com/theos/sdks/archive/master.zip -o sdks.zip
unzip -q sdks.zip "sdks-master/iPhoneOS16.5.sdk/*" -d /tmp/sdkdl/
```

Paths resolve automatically (sandbox layout → env overrides `NTH_CLANG` / `NTH_LD64` / `NTH_RESOURCE` / `NTH_SDK` → PATH), so the same script runs unchanged in CI; see the `_find_toolchain()` probe at the top of `build_ipa.py`.

## Build

```bash
npm run build                     # SPA -> dist/
python3 ios/build_ipa.py          # -> download/NthRouter-unsigned.ipa
```

Verified output: arm64 Mach-O `EXEC` (0xfeedfacf / CPU 0x100000c), `Info.plist` parses, `Payload/`-only layout, zip integrity OK, minimum iOS 14.0, 7 icon sizes, `www/` with hashed assets.

## CI: built on GitHub

`.github/workflows/build-ipa.yml` runs this exact build on GitHub's `ubuntu-24.04` runners on every push to `main` (or via *workflow_dispatch*): apt `clang`+`lld`, a sparse fetch of the iPhoneOS 16.5 SDK from theos/sdks, `npm ci && npm run build`, then `python3 ios/build_ipa.py`. The unsigned `.ipa` is published as the **`NthRouter-unsigned-ipa`** Actions artifact — the ipa is produced *on GitHub*, not merely pushed to it. Same script, same SDK, same plist; only the toolchain binaries differ (distro clang instead of the sandbox's extracted clang-19 — the script prints the exact `+` command lines it used).

## iPad focus

### v1.2.0 — white-screen fix

Three bugs produced the "blank white portrait box on black" screenshot:

1. **Letterboxing** — the app had no launch screen, so iPadOS ran it in iPhone
   compatibility mode (portrait box centered in a black surround with floating
   rotate/expand buttons). Fixed with the iOS 14+ `UILaunchScreen` plist dict
   (an empty dict alone opts into native full-window rendering; ours adds
   `UIColorName` for a dark background). Storyboards were NOT used — they need
   Xcode's `ibtool`, unavailable on Linux. A minimal `Assets.car` is built by
   hand for the color; if iOS can't resolve it, the fallback background is
   still full-window (the letterbox is gone either way).
2. **Blank page** — vite emits `<script crossorigin src=...>` and
   `<link crossorigin ...>`, so WebKit runs a real CORS check against
   `app://nthrouter`. The scheme handler returned no CORS headers → the module
   and CSS failed to load → React never mounted → white page. Fixed: every
   response now carries `Access-Control-Allow-Origin: nthrouter`. The handler
   also dispatches to the main queue before responding (WebKit expects the
   scheme task callbacks to not be reentrant with the request).
3. **Wrong default look** — the SPA defaults to light, but the reference
   screenshots show a dark two-pane chat. The shell now pre-seeds the SPA
   store's `settings.theme` to the system appearance before first paint
   (persisted user choice always wins afterwards).

Plus a watchdog: if first paint hasn't happened 12s after launch, the shell
falls back to `loadFileURL` so the app is at least usable (display-only, since
the vault's localStorage origin differs under file://). The webview's own
background is set to the SPA's dark background so no white flash precedes paint.


The shell and the plist are tuned for iPad first (the SPA already rails at ≥768px with `viewport-fit=cover`):

- **Multitasking**: `UIRequiresFullScreen=False`, `TARGETED_DEVICE_FAMILY=2` — **iPad-only** install (iPhone is rejected by App Installs); runs side-by-side in Split View / Slide Over / Stage Manager at any window width (the SPA's nav rail/bottom-tabs switch on width, not idiom).
- **Orientations**: all four, including portrait-upsidedown (base and `~ipad` keys).
- **Keyboard**: on-screen keyboard avoidance via `keyboardLayoutGuide` (iOS 15+) with a `UIKeyboardWillChangeFrameNotification` fallback for iPadOS 13/14; the fallback intersects the keyboard frame with the view's window frame so the offset is correct in Split View. Drag inside the page dismisses the keyboard (Safari-style, `keyboardDismissMode=interactive`), so chat input never traps the viewport. Hardware keyboards just work.
- **Navigation**: edge-swipe back/forward through in-app history (`allowsBackForwardNavigationGestures`), like Safari on iPad.
- **Trackpad / Pencil**: scroll types enabled from iOS 13.4.
- **Safe areas**: the scroll view no longer double-pads them — the SPA handles them itself (`env(safe-area-inset-*)`).
- **`ios/shell/platform_shim.s`**: provides `___isPlatformVersionAtLeast`, which clang emits for `@available()` but this theos SDK's libdyld tbd lacks. It compares a packed (major, minor, patch) against the runtime version and returns `>=`.

## Sideload: it must be signed before iOS will run it

An *unsigned* ipa is the raw artifact — iOS requires every app to carry a code signature (even "free" ones). Your options, cheapest first:

| Method | Cost | What you get |
| --- | --- | --- |
| **AltStore / SideStore** | free, any Apple ID | 7-day refresh cycle, on-device signing |
| **TrollStore** (iOS 14–16.x, some 17.x) | free, no resign | permanent install on supported versions |
| **ldid / zsign on this very ipa** | free | ad-hoc signature — for jailbroken devices, emulators, or your own tooling |
| **Apple Developer + Xcode/Transporter** | $99/yr | App Store or TestFlight distribution |

Ad-hoc example (works with the entitlements embedded at `Payload/NthRouter.app/entitlements.plist`, which is dev-signing friendly via `get-task-allow`):

```bash
zsign -k dev.pem -m dev.mobileprovision NthRouter-unsigned.ipa NthRouter.ipa
```

Notes and limits, stated plainly:

- Built and structurally verified on Linux; **not run on a real iPhone from this environment** — no device here. The binary links against UIKit/WebKit/Foundation via SDK stubs, and the shell is the kind of WKWebView wrapper App Store review generally accepts, but on-device behavior is untested.
- arm64-only, **iPad-only** (`TARGETED_DEVICE_FAMILY=2`, minimum iOS 14) — the build targets modern iPads.
- In-app key use happens through the webview's `fetch` to each provider — subject to that provider's CORS + TLS posture, same as desktop Safari.
- The embedded `entitlements.plist` is a reference for signing tools, not an active entitlement: unsigned, nothing is granted.
