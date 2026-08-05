import {verifyNativeApiManifest} from './native-api-manifest.mjs';

const manifest = await verifyNativeApiManifest();

console.log(
  `Verified native API manifest for ${manifest.sourceFiles.length} source files and ${manifest.artifactFileCount} generated files.`,
);
