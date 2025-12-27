"""
Compatibility shim for Python 3.11+ collections module changes.
This fixes the MutableMapping import issue.
"""
import sys
import collections.abc

# Python 3.10+ moved MutableMapping to collections.abc
# Some older packages still try to import from collections
if sys.version_info >= (3, 10):
    import collections
    if not hasattr(collections, 'MutableMapping'):
        collections.MutableMapping = collections.abc.MutableMapping
    if not hasattr(collections, 'Mapping'):
        collections.Mapping = collections.abc.Mapping
    if not hasattr(collections, 'Sequence'):
        collections.Sequence = collections.abc.Sequence
    if not hasattr(collections, 'Iterable'):
        collections.Iterable = collections.abc.Iterable

