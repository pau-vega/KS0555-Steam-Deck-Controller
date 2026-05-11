#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Must be set BEFORE any WebKitGTK init — fixes blank white screen on
    // Steam Deck / Gamescope / X11 compositors. See WebKit bug 180739.
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    app_lib::run();
}
