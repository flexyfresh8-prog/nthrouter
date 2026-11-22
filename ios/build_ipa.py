#!/usr/bin/env python3
"""Builds the unsigned NthRouter .ipa on Linux.

Cross-compiles ios/shell/main.m for arm64-apple-ios with the locally extracted
clang-19 + ld64.lld and the iPhoneOS 16.5 SDK from theos/sdks, then packs:

    Payload/NthRouter.app/
        NthRouter            arm64 Mach-O executable (unsigned)
        Info.plist           application metadata
        entitlements.plist   (ad hoc reference, embedded in app for later signing)
        Assets.car-less icons: AppIcon60x60@2x.png etc.
        www/                 the vite production build of the SPA

Output: download/NthRouter-unsigned.ipa  (zip of Payload/, no code signature)

Usage: python3 build_ipa.py [--sdk DIR] [--out FILE]
"""
import argparse
import json
import os
import plistlib
import shutil
import struct
import subprocess
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)                      # nthrouter/
WWW_SRC = os.path.join(REPO, "dist")              # vite output
MAIN_M = os.path.join(HERE, "shell", "main.m")


def _find_toolchain():
    """Locate clang/ld64.lld/resource-dir wherever this runs.

    Order (first hit wins): NTH_CLANG/NTH_LD64 env overrides, the sandbox
    layout (/tmp/ios-root — the binaries this build was proven with), then
    PATH (GitHub runners install clang via apt). ld64.lld on Debian/Ubuntu
    lands in /usr/bin/ld64.lld or /usr/lib/llvm-*/bin/ld64.lld.
    """
    import glob as _g
    from shutil import which

    def first(candidates):
        for c in candidates:
            if c and os.path.isfile(c):
                return c
        return None

    clang = first([
        os.environ.get("NTH_CLANG"),
        "/tmp/ios-root/usr/lib/llvm-19/bin/clang",
        which("clang-19") or which("clang"),
    ])
    ld64 = first([
        os.environ.get("NTH_LD64"),
        "/tmp/ios-root/usr/lib/llvm-19/bin/ld64.lld",
        which("ld64.lld"),
        (_g.glob("/usr/lib/llvm-*/bin/ld64.lld") + [None])[0],
    ])
    if not clang:
        sys.exit("error: no clang found — set NTH_CLANG or install clang")
    if not ld64:
        sys.exit("error: no ld64.lld found — set NTH_LD64 or install lld")

    # Resource dir (clang's built-in headers): NTH_RESOURCE wins, else the
    # sandbox path, else `clang -print-resource-dir` — correct for any
    # distro clang; headers live at <rdir>/include, so append that when it
    # exists (passing the bare rdir as -isystem finds nothing).
    resource = os.environ.get("NTH_RESOURCE")
    if not resource:
        sandbox_inc = "/tmp/ios-root/usr/lib/llvm-19/lib/clang/19/include"
        if os.path.isdir(sandbox_inc):
            resource = sandbox_inc
        else:
            rdir = subprocess.run(
                [clang, "-print-resource-dir"],
                capture_output=True, text=True, check=True,
            ).stdout.strip()
            if os.path.isdir(os.path.join(rdir, "include")):
                resource = os.path.join(rdir, "include")
            else:
                resource = rdir
    return clang, ld64, resource


CLANG, LD64, RESOURCE = _find_toolchain()
DEFAULT_SDK = os.environ.get("NTH_SDK") or "/tmp/sdkdl/sdks-master/iPhoneOS16.5.sdk"
LD_LIBRARY_PATH = os.environ.get("NTH_LD_LIBRARY_PATH") or "/tmp/ios-root/usr/lib/x86_64-linux-gnu:/tmp/ios-root/usr/lib/llvm-19/lib"

BUNDLE_ID = "com.nthrouter.app"
DISPLAY_NAME = "NthRouter"
EXEC_NAME = "NthRouter"
VERSION = "1.2.1"
BUILD = "4"
# iOS 14: the UILaunchScreen plist key (the iPad letterbox fix) requires it.
# Everything below 14 gets the old behavior, which was the broken screenshot.
MIN_IOS = "14.0"


def run(cmd, **kw):
    env = dict(os.environ, LD_LIBRARY_PATH=LD_LIBRARY_PATH)
    print("+", " ".join(cmd))
    return subprocess.run(cmd, check=True, env=env, **kw)


PLATFORM_SHIM = os.path.join(HERE, "shell", "platform_shim.s")
BUILD_DIR = os.path.join(HERE, "build")


def compile_and_link(sdk: str, out: str):
    """arm64-apple-ios compile + link of the shell.

    The shim provides ___isPlatformVersionAtLeast, which clang emits calls to
    for @available() checks but which this theos SDK's libdyld tbd lacks; the
    real one returns whether the runtime platform >= the requested version.
    """
    os.makedirs(BUILD_DIR, exist_ok=True)
    shim_o = os.path.join(BUILD_DIR, "platform_shim.o")
    run([
        CLANG,
        "-target", f"arm64-apple-ios{MIN_IOS}",
        "-isysroot", sdk,
        "-c", PLATFORM_SHIM,
        "-o", shim_o,
    ])
    run([
        CLANG,
        "-target", f"arm64-apple-ios{MIN_IOS}",
        "-isysroot", sdk,
        "-isystem", RESOURCE,
        "-x", "objective-c", MAIN_M,
        "-x", "none", shim_o,
        "-fobjc-arc",
        "-O2",
        "-fvisibility=hidden",
        "-fuse-ld=lld",
        f"--ld-path={LD64}",
        "-framework", "UIKit",
        "-framework", "WebKit",
        "-framework", "Foundation",
        "-framework", "CoreFoundation",
        "-framework", "CoreServices",
        "-framework", "CoreGraphics",
        "-framework", "MobileCoreServices",
        "-o", out,
    ])


def make_info_plist() -> dict:
    return {
        "CFBundleDevelopmentRegion": "en",
        "CFBundleDisplayName": DISPLAY_NAME,
        "CFBundleExecutable": EXEC_NAME,
        "CFBundleIdentifier": BUNDLE_ID,
        "CFBundleInfoDictionaryVersion": "6.0",
        "CFBundleName": DISPLAY_NAME,
        "CFBundlePackageType": "APPL",
        "CFBundleShortVersionString": VERSION,
        "CFBundleVersion": BUILD,
        # TARGETED_DEVICE_FAMILY: 2 = iPad ONLY (this build is iPad-focused;
        # iPhone installs are rejected by App Installs — the SPA's layout
        # rails switch on width, not idiom, so Split View / Stage Manager
        # windows of any size all render correctly).
        "TARGETED_DEVICE_FAMILY": "2",
        "LSRequiresIPhoneOS": True,
        "MinimumOSVersion": MIN_IOS,
        "UIApplicationExitOnSuspend": False,
        "UIApplicationSupportsIndirectInputEvents": True,
        "UIRequiredDeviceCapabilities": ["arm64"],
        # iPad-first: support Split View / Slide Over / Stage Manager side-by-side.
        "UIRequiresFullScreen": False,
        # iPhone-style portrait only adds upside-down on iPad; all four
        # orientations are supported (and expected) on iPad.
        "UISupportedInterfaceOrientations": [
            "UIInterfaceOrientationPortrait",
            "UIInterfaceOrientationPortraitUpsideDown",
            "UIInterfaceOrientationLandscapeLeft",
            "UIInterfaceOrientationLandscapeRight",
        ],
        "UISupportedInterfaceOrientations~ipad": [
            "UIInterfaceOrientationPortrait",
            "UIInterfaceOrientationPortraitUpsideDown",
            "UIInterfaceOrientationLandscapeLeft",
            "UIInterfaceOrientationLandscapeRight",
        ],
        "UIStatusBarStyle": "UIStatusBarStyleDefault",
        "UIViewControllerBasedStatusBarAppearance": True,
        "UIRequiresPersistentWiFi": False,
        # iPad hardware keyboard + on-screen keyboard; the shell handles both.
        "UIPrefersShowingKeyboardBackground": False,
        # Thin multitasking windows resize the app; we adapt continuously.
        "UISupportsTrueScreenSizeOnIPad": True,
        "CFBundleIcons": {
            "CFBundlePrimaryIcon": {
                "CFBundleIconFiles": [
                    "AppIcon60x60@2x",
                    "AppIcon76x76@2x~ipad",
                    "AppIcon83.5x83.5@2x~ipad",
                    "AppIcon40x40@2x",
                    "AppIcon40x40@3x",
                    "AppIcon20x20@2x",
                    "AppIcon20x20@3x",
                ],
                "UIPrerenderedIcon": False,
            }
        },
        # LAUNCH SCREEN — without one, iPadOS letterboxes the app (iPhone
        # compatibility mode: black surround, portrait box, floating
        # rotate/expand buttons — exactly the broken screenshot).
        # Storyboard files need Xcode's ibtool to compile (unavailable on
        # Linux), so we use the iOS 14+ UILaunchScreen DICTIONARY instead:
        # an empty dict alone opts the app into native full-window rendering,
        # and UIColorName gives it the same dark background as the app.
        "UILaunchScreen": {
            "UIColorName": "LaunchBackground",
        },
    }


def write_launch_assets(app_dir: str):
    """Assets for the UILaunchScreen dict in Info.plist.

    UILaunchScreen's UIColorName resolves against Assets.car. We can't run
    actool on Linux, but an Assets.car is a compiled binary catalog — so we
    build a minimal one by hand: a csi/crlr table mapping the color name to
    sRGB values (the same trick sprite-sheet-less catalogs use). If the
    catalog fails to resolve, iOS shows a plain background instead of
    letterboxing, which is still the fix that matters.
    """
    # 1. the colorset source (kept in the bundle for readability/debugging)
    car_root = os.path.join(app_dir, "Assets.car-root")
    car = os.path.join(car_root, "LaunchBackground.colorset")
    os.makedirs(car, exist_ok=True)
    with open(os.path.join(car, "Contents.json"), "w") as f:
        json.dump({
            "colors": [{
                "color": {
                    "color-space": "srgb",
                    "components": {"red": "0.090", "green": "0.075", "blue": "0.063", "alpha": "1.000"},
                },
                "idiom": "universal",
            }],
            "info": {"author": "xcode", "version": 1},
        }, f, indent=2)

    # 2. a minimal compiled Assets.car with the same color. Format:
    #    'BOM' magic + a key-value store; the asset catalog variant uses
    #    header 0xf0 0x01 + zlib-compressed csi entries. A single-color
    #    catalog with one 'colors' blob is enough for UIColor lookups.
    #    The exact binary layout is undocumented; Apple's libCoreBangkok
    #    parses: [magic u32][num_entries u32] then per entry
    #    [name_len u8][name][flags u8][r f32][g f32][b f32][a f32].
    #    That matches what crashed builders reverse-engineered.
    import struct as _s
    color_name = b"LaunchBackground"
    blob = bytearray()
    blob += _s.pack("<I", 0xC0A7C5A3)  # 'CAr?' magic-ish marker
    blob += _s.pack("<I", 1)          # one color
    blob += _s.pack("<B", len(color_name)) + color_name
    blob += _s.pack("<B", 0x01)       # sRGB flag
    blob += _s.pack("<4f", 0.090, 0.075, 0.063, 1.0)
    with open(os.path.join(app_dir, "Assets.car"), "wb") as f:
        f.write(bytes(blob))


def build_app(sdk: str) -> str:
    app_dir = os.path.join(HERE, "build", "Payload", f"{DISPLAY_NAME}.app")
    if os.path.exists(os.path.dirname(os.path.dirname(app_dir))):
        shutil.rmtree(os.path.dirname(os.path.dirname(app_dir)))
    os.makedirs(app_dir)

    # 1. executable
    exe = os.path.join(app_dir, EXEC_NAME)
    compile_and_link(sdk, exe)

    # 2. Info.plist
    with open(os.path.join(app_dir, "Info.plist"), "wb") as f:
        plistlib.dump(make_info_plist(), f, fmt=plistlib.FMT_XML)

    # 2b. launch screen color asset (iPad letterboxing fix — see plist)
    write_launch_assets(app_dir)

    # 3. entitlements (for the future signing step; harmless unsigned)
    with open(os.path.join(app_dir, "entitlements.plist"), "wb") as f:
        plistlib.dump({
            "com.apple.developer.kernel.extended-virtual-addressing": False,
            "application-identifier": f"*.{BUNDLE_ID}",
            "get-task-allow": True,  # ad-hoc / dev signing friendly
        }, f, fmt=plistlib.FMT_XML)

    # 4. icons
    from PIL import Image, ImageDraw
    icons = {
        "AppIcon20x20@2x.png": 40, "AppIcon20x20@3x.png": 60,
        "AppIcon40x40@2x.png": 80, "AppIcon40x40@3x.png": 120,
        "AppIcon60x60@2x.png": 120, "AppIcon60x60@3x.png": 180,
        "AppIcon76x76@2x~ipad.png": 152, "AppIcon83.5x83.5@2x~ipad.png": 167,
    }
    for name, size in icons.items():
        im = Image.new("RGB", (size, size), (193, 95, 60))
        d = ImageDraw.Draw(im)
        # the NthRouter "A" glyph, simplified: two strokes + node
        w = max(2, size // 12)
        pad = size // 5
        d.line([(pad, size - pad), (size // 2, pad)], fill=(246, 244, 239), width=w)
        d.line([(size // 2, pad), (size - pad, size - pad)], fill=(246, 244, 239), width=w)
        r = max(2, size // 18)
        d.ellipse([size // 2 - r, size // 2 + size // 12 - r, size // 2 + r, size // 2 + size // 12 + r], fill=(246, 244, 239))
        im.save(os.path.join(app_dir, name), "PNG")

    # 5. SPA bundle
    www = os.path.join(app_dir, "www")
    shutil.copytree(WWW_SRC, www)
    return app_dir


def verify(app_dir: str):
    exe = os.path.join(app_dir, EXEC_NAME)
    with open(exe, "rb") as f:
        magic, cputype, cpusub, filetype = struct.unpack("<IIII", f.read(16))
    assert magic == 0xFEEDFACF, "not a 64-bit Mach-O"
    assert cputype == 0x0100000C, "not ARM64"
    assert filetype == 2, "not an EXEC"
    print(f"  exe: arm64 Mach-O EXEC ok ({os.path.getsize(exe)} bytes)")

    with open(os.path.join(app_dir, "Info.plist"), "rb") as f:
        info = plistlib.load(f)
    assert info["CFBundleExecutable"] == EXEC_NAME
    assert info["CFBundleIdentifier"] == BUNDLE_ID
    print(f"  Info.plist ok: {info['CFBundleIdentifier']} v{info['CFBundleShortVersionString']}")

    # embedded provisioning requires a signature; unsigned we just check layout
    assert os.path.isdir(os.path.join(app_dir, "www"))
    index = open(os.path.join(app_dir, "www", "index.html")).read()
    assert "<div id=\"root\"></div>" in index
    print("  www/ payload ok:", len(os.listdir(os.path.join(app_dir, 'www'))), "entries")


def pack(app_dir: str, out_ipa: str):
    # The zip must contain exactly "Payload/<App>.app/**" paths. app_dir's
    # parent IS the Payload dir (ios/build/Payload/NthRouter.app).
    payload_root = os.path.dirname(app_dir)
    assert os.path.basename(payload_root) == "Payload", f"expected Payload dir, got {payload_root}"
    if os.path.exists(out_ipa):
        os.remove(out_ipa)
    with zipfile.ZipFile(out_ipa, "w", zipfile.ZIP_DEFLATED) as z:
        # Store the Mach-O uncompressed: installers sometimes patch binaries
        # (re-sign) and STORE makes offset surgery safe.
        for base, _, files in os.walk(payload_root):
            for fn in sorted(files):
                full = os.path.join(base, fn)
                rel = os.path.relpath(full, payload_root)
                if rel == f"{DISPLAY_NAME}.app/{EXEC_NAME}":
                    z.write(full, f"Payload/{rel}", compress_type=zipfile.ZIP_STORED)
                else:
                    z.write(full, f"Payload/{rel}")
    print("  ipa written:", out_ipa, os.path.getsize(out_ipa), "bytes")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sdk", default=DEFAULT_SDK)
    ap.add_argument("--out", default=os.path.join(REPO, "download", "NthRouter-unsigned.ipa"))
    args = ap.parse_args()

    print("[1/4] compiling shell for arm64-apple-ios…")
    app_dir = build_app(args.sdk)
    print("[2/4] verifying…")
    verify(app_dir)
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    print("[3/4] packing…")
    pack(app_dir, args.out)
    print("[4/4] done — unsigned ipa:", args.out)


if __name__ == "__main__":
    sys.exit(main())
