use clap::Parser;

/// Search for a pattern in a file and display the lines that contain it
#[derive(Parser)]
struct Cli {
    /// The pattern to look for
    pattern: String,
    /// The file path
    path: std::path::PathBuf,
}

fn main() {
    let pattern = Cli::par
    let path: String = std::env::args().nth(2).expect("no path specified");

    println!("pattern: {}\n path: {}", pattern, path);
}
