import Tauri
import WebKit

class EntityGraphPlugin: Plugin {
  @objc public func ping(_ invoke: Invoke) {
    invoke.resolve([
      "plugin": "entity-graph-tauri",
      "platform": "ios",
    ])
  }
}

@_cdecl("init_plugin_entity_graph_tauri")
func initPlugin() -> Plugin {
  return EntityGraphPlugin()
}
