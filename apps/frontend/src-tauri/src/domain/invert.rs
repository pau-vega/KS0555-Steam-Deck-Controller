//! Direction inversion (forward↔backward).

use super::direction::Direction;
use std::sync::atomic::AtomicBool;

pub static INVERTED: AtomicBool = AtomicBool::new(false);

pub fn apply_invert(d: Direction, inverted: bool) -> Direction {
    if !inverted {
        return d;
    }
    match d {
        Direction::F => Direction::B,
        Direction::B => Direction::F,
        Direction::L | Direction::R | Direction::S => d,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::Ordering;

    #[test]
    fn inverted_defaults_false() {
        // INVERTED is process-global; ensure default is false in isolation.
        INVERTED.store(false, Ordering::Relaxed);
        assert!(!INVERTED.load(Ordering::Relaxed));
    }

    #[test]
    fn fetch_xor_toggles() {
        INVERTED.store(false, Ordering::Relaxed);
        let new_val = INVERTED.fetch_xor(true, Ordering::SeqCst) ^ true;
        assert!(new_val);
        let new_val2 = INVERTED.fetch_xor(true, Ordering::SeqCst) ^ true;
        assert!(!new_val2);
    }

    #[test]
    fn apply_invert_flips_forward_backward() {
        assert_eq!(apply_invert(Direction::F, true), Direction::B);
        assert_eq!(apply_invert(Direction::B, true), Direction::F);
    }

    #[test]
    fn apply_invert_preserves_lateral_and_stop() {
        assert_eq!(apply_invert(Direction::L, true), Direction::L);
        assert_eq!(apply_invert(Direction::R, true), Direction::R);
        assert_eq!(apply_invert(Direction::S, true), Direction::S);
    }

    #[test]
    fn apply_invert_disabled_is_identity() {
        for d in [Direction::F, Direction::B, Direction::L, Direction::R, Direction::S] {
            assert_eq!(apply_invert(d, false), d);
        }
    }
}
