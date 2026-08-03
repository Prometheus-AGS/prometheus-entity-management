use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::{PlatformPing, Result};

#[cfg(target_os = "android")]
const PLUGIN_IDENTIFIER: &str = "com.prometheusags.entitygraph";

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_entity_graph_tauri);

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> Result<EntityGraph<R>> {
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "EntityGraphPlugin")?;
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_entity_graph_tauri)?;
    Ok(EntityGraph(handle))
}

/// Mobile bridge registered with the Kotlin or Swift plugin.
pub struct EntityGraph<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> EntityGraph<R> {
    /// Invoke a real native command without requiring a sync server.
    pub fn ping(&self) -> Result<PlatformPing> {
        self.0.run_mobile_plugin("ping", ()).map_err(Into::into)
    }
}
