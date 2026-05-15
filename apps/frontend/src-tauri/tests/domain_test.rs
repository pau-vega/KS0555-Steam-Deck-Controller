//! Integration tests for the pure domain layer — verify the module's
//! public API works end-to-end via the crate's external surface
//! (`app_lib::domain::*`). Inline `#[cfg(test)]` tests cover internal
//! invariants; this file pins down what callers can rely on.

use app_lib::domain::direction::{
    compute_combined, compute_stick_direction, compute_trigger_interval, lateral_only, Direction,
    DpadButtons, GamepadInputs, TriggerButtons, DEADZONE, TRIGGER_HEARTBEAT_MAX_MS,
    TRIGGER_HEARTBEAT_MIN_MS,
};
use app_lib::domain::invert::apply_invert;

#[test]
fn stick_inside_deadzone_returns_stop() {
    assert_eq!(compute_stick_direction(0.0, 0.0, DEADZONE), Direction::S);
    assert_eq!(compute_stick_direction(0.149, 0.0, DEADZONE), Direction::S);
}

#[test]
fn stick_up_is_forward_stick_right_is_right() {
    assert_eq!(compute_stick_direction(0.0, -1.0, DEADZONE), Direction::F);
    assert_eq!(compute_stick_direction(1.0, 0.0, DEADZONE), Direction::R);
}

#[test]
fn apply_invert_flips_only_forward_back() {
    assert_eq!(apply_invert(Direction::F, true), Direction::B);
    assert_eq!(apply_invert(Direction::B, true), Direction::F);
    assert_eq!(apply_invert(Direction::L, true), Direction::L);
    assert_eq!(apply_invert(Direction::R, true), Direction::R);
    assert_eq!(apply_invert(Direction::S, true), Direction::S);
}

#[test]
fn direction_serializes_to_single_char() {
    assert_eq!(Direction::F.as_char(), "F");
    assert_eq!(Direction::B.as_char(), "B");
    assert_eq!(Direction::S.as_char(), "S");
}

#[test]
fn lateral_only_drops_forward_and_back() {
    assert_eq!(lateral_only(Direction::F), Direction::S);
    assert_eq!(lateral_only(Direction::B), Direction::S);
    assert_eq!(lateral_only(Direction::L), Direction::L);
}

#[test]
fn combined_dpad_wins_over_trigger() {
    let inputs = GamepadInputs {
        dpad_buttons: DpadButtons {
            left: true,
            ..DpadButtons::default()
        },
        r2: 0.9,
        ..GamepadInputs::default()
    };
    assert_eq!(compute_combined(&inputs, DEADZONE), Direction::L);
}

#[test]
fn combined_trigger_fires_when_dpad_and_stick_idle() {
    let inputs = GamepadInputs {
        trigger_buttons: TriggerButtons {
            r2: true,
            ..TriggerButtons::default()
        },
        r2: 0.9,
        ..GamepadInputs::default()
    };
    assert_eq!(compute_combined(&inputs, DEADZONE), Direction::F);
}

#[test]
fn trigger_interval_min_at_full_pressure() {
    let fast =
        compute_trigger_interval(1.0, TRIGGER_HEARTBEAT_MIN_MS, TRIGGER_HEARTBEAT_MAX_MS);
    assert!(
        (TRIGGER_HEARTBEAT_MIN_MS..=TRIGGER_HEARTBEAT_MIN_MS * 2).contains(&fast),
        "fast={fast}"
    );
}

#[test]
fn trigger_interval_max_when_idle() {
    let idle =
        compute_trigger_interval(0.0, TRIGGER_HEARTBEAT_MIN_MS, TRIGGER_HEARTBEAT_MAX_MS);
    assert_eq!(idle, TRIGGER_HEARTBEAT_MAX_MS);
}
