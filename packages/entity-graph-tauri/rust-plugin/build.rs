const COMMANDS: &[&str] = &[
    "graph_upsert_entity",
    "graph_remove_entity",
    "graph_patch_entity",
    "graph_set_list",
    "graph_get_entity",
    "graph_get_list",
    "graph_platform_ping",
    "graph_persist_snapshot",
    "graph_restore_snapshot",
    "graph_clear",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
