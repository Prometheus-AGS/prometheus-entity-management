## Default Permission

Read-only access to the entity-graph mirror.

Mutation and snapshot commands require explicit command permissions so an
application cannot silently grant write or persistence access to every webview.

#### This default permission set includes the following:

- `allow-graph-get-entity`
- `allow-graph-get-list`
- `allow-graph-platform-ping`

## Permission Table

<table>
<tr>
<th>Identifier</th>
<th>Description</th>
</tr>


<tr>
<td>

`entity-graph-tauri:allow-graph-clear`

</td>
<td>

Enables the graph_clear command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:deny-graph-clear`

</td>
<td>

Denies the graph_clear command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:allow-graph-get-entity`

</td>
<td>

Enables the graph_get_entity command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:deny-graph-get-entity`

</td>
<td>

Denies the graph_get_entity command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:allow-graph-get-list`

</td>
<td>

Enables the graph_get_list command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:deny-graph-get-list`

</td>
<td>

Denies the graph_get_list command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:allow-graph-patch-entity`

</td>
<td>

Enables the graph_patch_entity command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:deny-graph-patch-entity`

</td>
<td>

Denies the graph_patch_entity command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:allow-graph-persist-snapshot`

</td>
<td>

Enables the graph_persist_snapshot command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:deny-graph-persist-snapshot`

</td>
<td>

Denies the graph_persist_snapshot command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:allow-graph-platform-ping`

</td>
<td>

Enables the graph_platform_ping command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:deny-graph-platform-ping`

</td>
<td>

Denies the graph_platform_ping command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:allow-graph-remove-entity`

</td>
<td>

Enables the graph_remove_entity command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:deny-graph-remove-entity`

</td>
<td>

Denies the graph_remove_entity command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:allow-graph-restore-snapshot`

</td>
<td>

Enables the graph_restore_snapshot command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:deny-graph-restore-snapshot`

</td>
<td>

Denies the graph_restore_snapshot command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:allow-graph-set-list`

</td>
<td>

Enables the graph_set_list command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:deny-graph-set-list`

</td>
<td>

Denies the graph_set_list command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:allow-graph-upsert-entity`

</td>
<td>

Enables the graph_upsert_entity command without any pre-configured scope.

</td>
</tr>

<tr>
<td>

`entity-graph-tauri:deny-graph-upsert-entity`

</td>
<td>

Denies the graph_upsert_entity command without any pre-configured scope.

</td>
</tr>
</table>
