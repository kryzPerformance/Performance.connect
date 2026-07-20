---
name: Event category mapping
description: How event categories map to display type keys on the events frontend
---
Events store `categories` as an ordered JSONB string array; the FIRST entry is the organizer's primary category.
**Why:** Multi-category events (e.g. a drag race also tagged "Car Show") were mislabeled when the whole array was scanned; the first entry reflects intent.
**How to apply:** When mapping categories to display types (meet/track/show/coffee/other), only the first category decides; check "coffee" before "meet" so "Cars and Coffee" doesn't match "meet". Unmapped primary → "other" (shown as EVENT).
