# KBD certification block conflated with implementation

Date: 2026-08-30

## Symptom

Transitioning React inspector Task 12 to `blocked` correctly represented the
missing external human-certification evidence, but KBD also changed the parent
change's `implementationStatus` from `complete` to `blocked`. The phase-local
implementation counter dropped from 5/9 to 4/9 and the project counter dropped
from 37/63 to 36/63.

## Root cause

The current KBD task transition projects a blocked child task into both the
change's general status and its implementation status. It does not distinguish
a post-implementation certification blocker from an implementation blocker,
despite the `kbd-execute` contract requiring certification state not to reopen
the implementation counter.

## Correction

Task 12 was returned to `in_progress`, then the parent React change was returned
to `complete`. The phase remains canonically `blocked`, the React implementation
counter is restored to 5/9, and the external certification blocker is retained
in the study evidence and Artifact Refiner state.

## Prevention

Until the KBD runtime has independent task dimensions, do not use task-level
`blocked` for evidence, certification, publication, or other post-implementation
gates. Keep the task open, block the phase, retain a typed blocker artifact, and
leave the completed implementation counter unchanged.
