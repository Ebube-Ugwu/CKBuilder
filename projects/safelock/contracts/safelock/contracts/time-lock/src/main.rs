#![cfg_attr(not(any(feature = "library", test)), no_std)]
#![cfg_attr(not(test), no_main)]

#[cfg(any(feature = "library", test))]
extern crate alloc;

#[cfg(not(any(feature = "library", test)))]
ckb_std::entry!(program_entry);
#[cfg(not(any(feature = "library", test)))]
ckb_std::default_alloc!(16384, 1258306, 64);

use ckb_std::ckb_constants::Source;
use ckb_std::high_level::{load_input_since, load_script, QueryIter};

pub fn program_entry() -> i8 {
    match verify() {
        Ok(()) => 0,
        Err(e) => e,
    }
}

fn since_is_absolute_timestamp(since: u64) -> bool {
    since & (1 << 63) == 0
        && since & (1 << 62) == 0
        && since & (1 << 61) == 0
        && since & (1 << 60) != 0
}

fn since_timestamp_value(since: u64) -> u64 {
    since & ((1 << 60) - 1)
}

fn verify() -> Result<(), i8> {
    let script = load_script().map_err(|_| 1)?;
    let args = script.args().raw_data();

    if args.len() != 8 {
        return Err(1);
    }

    let mut buf = [0u8; 8];
    buf.copy_from_slice(&args);
    let unlock_time = u64::from_be_bytes(buf);

    let mut input_count = 0u64;
    for since in QueryIter::new(load_input_since, Source::GroupInput) {
        input_count += 1;
        if since == 0 {
            return Err(2);
        }
        if !since_is_absolute_timestamp(since) {
            return Err(3);
        }
        if since_timestamp_value(since) < unlock_time {
            return Err(4);
        }
    }

    if input_count == 0 {
        return Err(5);
    }

    Ok(())
}
