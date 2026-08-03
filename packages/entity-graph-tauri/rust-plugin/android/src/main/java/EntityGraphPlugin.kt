package com.prometheusags.entitygraph

import android.app.Activity
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@TauriPlugin
class EntityGraphPlugin(activity: Activity) : Plugin(activity) {
    @Command
    fun ping(invoke: Invoke) {
        val response = JSObject()
        response.put("plugin", "entity-graph-tauri")
        response.put("platform", "android")
        invoke.resolve(response)
    }
}
