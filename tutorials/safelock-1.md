# Make a SafeLock on the Common Knowledge Blockchain

A SafeLock is a time-lock smart contract that lets users lock CKB in a cell and prevent anyone from spending it until a specified Unix timestamp. The contract enforces this by validating the `since` field on every input cell in the script group — if the since value doesn't encode an absolute timestamp greater-than-or-equal to the lock time, the contract rejects the transaction.

## Prerequisites

Before starting, make sure you have:

- Basic understanding of CKB fundamentals: cells, lock scripts, type scripts, and the `since` field.
- Basic knowledge of Rust.
- Rust toolchain installed (`rustup` + `cargo`).
- The `riscv64imac-unknown-none-elf` target added:
  ```sh
  rustup target add riscv64imac-unknown-none-elf
  ```
- Clang >= 18 on your `PATH` (the build scripts use it for C dependencies).
- [cargo-generate](https://github.com/cargo-generate/cargo-generate) installed:
  ```sh
  cargo install cargo-generate
  ```
- [offckb](https://www.npmjs.com/package/@offckb/cli) installed for deployment:
  ```sh
  npm install -g @offckb/cli
  ```

## Overview

Here is what we'll do:

1. Scaffold the project using `ckb-script-templates` via `cargo-generate`.
2. Generate the `time-lock` contract crate inside the workspace.
3. Write the contract logic in Rust (entry point, args parsing, since validation).
4. Test the contract with `ckb-testtool`.
5. Deploy to devnet, then testnet, using `offckb`.

## Setup

### Step 1: Bootstrap the workspace

```sh
cargo generate --git https://github.com/cryptape/ckb-script-templates \
  --destination ./safelock
```

This scaffolds a CKB contract workspace with the following structure:

| Path | Purpose |
|---|---|
| `Cargo.toml` | Workspace manifest — lists all crates (contracts + tests) |
| `contracts/` | Each sub-directory is a separate contract crate |
| `tests/` | Integration tests using `ckb-testtool` |
| `scripts/` | Helper scripts (e.g. `find_clang` for the build) |
| `Makefile` | Build orchestration — `make build`, `make test`, `make generate`, etc. |

### Step 2: Generate the time-lock contract

```sh
cd safelock
make generate CRATE=time-lock
```

This runs `cargo generate` with the `contract` template, names the new crate `time-lock`, and places it under `contracts/time-lock/`. The Makefile also automatically adds the crate to the workspace `Cargo.toml` and appends any scaffolded test boilerplate to `tests/src/tests.rs`.

Each contract crate contains:

| File | Purpose |
|---|---|
| `Cargo.toml` | Contract dependencies (usually just `ckb-std`) |
| `src/main.rs` | Contract entry point and business logic |
| `src/lib.rs` | Re-exports the entry point under the `library` feature for native testing |

### Step 3: Understand the template boilerplate

Open `contracts/time-lock/src/main.rs`. The template gives us:

```rust
#![cfg_attr(not(any(feature = "library", test)), no_std)]
#![cfg_attr(not(test), no_main)]

#[cfg(any(feature = "library", test))]
extern crate alloc;

#[cfg(not(any(feature = "library", test)))]
ckb_std::entry!(program_entry);
#[cfg(not(any(feature = "library", test)))]
ckb_std::default_alloc!(16384, 1258306, 64);

pub fn program_entry() -> i8 {
    match verify() {
        Ok(()) => 0,
        Err(e) => e,
    }
}
```

Key points:

- `no_std` / `no_main` — CKB contracts run in a RISC-V environment without the standard library or a regular `main`. The `library` and `test` features are exceptions that let us compile the contract as a shared library for native testing.
- `ckb_std::entry!(program_entry)` — Declares `program_entry` as the contract entry point. When the CKB VM loads this binary, it calls this function.
- `ckb_std::default_alloc!(16384, 1258306, 64)` — Sets up a fixed-size memory allocator. The arguments are: max stack usage (16 KB), max heap (1.2 MB), and frame size (64 bytes). These are conservative defaults.
- `program_entry` returns `0` on success or an error code (`i8`) on failure. Any non-zero return causes the CKB VM to reject the transaction.

## Writing the Time-Lock Contract

### Step 4: Understand the since field

CKB's `since` field on `CellInput` lets contracts enforce time constraints. We care about **absolute timestamps** (Unix seconds). The encoding is:

```
bit 63 = 0   // absolute (not relative)
bit 62 = 0   // not epoch-based
bit 61 = 0   // reserved
bit 60 = 1   // metric = timestamp
bits 59-0    // timestamp value in seconds
```

So a since value locking until Unix timestamp `1700000000` is:

```
since = (1 << 60) | 1700000000
```

### Step 5: Write the contract logic

Let's build the contract step by step. Replace the entire `main.rs` with the full contract below, then we'll break down each piece.

```rust
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
```

This is the boilerplate we already saw — the entry point delegates to `verify()`.

Now let's write `verify()`:

```rust
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
```

This is the core logic. Let's explain each part:

- `load_script()` — Loads the current script being executed (our time-lock contract). The script carries `args` which we use to pass the unlock timestamp.
- `args.len() != 8` — The unlock time is a `u64` encoded as 8 big-endian bytes. If the args aren't exactly 8 bytes, we reject immediately with error code `1`.
- `u64::from_be_bytes(buf)` — Parse the 8-byte args into a `u64` — this is our `unlock_time` in Unix seconds.
- `QueryIter::new(load_input_since, Source::GroupInput)` — Iterates over every input cell in the current script group. Each input carries a `since` field that we must validate.
- `since == 0` — A since of 0 means "no time lock", which we explicitly forbid. Error code `2`.
- `since_is_absolute_timestamp(since)` — Checks that the since encodes an absolute timestamp metric (not relative, not epoch).
- `since_timestamp_value(since) < unlock_time` — The actual enforcement: the input's timestamp must be >= the unlock time. If it's earlier, error code `4`.
- `input_count == 0` — If there are no inputs in the group, the contract has nothing to validate. We reject this as an error (`5`) because a time-locked cell should always have inputs spending it.

Now the helper functions:

```rust
fn since_is_absolute_timestamp(since: u64) -> bool {
    since & (1 << 63) == 0
        && since & (1 << 62) == 0
        && since & (1 << 61) == 0
        && since & (1 << 60) != 0
}

fn since_timestamp_value(since: u64) -> u64 {
    since & ((1 << 60) - 1)
}
```

- `since_is_absolute_timestamp` — Checks bits 63, 62, and 61 are 0 (absolute, not relative, not epoch), and bit 60 is 1 (timestamp metric). If all four conditions hold, the since encodes an absolute timestamp.
- `since_timestamp_value` — Masks out the lower 60 bits to extract the timestamp value.

### Step 6: The final contract

Here's the complete `contracts/time-lock/src/main.rs`:

```rust
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
```

### Step 7: Build the contract

```sh
make build
```

This compiles the contract for the `riscv64imac-unknown-none-elf` target and places the RISC-V binary at `build/release/time-lock`. A `.debug` file is also produced with ELF debug symbols.

### Step 8: Test with ckb-testtool

The workspace already has a `tests/` crate that uses `ckb-testtool`. Let's write tests for the time-lock contract.

Open `tests/src/tests.rs` and add:

```rust
use ckb_testtool::ckb_types::{bytes::Bytes, core::TransactionBuilder, packed::*, prelude::*};
use ckb_testtool::context::Context;

const SINCE_TIMESTAMP_FLAG: u64 = 1 << 60;

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
```

The helper `time_lock_tx` does the following:

- Creates a fresh `Context` — an in-memory CKB environment that simulates the node.
- Calls `context.deploy_cell_by_name("time-lock")` — this loads the compiled binary from `build/release/time-lock` and deploys it as a cell, returning an `OutPoint` that points to the deployed code cell.
- Builds a lock script using the deployed contract, passing the `unlock_time` as script args (8 bytes, big-endian).
- Creates an input cell with the time-lock lock script and the given `since_value`.
- Builds a transaction that spends this input and produces an output, then completes it via `context.complete_tx(tx)` (which fills in header deps, etc.).

Now the actual test cases:

```rust
#[test]
fn test_time_lock_before_unlock() {
    let (tx, context) = time_lock_tx(5000, SINCE_TIMESTAMP_FLAG | 3000).unwrap();
    let result = context.verify_tx(&tx, 10_000_000);
    assert!(result.is_err(), "expected failure when since < unlock_time");
}

#[test]
fn test_time_lock_at_unlock() {
    let (tx, context) = time_lock_tx(5000, SINCE_TIMESTAMP_FLAG | 5000).unwrap();
    let cycles = context
        .verify_tx(&tx, 10_000_000)
        .expect("pass verification when since == unlock_time");
    println!("time-lock consume cycles: {cycles}");
}

#[test]
fn test_time_lock_after_unlock() {
    let (tx, context) = time_lock_tx(5000, SINCE_TIMESTAMP_FLAG | 8000).unwrap();
    let cycles = context
        .verify_tx(&tx, 10_000_000)
        .expect("pass verification when since > unlock_time");
    println!("time-lock consume cycles: {cycles}");
}

#[test]
fn test_time_lock_no_since() {
    let (tx, context) = time_lock_tx(5000, 0).unwrap();
    let result = context.verify_tx(&tx, 10_000_000);
    assert!(result.is_err(), "expected failure when since == 0");
}

#[test]
fn test_time_lock_bad_args_length() {
    let mut context = Context::default();
    let out_point = context.deploy_cell_by_name("time-lock");

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
```

Run the tests:

```sh
make test
```

Or with output visible:

```sh
cargo test -- --nocapture
```

You should see output like:

```
test test_time_lock_before_unlock ... ok
test test_time_lock_at_unlock ... ok
test test_time_lock_after_unlock ... ok
test test_time_lock_no_since ... ok
test test_time_lock_bad_args_length ... ok
```

Each test exercises a different error path in the contract:
- `before_unlock` — Asserts error code 4 (since < unlock_time).
- `at_unlock` — Passes because since == unlock_time.
- `after_unlock` — Passes because since > unlock_time.
- `no_since` — Asserts error code 2 (since == 0).
- `bad_args_length` — Asserts error code 1 (args not 8 bytes).

## Deployment

### Step 9: Verify with ckb-debugger

Before deploying to a real network, you can run the contract locally with `ckb-debugger`. This lets you test the RISC-V binary directly without setting up a node.

First, install `ckb-debugger`:

```sh
cargo install ckb-debugger
```

Create a transaction JSON file (e.g. `tx.json`) that describes the transaction:

```json
{
  "mock_info": {
    "inputs": [
      {
        "input": {
          "previous_output": {
            "tx_hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "index": "0"
          },
          "since": "0x1000000000001388"
        }
      }
    ],
    "cell_deps": [
      {
        "cell_dep": {
          "out_point": {
            "tx_hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "index": "0"
          },
          "dep_type": "code"
        }
      }
    ],
    "group_inputs": [
      {
        "previous_output": {
          "tx_hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
          "index": "0"
        },
        "since": "0x1000000000001388"
      }
    ]
  },
  "script": {
    "code_hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "hash_type": "data",
    "args": "0x0000000000001388"
  }
}
```

This example sets both the args and since to `0x1388` (5000 in decimal), which should pass. To run:

```sh
ckb-debugger --tx-file tx.json --bin build/release/time-lock
```

Note that `ckb-debugger` only simulates the script execution — it doesn't simulate the full CKB node consensus logic. For a more realistic test, use `ckb-testtool` as we did earlier.

### Step 10: Deploy to devnet with offckb

Start a local devnet:

```sh
offckb node
```

In another terminal, get a funded account:

```sh
offckb accounts
```

Build the contract and deploy:

```sh
make build
offckb deploy \
  --target build/release/time-lock \
  --network devnet \
  --privkey <your-devnet-privkey> \
  -o deployment
```

The `-o deployment` flag writes the deployment info (code hash, type hash, out point, cell deps) to `deployments/scripts.json`. You'll see output like:

```
Deploying build/release/time-lock...
data: codeHash: 0x76ee7120f748eaa005f9efb4b8196e0c5b795c9bc64a05d081b6c3ba5b4090b1
```

Take note of the `codeHash` — you'll need it when constructing lock scripts that reference this contract.

### Step 11: Deploy to testnet

First, fund a testnet wallet using the [Pudge faucet](https://faucet.nervos.org/). You'll need the wallet's private key.

```sh
offckb deploy \
  --target build/release/time-lock \
  --network testnet \
  --privkey <your-testnet-privkey> \
  -o deployment
```

offckb will broadcast the deployment transaction to the testnet and save the script info to `deployments/scripts.json` under the `testnet` key.

## Conclusion

Well done! You've built and deployed a time-lock smart contract on CKB. Here's a recap of what you learned:

- How to bootstrap a CKB contract workspace using `ckb-script-templates` and `cargo-generate`.
- How the `since` field works in CKB and how to validate absolute timestamps.
- How to read script args and iterate over group inputs with `ckb-std`.
- How to write integration tests with `ckb-testtool`.
- How to deploy to devnet and testnet using `offckb`.

To dive deeper, check out:

- [CKB Documentation](https://docs.nervos.org/) — The official Nervos docs covering scripting, cells, and the VM.
- [ckb-std](https://crates.io/crates/ckb-std) — The Rust standard library for CKB contract development.
- [ckb-testtool](https://crates.io/crates/ckb-testtool) — The test framework used in this tutorial.
- [Nervos Talk](https://talk.nervos.org/) — Community discussions and advanced topics.
