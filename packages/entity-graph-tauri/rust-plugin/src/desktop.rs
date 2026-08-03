use serde::de::DeserializeOwned;
use std::marker::PhantomData;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::{PlatformPing, Result};

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> Result<EntityGraph<R>> {
    Ok(EntityGraph(PhantomData))
}

/// Desktop-side native bridge handle.
pub struct EntityGraph<R: Runtime>(PhantomData<fn() -> R>);

impl<R: Runtime> EntityGraph<R> {
    /// A host-level smoke command that does not depend on remote sync.
    pub fn ping(&self) -> Result<PlatformPing> {
        Ok(PlatformPing {
            plugin: "entity-graph-tauri".to_owned(),
            platform: "desktop".to_owned(),
        })
    }
}
