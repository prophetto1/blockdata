"""
MongoDB task family translated from the Kestra MongoDB plugin package.

The module layout preserves the same family split:
- connection and BSON helpers live in shared support modules
- AbstractTask owns database and collection resolution
- AbstractLoad owns storage-to-bulk-write execution
- concrete task modules stay thin and task-specific
"""
