use std::{env, fs, path::PathBuf, process};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let target = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../src/generated-bindings.ts");
    let check = env::args().skip(1).any(|argument| argument == "--check");

    if !check {
        entity_graph_tauri::export_bindings(&target)?;
        println!("generated {}", target.display());
        return Ok(());
    }

    let temporary =
        env::temp_dir().join(format!("entity-graph-tauri-bindings-{}.ts", process::id()));
    entity_graph_tauri::export_bindings(&temporary)?;

    let expected = fs::read_to_string(&target)?;
    let generated = fs::read_to_string(&temporary)?;
    fs::remove_file(&temporary)?;

    if expected != generated {
        return Err(format!(
            "{} is stale; run the build:bindings script",
            target.display()
        )
        .into());
    }

    println!("bindings are current: {}", target.display());
    Ok(())
}
