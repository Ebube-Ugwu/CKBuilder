# CKBuilder — AGENTS.md

## Repository structure

This is a learning portfolio for Nervos CKB. It has **three independent
sub-projects** under `projects/` — there is no shared build tooling at the root.

| Path | What | Build |
|------|------|-------|
| `projects/grrs/` | Rust CLI (learning Rust, uses `clap`) | `cargo build` |
| `projects/learn-ckb-in-45-minutes/first-script/` | CKB tutorial contract (`password-lock`) + tests | `make build`, `cargo test` |
| `projects/safelock/contracts/safelock/` | CKB contracts workspace (`lock` contract + tests) | `make build`, `cargo test` |
| `projects/safelock/client/` | React SPA (TanStack Router, Vite, Tailwind, JoyID, CCC) | `npm run dev` (port 3000) |

## CKB contract projects (both use the same pattern)

Both `first-script` and `safelock/contracts/safelock` were bootstrapped from
[ckb-script-templates](https://github.com/cryptape/ckb-script-templates) — same
Makefile, same structure.

### Prerequisites (before first build)

```sh
rustup target add riscv64imac-unknown-none-elf
# Clang ≥18 must be on PATH (scripts/find_clang locates it)
```

### Commands (run from the workspace Cargo.toml / Makefile directory)

```sh
make build          # build all contracts (RISC-V release binaries → build/release/)
make test           # alias for cargo test
cargo test -- --nocapture                    # run tests with stdout
cargo test --features native-simulator --package tests -- --test-threads=1  # native execution
```

### How contracts work

- Each contract crate has `main.rs` (entry point, `no_std`, RISC-V target) and
  `lib.rs` (re-exports `main::program_entry` under `library` feature).
- The `library` feature + `native-simulator` feature let tests run the contract
  natively as a shared library instead of on emulated RISC-V.
- Tests live in the workspace `tests/` crate, use `ckb_testtool::Context` and
  `context.deploy_cell_by_name(contract_crate_name)`.
- `make generate CRATE=my-contract` scaffolds a new contract (uses
  `cargo-generate` + `ckb-script-templates`).

### Coverage (safelock only)

```sh
rustup component add llvm-tools-preview
make coverage        # text report
make coverage-html   # HTML report at target/coverage/html/index.html
```

## safelock client

- TanStack Router file-based routing (`src/routes/`), route tree auto-generated
  to `src/routeTree.gen.ts`.
- Path aliases: `@/*` and `#/*` → `./src/*` (configured in tsconfig + vite).
- Wallet: JoyID (`@joyid/ckb`) + CCC (`@ckb-ccc/core`).
- State: Zustand (`src/store/wallet-store.tsx`).
- Styling: Tailwind CSS v4.
- Dev server: `npm run dev --port 3000` (Vite).
- Test: `npm run test` (Vitest).

## Devnet deployment (safelock)

The repo uses [offckb](https://www.npmjs.com/package/@offckb/cli) for local devnet.
From `projects/safelock/contracts/safelock/`:

```sh
# 1. Start the devnet
offckb node

# 2. Pre-funded accounts (42B CKB each)
offckb accounts

# 3. Build contracts
make build    # RISC-V binaries → build/release/

# 4. Deploy the time-lock contract
offckb deploy \
  --target build/release/time-lock \
  --network devnet \
  --privkey 0x... \
  -o deployment

# Note the codeHash from output — fill it into client/src/lib/ckb.ts TIME_LOCK.codeHash
```

The client connects via CCC at `http://localhost:28114`.

### Client setup after deploy

1. Set the `codeHash` from `offckb deploy` in `client/src/lib/ckb.ts` → `TIME_LOCK.codeHash`
2. Optionally set `DEVNET_PRIVKEY` env var in the client dev server for signing
3. Start UI: `npm run dev` (port 3000)

## Known issues

- `projects/grrs/src/main.rs` has compilation errors (unused import, mismatched
  variable names) — it is incomplete.
- `safelock/client` uses npm (has `package-lock.json`) despite pnpm fields in
  `package.json`.
