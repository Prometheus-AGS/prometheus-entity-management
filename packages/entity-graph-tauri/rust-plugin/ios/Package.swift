// swift-tools-version:5.9
import PackageDescription

let package = Package(
  name: "entity-graph-tauri",
  platforms: [
    .macOS(.v10_13),
    .iOS(.v13),
  ],
  products: [
    .library(
      name: "entity-graph-tauri",
      type: .static,
      targets: ["entity-graph-tauri"])
  ],
  dependencies: [
    .package(name: "Tauri", path: "../.tauri/tauri-api")
  ],
  targets: [
    .target(
      name: "entity-graph-tauri",
      dependencies: [.byName(name: "Tauri")],
      path: "Sources")
  ]
)
