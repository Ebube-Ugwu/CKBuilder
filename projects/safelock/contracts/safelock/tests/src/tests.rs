use ckb_testtool::ckb_types::{bytes::Bytes, core::TransactionBuilder, packed::*, prelude::*};
use ckb_testtool::context::Context;

// Include your tests here
// See https://github.com/xxuejie/ckb-native-build-sample/blob/main/tests/src/tests.rs for more examples

// generated unit test for contract safelock
#[test]
fn test_safelock() {
    // deploy contract
    let mut context = Context::default();
    let out_point = context.deploy_cell_by_name("safelock");

    // prepare scripts
    let lock_script = context
        .build_script(&out_point, Bytes::from(vec![42]))
        .expect("script");

    // prepare cells
    let input_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000)
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );
    let input = CellInput::new_builder()
        .previous_output(input_out_point)
        .build();
    let outputs = vec![
        CellOutput::new_builder()
            .capacity(500)
            .lock(lock_script.clone())
            .build(),
        CellOutput::new_builder()
            .capacity(500)
            .lock(lock_script)
            .build(),
    ];

    let outputs_data = vec![Bytes::new(); 2];

    // build transaction
    let tx = TransactionBuilder::default()
        .input(input)
        .outputs(outputs)
        .outputs_data(outputs_data.pack())
        .build();
    let tx = context.complete_tx(tx);

    // run
    let cycles = context
        .verify_tx(&tx, 10_000_000)
        .expect("pass verification");
    println!("consume cycles: {}", cycles);
}

// generated unit test for contract lock
#[test]
fn test_lock() {
    // deploy contract
    let mut context = Context::default();
    let out_point = context.deploy_cell_by_name("lock");

    // prepare scripts
    let lock_script = context
        .build_script(&out_point, Bytes::from(vec![42]))
        .expect("script");

    // prepare cells
    let input_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000)
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );
    let input = CellInput::new_builder()
        .previous_output(input_out_point)
        .build();
    let outputs = vec![
        CellOutput::new_builder()
            .capacity(500)
            .lock(lock_script.clone())
            .build(),
        CellOutput::new_builder()
            .capacity(500)
            .lock(lock_script)
            .build(),
    ];

    let outputs_data = vec![Bytes::new(); 2];

    // build transaction
    let tx = TransactionBuilder::default()
        .input(input)
        .outputs(outputs)
        .outputs_data(outputs_data.pack())
        .build();
    let tx = context.complete_tx(tx);

    // run
    let cycles = context
        .verify_tx(&tx, 10_000_000)
        .expect("pass verification");
    println!("consume cycles: {}", cycles);
}

// ---------------------------------------------------------------------------
//  time-lock contract tests
// ---------------------------------------------------------------------------
//
// The time-lock contract enforces that a cell cannot be spent until a
// specific Unix timestamp (seconds).  The unlock timestamp is stored in
// the script args (8 bytes, big-endian u64).  When spending, every input
// in the script group must carry a `since` field that encodes an absolute
// timestamp >= the unlock time.
//
// Since format for absolute timestamp:
//   bit 63 = 0  (absolute, not relative)
//   bit 62 = 0  (not epoch)
//   bit 60 = 1  (timestamp metric)
//   bits 59-0 = timestamp in seconds
//
//   since = (1 << 60) | timestamp_seconds

const SINCE_TIMESTAMP_FLAG: u64 = 1 << 60;

/// Helper: build a tx that spends a cell locked with the time-lock contract.
fn time_lock_tx(unlock_time: u64, since_value: u64) -> Result<(TransactionView, Context), String> {
    let mut context = Context::default();
    let out_point = context.deploy_cell_by_name("time-lock");

    let time_args = Bytes::from(unlock_time.to_be_bytes().to_vec());
    let lock_script = context
        .build_script(&out_point, time_args)
        .map_err(|e| format!("build_script: {e}"))?;

    let input_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000)
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );

    let input = CellInput::new_builder()
        .previous_output(input_out_point)
        .since(since_value)
        .build();

    let output = CellOutput::new_builder()
        .capacity(500)
        .lock(lock_script)
        .build();

    let tx = TransactionBuilder::default()
        .input(input)
        .output(output)
        .outputs_data(vec![Bytes::new()].pack())
        .build();
    let tx = context.complete_tx(tx);

    Ok((tx, context))
}

#[test]
fn test_time_lock_before_unlock() {
    // unlock_time = 5000, but since encodes only 3000 → should fail
    let (tx, context) = time_lock_tx(5000, SINCE_TIMESTAMP_FLAG | 3000).unwrap();
    let result = context.verify_tx(&tx, 10_000_000);
    assert!(result.is_err(), "expected failure when since < unlock_time");
}

#[test]
fn test_time_lock_at_unlock() {
    // unlock_time = 5000, since encodes exactly 5000 → should pass
    let (tx, context) = time_lock_tx(5000, SINCE_TIMESTAMP_FLAG | 5000).unwrap();
    let cycles = context
        .verify_tx(&tx, 10_000_000)
        .expect("pass verification when since == unlock_time");
    println!("time-lock consume cycles: {cycles}");
}

#[test]
fn test_time_lock_after_unlock() {
    // unlock_time = 5000, since encodes 8000 → should pass
    let (tx, context) = time_lock_tx(5000, SINCE_TIMESTAMP_FLAG | 8000).unwrap();
    let cycles = context
        .verify_tx(&tx, 10_000_000)
        .expect("pass verification when since > unlock_time");
    println!("time-lock consume cycles: {cycles}");
}

#[test]
fn test_time_lock_no_since() {
    // since = 0 (meaning no time lock) → should fail
    let (tx, context) = time_lock_tx(5000, 0).unwrap();
    let result = context.verify_tx(&tx, 10_000_000);
    assert!(result.is_err(), "expected failure when since == 0");
}

#[test]
fn test_time_lock_bad_args_length() {
    // wrong-length args should be rejected before any since check
    let mut context = Context::default();
    let out_point = context.deploy_cell_by_name("time-lock");

    // args has 4 bytes instead of the required 8
    let lock_script = context
        .build_script(&out_point, Bytes::from(vec![0, 0, 0, 0]))
        .expect("script");

    let input_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000)
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );

    let input = CellInput::new_builder()
        .previous_output(input_out_point)
        .since(SINCE_TIMESTAMP_FLAG | 9999)
        .build();

    let output = CellOutput::new_builder()
        .capacity(500)
        .lock(lock_script)
        .build();

    let tx = TransactionBuilder::default()
        .input(input)
        .output(output)
        .outputs_data(vec![Bytes::new()].pack())
        .build();
    let tx = context.complete_tx(tx);

    let result = context.verify_tx(&tx, 10_000_000);
    assert!(
        result.is_err(),
        "expected failure when args length != 8"
    );
}
