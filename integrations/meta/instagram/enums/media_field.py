from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-meta\src\main\java\io\kestra\plugin\meta\instagram\enums\MediaField.java

from enum import Enum
from typing import Any


class MediaField(str, Enum):
    ID = "ID"
    MEDIA_TYPE = "MEDIA_TYPE"
    MEDIA_URL = "MEDIA_URL"
    PERMALINK = "PERMALINK"
    THUMBNAIL_URL = "THUMBNAIL_URL"
    TIMESTAMP = "TIMESTAMP"
    CAPTION = "CAPTION"
    USERNAME = "USERNAME"
    COMMENTS_COUNT = "COMMENTS_COUNT"
    LIKE_COUNT = "LIKE_COUNT"
    IS_SHARED_TO_FEED = "IS_SHARED_TO_FEED"
    BOOST_ADS_LIST = "BOOST_ADS_LIST"
    BOOST_ELIGIBILITY_INFO = "BOOST_ELIGIBILITY_INFO"
    IS_COMMENT_ENABLED = "IS_COMMENT_ENABLED"
    VIEW_COUNT = "VIEW_COUNT"
