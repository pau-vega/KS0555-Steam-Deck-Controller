//! Pure direction logic with no external-crate dependencies.

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
}
