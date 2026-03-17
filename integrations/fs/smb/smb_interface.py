from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\smb\SmbInterface.java

from typing import Any, Protocol

from integrations.fs.vfs.abstract_vfs_interface import AbstractVfsInterface


class SmbInterface(AbstractVfsInterface, Protocol):
    pass
