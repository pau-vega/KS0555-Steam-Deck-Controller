use std::fs;
use std::path::Path;

#[test]
fn test_taur01_cargo_toml_exists_with_tauri() {
    // TAUR-01: Verify Cargo.toml exists and has tauri dependency
    let cargo_path = Path::new("Cargo.toml");
    assert!(cargo_path.exists(), "Cargo.toml should exist");
    
    let content = fs::read_to_string(cargo_path).expect("Should be able to read Cargo.toml");
    
    // Verify tauri dependency exists
    assert!(content.contains("tauri"), "Cargo.toml should contain tauri dependency");
    
    // Verify edition 2021
    assert!(content.contains("edition = \"2021\""), "Cargo.toml should specify edition 2021");
}

#[test]
fn test_taur01_main_rs_exists_with_proper_entrypoint() {
    // TAUR-01: Verify main.rs and lib.rs exist with proper Tauri entrypoint
    let main_path = Path::new("src/main.rs");
    assert!(main_path.exists(), "main.rs should exist");
    
    let main_content = fs::read_to_string(main_path).expect("Should be able to read main.rs");
    assert!(main_content.contains("fn main()"), "main.rs should have fn main()");
    assert!(main_content.contains("app_lib::run()"), "main.rs should call app_lib::run()");
    
    let lib_path = Path::new("src/lib.rs");
    assert!(lib_path.exists(), "lib.rs should exist");
    
    let lib_content = fs::read_to_string(lib_path).expect("Should be able to read lib.rs");
    assert!(lib_content.contains("tauri::Builder"), "lib.rs should use tauri::Builder");
    assert!(lib_content.contains("tauri::generate_context!"), "lib.rs should call generate_context!");
    assert!(lib_content.contains("pub fn run()"), "lib.rs should have pub fn run()");
}

#[test]
fn test_taur02_tauri_conf_json_has_product_name() {
    // TAUR-02: Verify tauri.conf.json has productName "Robot Controller"
    let conf_path = Path::new("tauri.conf.json");
    assert!(conf_path.exists(), "tauri.conf.json should exist");
    
    let content = fs::read_to_string(conf_path).expect("Should be able to read tauri.conf.json");
    
    // Parse as JSON
    let json: serde_json::Value = serde_json::from_str(&content).expect("Should be valid JSON");
    
    assert_eq!(
        json["productName"].as_str().unwrap(),
        "Robot Controller",
        "productName should be 'Robot Controller'"
    );
}

#[test]
fn test_taur02_tauri_conf_json_has_identifier() {
    // TAUR-02: Verify tauri.conf.json has identifier "com.ks0555.robotcontroller"
    let conf_path = Path::new("tauri.conf.json");
    let content = fs::read_to_string(conf_path).expect("Should be able to read tauri.conf.json");
    let json: serde_json::Value = serde_json::from_str(&content).expect("Should be valid JSON");
    
    assert_eq!(
        json["identifier"].as_str().unwrap(),
        "com.ks0555.robotcontroller",
        "identifier should be 'com.ks0555.robotcontroller'"
    );
}

#[test]
fn test_taur02_tauri_conf_json_has_dev_url() {
    // TAUR-02: Verify tauri.conf.json has devUrl "http://localhost:5173"
    let conf_path = Path::new("tauri.conf.json");
    let content = fs::read_to_string(conf_path).expect("Should be able to read tauri.conf.json");
    let json: serde_json::Value = serde_json::from_str(&content).expect("Should be valid JSON");
    
    assert_eq!(
        json["build"]["devUrl"].as_str().unwrap(),
        "http://localhost:5173",
        "devUrl should be 'http://localhost:5173'"
    );
}

#[test]
fn test_taur02_tauri_conf_json_has_deb_target() {
    // PKG-01: Verify tauri.conf.json has deb bundle target
    let conf_path = Path::new("tauri.conf.json");
    let content = fs::read_to_string(conf_path).expect("Should be able to read tauri.conf.json");
    let json: serde_json::Value = serde_json::from_str(&content).expect("Should be able to read tauri.conf.json");
    
    let targets = json["bundle"]["targets"].as_array().expect("targets should be an array");
    let has_deb = targets.iter().any(|t| t.as_str() == Some("deb"));
    assert!(has_deb, "bundle targets should include 'deb'");
    assert!(!targets.iter().any(|t| t.as_str() == Some("appimage")), "appimage target should NOT remain");
}

#[test]
fn test_taur05_cargo_toml_has_btleplug() {
    // TAUR-05: Verify Cargo.toml has btleplug dependency
    let cargo_path = Path::new("Cargo.toml");
    let content = fs::read_to_string(cargo_path).expect("Should be able to read Cargo.toml");
    
    assert!(content.contains("btleplug"), "Cargo.toml should contain btleplug dependency");
}

#[test]
fn test_taur05_cargo_toml_has_gilrs() {
    // TAUR-05: Verify Cargo.toml has gilrs dependency
    let cargo_path = Path::new("Cargo.toml");
    let content = fs::read_to_string(cargo_path).expect("Should be able to read Cargo.toml");
    
    assert!(content.contains("gilrs"), "Cargo.toml should contain gilrs dependency");
}

#[test]
fn test_taur05_cargo_toml_has_serde_with_derive() {
    // TAUR-05: Verify Cargo.toml has serde with derive feature
    let cargo_path = Path::new("Cargo.toml");
    let content = fs::read_to_string(cargo_path).expect("Should be able to read Cargo.toml");
    
    assert!(content.contains("serde"), "Cargo.toml should contain serde dependency");
    assert!(content.contains("derive"), "serde should have derive feature");
}

#[test]
fn test_taur05_cargo_toml_has_tokio_with_features() {
    // TAUR-05: Verify Cargo.toml has tokio with macros and rt-multi-thread features
    let cargo_path = Path::new("Cargo.toml");
    let content = fs::read_to_string(cargo_path).expect("Should be able to read Cargo.toml");
    
    assert!(content.contains("tokio"), "Cargo.toml should contain tokio dependency");
    assert!(content.contains("macros"), "tokio should have macros feature");
    assert!(content.contains("rt-multi-thread"), "tokio should have rt-multi-thread feature");
}
