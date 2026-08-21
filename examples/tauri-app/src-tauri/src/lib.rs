//! lib.rs
//!
//! Universal Tauri host for the Prometheus entity-graph showcase: one binary
//! registers the certified entity-graph plugin, the official SQL plugin
//! (durable offline restart storage), and the official deep-link plugin
//! (`prometheus-tasks://task/<id>`), on desktop and mobile alike.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(entity_graph_tauri::init())
        .run(tauri::generate_context!())
        .expect("prometheus tauri universal app should run");
}

#[cfg(test)]
mod tests {
    use entity_graph_tauri::PlatformPing;
    use serde_json::{json, Value};
    use tauri::{
        ipc::{CallbackFn, InvokeBody},
        test::{get_ipc_response, mock_builder, INVOKE_KEY},
        webview::InvokeRequest,
        WebviewWindowBuilder,
    };

    const PING: &str = "plugin:entity-graph-tauri|graph_platform_ping";
    const UPSERT: &str = "plugin:entity-graph-tauri|graph_upsert_entity";
    const GET_ENTITY: &str = "plugin:entity-graph-tauri|graph_get_entity";
    const SET_LIST: &str = "plugin:entity-graph-tauri|graph_set_list";
    const GET_LIST: &str = "plugin:entity-graph-tauri|graph_get_list";
    const PERSIST: &str = "plugin:entity-graph-tauri|graph_persist_snapshot";
    const RESTORE: &str = "plugin:entity-graph-tauri|graph_restore_snapshot";
    const CLEAR: &str = "plugin:entity-graph-tauri|graph_clear";

    fn request(command: &str, body: Value) -> InvokeRequest {
        InvokeRequest {
            cmd: command.into(),
            callback: CallbackFn(0),
            error: CallbackFn(1),
            url: "tauri://localhost".parse().expect("valid local URL"),
            body: InvokeBody::Json(body),
            headers: Default::default(),
            invoke_key: INVOKE_KEY.to_owned(),
        }
    }

    /// Mock host wired exactly like the production builder for the
    /// entity-graph channel; SQL/deep-link registration is exercised by the
    /// compile-level desktop/mobile build lanes.
    fn host() -> tauri::App<tauri::test::MockRuntime> {
        mock_builder()
            .plugin(entity_graph_tauri::init())
            .build(tauri::generate_context!(test = true))
            .expect("mock Tauri host should build")
    }

    fn webview(app: &tauri::App<tauri::test::MockRuntime>, label: &str) -> tauri::WebviewWindow<tauri::test::MockRuntime> {
        WebviewWindowBuilder::new(app, label, Default::default())
            .build()
            .expect("mock webview should build")
    }

    fn invoke_ok(
        view: &tauri::WebviewWindow<tauri::test::MockRuntime>,
        command: &str,
        body: Value,
    ) -> tauri::ipc::InvokeResponseBody {
        get_ipc_response(view, request(command, body))
            .unwrap_or_else(|error| panic!("{command} should succeed: {error}"))
    }

    #[test]
    fn desktop_command_e2e_round_trips_entities_and_lists() {
        let app = host();
        let view = webview(&app, "main");

        let ping = invoke_ok(&view, PING, json!({}))
            .deserialize::<PlatformPing>()
            .expect("ping should deserialize");
        assert_eq!(ping.plugin, "entity-graph-tauri");
        assert_eq!(ping.platform, "desktop");

        invoke_ok(
            &view,
            UPSERT,
            json!({ "payload": {
                "entityType": "Task",
                "entityId": "task-sync",
                "data": { "title": "Sync engine cutover", "status": "in-progress" }
            }}),
        );

        let entity = invoke_ok(
            &view,
            GET_ENTITY,
            json!({ "entityType": "Task", "entityId": "task-sync" }),
        )
        .deserialize::<Value>()
        .expect("entity result should deserialize");
        assert_eq!(entity["data"]["title"], "Sync engine cutover");

        invoke_ok(
            &view,
            SET_LIST,
            json!({ "payload": {
                "queryKey": "[\"tasks\"]",
                "ids": ["task-sync"],
                "total": 1,
                "hasNextPage": false
            }}),
        );

        let list = invoke_ok(&view, GET_LIST, json!({ "queryKey": "[\"tasks\"]" }))
            .deserialize::<Value>()
            .expect("list result should deserialize");
        assert_eq!(list["ids"], json!(["task-sync"]));
        assert_eq!(list["total"], json!(1));
    }

    #[test]
    fn webview_without_the_capability_is_denied_fail_closed() {
        let app = host();
        let view = webview(&app, "denied");

        let error = get_ipc_response(&view, request(PING, json!({})))
            .expect_err("a webview without the plugin capability must be denied");

        let message = error.to_string();
        assert!(
            message.contains("not allowed") || message.contains("denied"),
            "denial should identify the missing authorization: {message}"
        );
    }

    #[test]
    fn offline_restart_persist_clear_restore_round_trip() {
        let app = host();
        let view = webview(&app, "main");

        invoke_ok(
            &view,
            UPSERT,
            json!({ "payload": {
                "entityType": "Task",
                "entityId": "task-offline",
                "data": { "title": "Offline restart proof", "status": "todo" }
            }}),
        );

        let snapshot = json!({
            "entities": { "Task": { "task-offline": { "title": "Offline restart proof", "status": "todo" } } },
            "patches": {},
            "lists": { "[\"tasks\"]": { "ids": ["task-offline"], "total": 1 } }
        })
        .to_string();

        invoke_ok(
            &view,
            PERSIST,
            json!({ "payload": { "storageKey": "restart-test", "snapshot": snapshot } }),
        );

        // Simulate process teardown: the in-memory mirror is wiped.
        invoke_ok(&view, CLEAR, json!({}));
        let cleared = invoke_ok(
            &view,
            GET_ENTITY,
            json!({ "entityType": "Task", "entityId": "task-offline" }),
        )
        .deserialize::<Value>()
        .expect("cleared entity result should deserialize");
        assert_eq!(cleared["data"], Value::Null, "clear must wipe the mirror");

        // Restart path: restore rehydrates the mirror from the snapshot store.
        let restored = invoke_ok(&view, RESTORE, json!({ "payload": { "storageKey": "restart-test" } }))
            .deserialize::<Value>()
            .expect("restore result should deserialize");
        let restored_snapshot = restored["snapshot"].as_str().expect("snapshot should exist");
        let parsed: Value = serde_json::from_str(restored_snapshot).expect("snapshot JSON");
        assert_eq!(
            parsed["entities"]["Task"]["task-offline"]["title"],
            "Offline restart proof"
        );
    }
}
