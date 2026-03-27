---
title: Isolation & Security
description: Staging directories, structural no-leak, and separation between evaluated model and runner-only data.
sidebar:
  order: 2
---

Isolation is enforced via per-call staging directories: the evaluated model only sees the current step definition, admitted payloads, and sanitized carry-forward state.

