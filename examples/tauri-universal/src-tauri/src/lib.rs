#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(entity_graph_tauri::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_deep_link::init())
        .run(tauri::generate_context!())
        .expect("the Prometheus universal Tauri host should run");
}

#[cfg(test)]
mod tests {
    use serde_json::{json, Value};
    use tauri::{
        ipc::{CallbackFn, InvokeBody},
        test::{get_ipc_response, mock_builder, INVOKE_KEY},
        webview::InvokeRequest,
        WebviewWindowBuilder,
    };

    const PLATFORM_PING: &str = "plugin:entity-graph-tauri|graph_platform_ping";
    const UPSERT_ENTITY: &str = "plugin:entity-graph-tauri|graph_upsert_entity";
    const GET_ENTITY: &str = "plugin:entity-graph-tauri|graph_get_entity";
    const CLEAR_GRAPH: &str = "plugin:entity-graph-tauri|graph_clear";
    const REMOVE_ENTITY: &str = "plugin:entity-graph-tauri|graph_remove_entity";

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

    fn host() -> tauri::App<tauri::test::MockRuntime> {
        mock_builder()
            .plugin(entity_graph_tauri::init())
            .build(tauri::generate_context!(test = true))
            .expect("the universal mock host should build")
    }

    #[test]
    fn main_webview_runs_the_registered_command_round_trip() {
        let app = host();
        let webview = WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .expect("main mock webview should build");

        let ping = get_ipc_response(&webview, request(PLATFORM_PING, json!({})))
            .expect("platform ping should be authorized")
            .deserialize::<Value>()
            .expect("platform ping should deserialize");
        assert_eq!(ping["plugin"], "entity-graph-tauri");
        assert_eq!(ping["platform"], "desktop");

        get_ipc_response(
            &webview,
            request(
                UPSERT_ENTITY,
                json!({
                    "payload": {
                        "entityType": "Task",
                        "entityId": "task-native-persistence",
                        "data": { "status": "active", "title": "Certify native persistence" }
                    }
                }),
            ),
        )
        .expect("upsert should be authorized by the universal capability");

        let entity = get_ipc_response(
            &webview,
            request(
                GET_ENTITY,
                json!({
                    "entityType": "Task",
                    "entityId": "task-native-persistence"
                }),
            ),
        )
        .expect("read should be authorized by the default plugin capability")
        .deserialize::<Value>()
        .expect("entity response should deserialize");
        assert_eq!(entity["data"]["status"], "active");
        assert_eq!(entity["data"]["title"], "Certify native persistence");
    }

    #[test]
    fn main_webview_denies_the_destructive_clear_command() {
        let app = host();
        let webview = WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .expect("main mock webview should build");

        let error = get_ipc_response(&webview, request(CLEAR_GRAPH, json!({})))
            .expect_err("graph_clear must remain outside the main capability");
        let message = error.to_string();
        assert!(
            message.contains("not allowed") || message.contains("denied"),
            "denial should identify the missing authorization: {message}"
        );
    }

    #[test]
    fn main_webview_denies_the_destructive_remove_command() {
        let app = host();
        let webview = WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .expect("main mock webview should build");

        let error = get_ipc_response(
            &webview,
            request(
                REMOVE_ENTITY,
                json!({
                    "payload": {
                        "entityType": "Task",
                        "entityId": "task-denied-capability"
                    }
                }),
            ),
        )
        .expect_err("graph_remove_entity must remain outside the main capability");
        let message = error.to_string();
        assert!(
            message.contains("not allowed") || message.contains("denied"),
            "denial should identify the missing authorization: {message}"
        );
    }
}
