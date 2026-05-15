//! Pure direction logic with no external-crate dependencies.

use std::fmt;

pub const DEADZONE: f32 = 0.15;
pub const TRIGGER_THRESHOLD: f32 = 0.1;
pub const TRIGGER_HEARTBEAT_MIN_MS: u64 = 30;
pub const TRIGGER_HEARTBEAT_MAX_MS: u64 = 400;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Direction {
    F,
    B,
    L,
    R,
    S,
}

impl Direction {
    pub fn as_char(&self) -> &'static str {
        match self {
            Direction::F => "F",
            Direction::B => "B",
            Direction::L => "L",
            Direction::R => "R",
            Direction::S => "S",
        }
    }

    pub fn from_char(s: &str) -> Option<Direction> {
        match s {
            "F" => Some(Direction::F),
            "B" => Some(Direction::B),
            "L" => Some(Direction::L),
            "R" => Some(Direction::R),
            "S" => Some(Direction::S),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Command {
    Drive { dir: Direction, pwm: u8 },
    Stop,
}

impl fmt::Display for Command {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Command::Drive { dir, pwm } => writeln!(f, "{}{}", dir.as_char(), pwm),
            Command::Stop => writeln!(f, "S"),
        }
    }
}

const BUCKETS: [u8; 10] = [80, 100, 119, 138, 158, 177, 196, 216, 235, 255];

/// Quantize an analog pressure value in `[0.0, 1.0]` to one of ten PWM buckets.
///
/// Returns `None` when `pressure <= TRIGGER_THRESHOLD` (0.1), i.e. below the deadzone.
/// Returns `Some(pwm)` from `BUCKETS` for `0.1 < pressure <= 1.0`. NaN, negative, and
/// values above `1.0` are clamped: NaN/negatives collapse to `0.0` (→ `None`); inputs
/// above `1.0` clamp to `1.0` (→ `Some(255)`). Monotonic non-decreasing across the
/// returned `Some` range.
pub fn quantize_pressure(pressure: f32) -> Option<u8> {
    // NOTE: deliberately NOT `pressure.clamp(0.0, 1.0)` — `f32::clamp` returns NaN when
    // its input is NaN, which would defeat the NaN→None contract (T-20-01 in the threat
    // register for Plan 20-01). `max(0.0)` then `min(1.0)` collapses NaN to `0.0` first.
    #[allow(clippy::manual_clamp)]
    let p = pressure.max(0.0).min(1.0);
    if p <= TRIGGER_THRESHOLD {
        return None;
    }
    let idx = (((p - TRIGGER_THRESHOLD) / 0.09).ceil() as i32 - 1).clamp(0, 9) as usize;
    Some(BUCKETS[idx])
}

#[derive(Debug, Clone, Copy, Default)]
pub struct DpadButtons {
    pub up: bool,
    pub down: bool,
    pub left: bool,
    pub right: bool,
}

#[derive(Debug, Clone, Copy, Default)]
pub struct TriggerButtons {
    pub r1: bool,
    pub r2: bool,
    pub l1: bool,
    pub l2: bool,
}

#[derive(Debug, Clone, Copy, Default)]
pub struct GamepadInputs {
    pub stick_x: f32,
    pub stick_y: f32,
    pub dpad_x: f32,
    pub dpad_y: f32,
    pub r2: f32,
    pub l2: f32,
    pub dpad_buttons: DpadButtons,
    pub trigger_buttons: TriggerButtons,
}

pub fn compute_stick_direction(x: f32, y: f32, deadzone: f32) -> Direction {
    let abs_x = x.abs();
    let abs_y = y.abs();

    if abs_x < deadzone && abs_y < deadzone {
        return Direction::S;
    }

    if abs_y > abs_x {
        if y < 0.0 {
            Direction::F
        } else {
            Direction::B
        }
    } else if x < 0.0 {
        Direction::L
    } else {
        Direction::R
    }
}

pub fn lateral_only(d: Direction) -> Direction {
    match d {
        Direction::L | Direction::R => d,
        _ => Direction::S,
    }
}

pub fn is_dpad_active(inputs: &GamepadInputs, deadzone: f32) -> bool {
    inputs.dpad_buttons.left || inputs.dpad_buttons.right || inputs.dpad_x.abs() > deadzone
}

pub fn is_stick_active(inputs: &GamepadInputs, deadzone: f32) -> bool {
    inputs.stick_x.abs() > deadzone
}

fn compute_dpad_or_stick(inputs: &GamepadInputs, deadzone: f32) -> Direction {
    let dpad_button_x = if inputs.dpad_buttons.right {
        1.0
    } else if inputs.dpad_buttons.left {
        -1.0
    } else {
        0.0
    };
    let dpad_button_y = if inputs.dpad_buttons.down {
        1.0
    } else if inputs.dpad_buttons.up {
        -1.0
    } else {
        0.0
    };

    let eff_x = if inputs.dpad_x.abs() > deadzone {
        inputs.dpad_x
    } else {
        dpad_button_x
    };
    let eff_y = if inputs.dpad_y.abs() > deadzone {
        inputs.dpad_y
    } else {
        dpad_button_y
    };

    let dpad_active = eff_x.abs() > deadzone
        || eff_y.abs() > deadzone
        || inputs.dpad_buttons.up
        || inputs.dpad_buttons.down
        || inputs.dpad_buttons.left
        || inputs.dpad_buttons.right;

    if dpad_active {
        lateral_only(compute_stick_direction(eff_x, eff_y, deadzone))
    } else {
        lateral_only(compute_stick_direction(inputs.stick_x, inputs.stick_y, deadzone))
    }
}

pub fn compute_trigger(inputs: &GamepadInputs, threshold: f32) -> (Direction, f32, f32) {
    let r2_pressure = if inputs.r2 > threshold {
        inputs.r2 - threshold
    } else {
        0.0
    };
    let l2_pressure = if inputs.l2 > threshold {
        inputs.l2 - threshold
    } else {
        0.0
    };

    let (r2_eff, l2_eff) = if r2_pressure == 0.0 && l2_pressure == 0.0 {
        let r2_btn = inputs.trigger_buttons.r2 || inputs.trigger_buttons.r1;
        let l2_btn = inputs.trigger_buttons.l2 || inputs.trigger_buttons.l1;
        if r2_btn || l2_btn {
            (
                if r2_btn { 1.0 } else { 0.0 },
                if l2_btn { 1.0 } else { 0.0 },
            )
        } else {
            (0.0, 0.0)
        }
    } else {
        (r2_pressure, l2_pressure)
    };

    let direction = if r2_eff > 0.0 && r2_eff >= l2_eff {
        Direction::F
    } else if l2_eff > 0.0 {
        Direction::B
    } else {
        Direction::S
    };

    (direction, r2_eff, l2_eff)
}

pub fn compute_combined(inputs: &GamepadInputs, deadzone: f32) -> Direction {
    if is_dpad_active(inputs, deadzone) || is_stick_active(inputs, deadzone) {
        compute_dpad_or_stick(inputs, deadzone)
    } else {
        compute_trigger(inputs, TRIGGER_THRESHOLD).0
    }
}

pub fn compute_trigger_interval(pressure: f32, min_ms: u64, max_ms: u64) -> u64 {
    if pressure <= 0.0 {
        return max_ms;
    }
    let t = pressure.min(0.9) / 0.9;
    let interval = min_ms as f32 + (1.0 - t) * (max_ms - min_ms) as f32;
    interval as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deadzone_returns_stop() {
        assert_eq!(compute_stick_direction(0.0, 0.0, DEADZONE), Direction::S);
        assert_eq!(compute_stick_direction(0.1, 0.1, DEADZONE), Direction::S);
        assert_eq!(compute_stick_direction(-0.14, 0.14, DEADZONE), Direction::S);
    }

    #[test]
    fn up_is_forward() {
        assert_eq!(compute_stick_direction(0.0, -1.0, DEADZONE), Direction::F);
        assert_eq!(compute_stick_direction(-0.3, -0.8, DEADZONE), Direction::F);
    }

    #[test]
    fn down_is_backward() {
        assert_eq!(compute_stick_direction(0.0, 1.0, DEADZONE), Direction::B);
        assert_eq!(compute_stick_direction(0.3, 0.8, DEADZONE), Direction::B);
    }

    #[test]
    fn left_is_left() {
        assert_eq!(compute_stick_direction(-1.0, 0.0, DEADZONE), Direction::L);
        assert_eq!(compute_stick_direction(-1.0, 0.2, DEADZONE), Direction::L);
    }

    #[test]
    fn right_is_right() {
        assert_eq!(compute_stick_direction(1.0, 0.0, DEADZONE), Direction::R);
        assert_eq!(compute_stick_direction(1.0, -0.2, DEADZONE), Direction::R);
    }

    #[test]
    fn deadzone_edge_cases() {
        assert_eq!(compute_stick_direction(0.149, 0.0, DEADZONE), Direction::S);
        assert_eq!(compute_stick_direction(0.0, -0.149, DEADZONE), Direction::S);
    }

    #[test]
    fn strong_x_overrides_weak_y() {
        assert_eq!(compute_stick_direction(0.8, 0.1, DEADZONE), Direction::R);
        assert_eq!(compute_stick_direction(-0.8, -0.1, DEADZONE), Direction::L);
    }

    #[test]
    fn strong_y_overrides_weak_x() {
        assert_eq!(compute_stick_direction(0.1, -0.8, DEADZONE), Direction::F);
        assert_eq!(compute_stick_direction(-0.1, 0.8, DEADZONE), Direction::B);
    }

    #[test]
    fn lateral_only_keeps_l_r() {
        assert_eq!(lateral_only(Direction::L), Direction::L);
        assert_eq!(lateral_only(Direction::R), Direction::R);
        assert_eq!(lateral_only(Direction::F), Direction::S);
        assert_eq!(lateral_only(Direction::B), Direction::S);
        assert_eq!(lateral_only(Direction::S), Direction::S);
    }

    #[test]
    fn direction_char_roundtrip() {
        for d in [Direction::F, Direction::B, Direction::L, Direction::R, Direction::S] {
            assert_eq!(Direction::from_char(d.as_char()), Some(d));
        }
        assert_eq!(Direction::from_char("X"), None);
    }

    #[test]
    fn trigger_interval_clamps() {
        assert_eq!(compute_trigger_interval(0.0, 30, 400), 400);
        assert_eq!(compute_trigger_interval(-0.5, 30, 400), 400);
        let fast = compute_trigger_interval(1.0, 30, 400);
        assert!((30..=60).contains(&fast), "fast={fast}");
    }

    #[test]
    fn combined_prefers_dpad_buttons_over_triggers() {
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
    fn combined_falls_back_to_trigger_when_no_dpad_or_stick() {
        let r2_only = GamepadInputs {
            r2: 0.9,
            ..GamepadInputs::default()
        };
        assert_eq!(compute_combined(&r2_only, DEADZONE), Direction::F);

        let l2_only = GamepadInputs {
            l2: 0.9,
            ..GamepadInputs::default()
        };
        assert_eq!(compute_combined(&l2_only, DEADZONE), Direction::B);
    }

    #[test]
    fn combined_lateral_only_filters_forward_back() {
        let stick_forward = GamepadInputs {
            stick_y: -1.0,
            ..GamepadInputs::default()
        };
        assert_eq!(compute_combined(&stick_forward, DEADZONE), Direction::S);

        let stick_right = GamepadInputs {
            stick_x: 1.0,
            ..GamepadInputs::default()
        };
        assert_eq!(compute_combined(&stick_right, DEADZONE), Direction::R);
    }

    // ---- Command::Display tests (REQ-SPD-01) ----

    #[test]
    fn command_display_forward_138() {
        let cmd = Command::Drive {
            dir: Direction::F,
            pwm: 138,
        };
        assert_eq!(format!("{}", cmd), "F138\n");
    }

    #[test]
    fn command_display_all_directions_minimum_pwm() {
        let cases = [
            (Direction::F, "F80\n"),
            (Direction::B, "B80\n"),
            (Direction::L, "L80\n"),
            (Direction::R, "R80\n"),
        ];
        for (dir, expected) in cases {
            let cmd = Command::Drive { dir, pwm: 80 };
            assert_eq!(format!("{}", cmd), expected);
        }
    }

    #[test]
    fn command_display_all_directions_max_pwm() {
        let cases = [
            (Direction::F, "F255\n"),
            (Direction::B, "B255\n"),
            (Direction::L, "L255\n"),
            (Direction::R, "R255\n"),
        ];
        for (dir, expected) in cases {
            let cmd = Command::Drive { dir, pwm: 255 };
            assert_eq!(format!("{}", cmd), expected);
        }
    }

    #[test]
    fn command_display_stop() {
        assert_eq!(format!("{}", Command::Stop), "S\n");
    }

    // ---- quantize_pressure tests (REQ-SPD-02) ----

    #[test]
    fn quantize_pressure_below_deadzone_returns_none() {
        assert_eq!(quantize_pressure(0.0), None);
        assert_eq!(quantize_pressure(0.05), None);
        assert_eq!(quantize_pressure(0.1), None);
    }

    #[test]
    fn quantize_pressure_just_above_deadzone_returns_first_bucket() {
        assert_eq!(quantize_pressure(0.10001), Some(80));
        assert_eq!(quantize_pressure(0.15), Some(80));
        assert_eq!(quantize_pressure(0.19), Some(80));
    }

    #[test]
    fn quantize_pressure_full_press_returns_max() {
        assert_eq!(quantize_pressure(1.0), Some(255));
        assert_eq!(quantize_pressure(0.92), Some(255));
    }

    #[test]
    fn quantize_pressure_all_ten_buckets_produced() {
        // NOTE: Plan 20-01 test 8 originally specified inputs
        // [0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.92, 1.0]; but with the
        // bucket layout (0.1, 0.19], (0.19, 0.28], … (0.91, 1.0] and the
        // ceil-then-minus-1 index formula in `quantize_pressure`, 0.55 lands in the
        // 158 bucket (k=4) and 0.65 jumps to 196 (k=6), skipping 177 (k=5), with 0.92
        // and 1.0 both landing in the 255 bucket. Using midpoint-style inputs per
        // bucket reproduces all ten declared values exactly. (Rule 1 deviation —
        // logged in 20-01-SUMMARY.md.)
        let inputs = [0.15f32, 0.25, 0.35, 0.45, 0.50, 0.60, 0.70, 0.80, 0.90, 1.0];
        let produced: Vec<u8> = inputs
            .iter()
            .map(|p| quantize_pressure(*p).expect("inputs are above deadzone"))
            .collect();
        assert_eq!(produced, vec![80, 100, 119, 138, 158, 177, 196, 216, 235, 255]);
    }

    #[test]
    fn quantize_pressure_monotonic() {
        let mut last: Option<u8> = None;
        for i in 11..=100 {
            let p = i as f32 / 100.0;
            match quantize_pressure(p) {
                None => continue,
                Some(v) => {
                    if let Some(prev) = last {
                        assert!(
                            v >= prev,
                            "non-monotonic at p={p}: {v} < previous {prev}"
                        );
                    }
                    last = Some(v);
                }
            }
        }
    }

    #[test]
    fn quantize_pressure_clamps_above_one() {
        assert_eq!(quantize_pressure(1.5), Some(255));
        assert_eq!(quantize_pressure(2.0), Some(255));
        assert_eq!(quantize_pressure(f32::INFINITY), Some(255));
    }

    #[test]
    fn quantize_pressure_handles_invalid_inputs() {
        assert_eq!(quantize_pressure(-0.5), None);
        assert_eq!(quantize_pressure(f32::NEG_INFINITY), None);
        assert_eq!(quantize_pressure(f32::NAN), None);
    }
}
