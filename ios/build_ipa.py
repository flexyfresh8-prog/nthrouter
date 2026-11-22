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

CLANG = "/tmp/ios-root/usr/lib/llvm-19/bin/clang"
LD64 = "/tmp/ios-root/usr/lib/llvm-19/bin/ld64.lld"
RESOURCE = "/tmp/ios-root/usr/lib/llvm-19/lib/clang/19/include"
DEFAULT_SDK = "/tmp/sdkdl/sdks-master/iPhoneOS16.5.sdk"
LD_LIBRARY_PATH = "/tmp/ios-root/usr/lib/x86_64-linux-gnu:/tmp/ios-root/usr/lib/llvm-19/lib"

BUNDLE_ID = "com.nthrouter.app"
DISPLAY_NAME = "NthRouter"
EXEC_NAME = "NthRouter"
VERSION = "1.0.0"
BUILD = "1"
MIN_IOS = "13.0"


def run(cmd, **kw):
    env = dict(os.environ, LD_LIBRARY_PATH=LD_LIBRARY_PATH)
    print("+", " ".join(cmd))
    return subprocess.run(cmd, check=True, env=env, **kw)


def compile_and_link(sdk: str, out: str):
    """arm64-apple-ios compile + link of the shell."""
    run([
        CLANG,
        "-target", f"arm64-apple-ios{MIN_IOS}",
        "-isysroot", sdk,
        "-isystem", RESOURCE,
        "-x", "objective-c", MAIN_M,
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
        "LSRequiresIPhoneOS": True,
        "MinimumOSVersion": MIN_IOS,
        "UIApplicationExitOnSuspend": False,
        "UIApplicationSupportsIndirectInputEvents": True,
        "UIRequiredDeviceCapabilities": ["armv7", "arm64"],
        "UIRequiresFullScreen": False,
        "UISupportedInterfaceOrientations": [
            "UIInterfaceOrientationPortrait",
            "UIInterfaceOrientationLandscapeLeft",
            "UIInterfaceOrientationLandscapeRight",
        ],
        "UIStatusBarStyle": "UIStatusBarStyleDefault",
        "UIViewControllerBasedStatusBarAppearance": True,
        "UIRequiresPersistentWiFi": False,
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
    }


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
