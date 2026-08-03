#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(entity_graph_tauri::init())
        .run(tauri::generate_context!())
        .expect("entity graph Tauri host should run");
}

#[cfg(test)]
mod tests {
    use entity_graph_tauri::PlatformPing;
    use tauri::{
        ipc::{CallbackFn, InvokeBody},
        test::{get_ipc_response, mock_builder, INVOKE_KEY},
        webview::InvokeRequest,
        WebviewWindowBuilder,
    };

    const PLATFORM_PING_COMMAND: &str = "plugin:entity-graph-tauri|graph_platform_ping";

    fn request(command: &str) -> InvokeRequest {
        InvokeRequest {
            cmd: command.into(),
            callback: CallbackFn(0),
            error: CallbackFn(1),
            url: "tauri://localhost".parse().expect("valid local URL"),
            body: InvokeBody::default(),
            headers: Default::default(),
            invoke_key: INVOKE_KEY.to_owned(),
        }
    }

    fn host() -> tauri::App<tauri::test::MockRuntime> {
        mock_builder()
            .plugin(entity_graph_tauri::init())
            .build(tauri::generate_context!(test = true))
            .expect("mock Tauri host should build")
    }

    #[test]
    fn registered_desktop_host_invokes_the_real_platform_command() {
        let app = host();
        let webview = WebviewWindowBuilder::new(&app, "allowed", Default::default())
            .build()
            .expect("allowed mock webview should build");

        let response = get_ipc_response(&webview, request(PLATFORM_PING_COMMAND))
            .expect("registered plugin command should be callable")
            .deserialize::<PlatformPing>()
            .expect("platform ping should deserialize");

        assert_eq!(response.plugin, "entity-graph-tauri");
        assert_eq!(response.platform, "desktop");
    }

    #[test]
    fn host_without_the_capability_denies_platform_ping() {
        let app = host();
        let webview = WebviewWindowBuilder::new(&app, "denied", Default::default())
            .build()
            .expect("denied mock webview should build");

        let error = get_ipc_response(&webview, request(PLATFORM_PING_COMMAND))
            .expect_err("a webview without the plugin capability must be denied");

        let message = error.to_string();
        assert!(
            message.contains("not allowed") || message.contains("denied"),
            "denial should identify the missing authorization: {message}"
        );
    }
}
