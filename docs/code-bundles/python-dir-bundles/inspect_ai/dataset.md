# Python Bundle: `dataset`

- Source root: `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai`
- Python files: `10`

## Files

- `dataset/__init__.py`
- `dataset/_dataset.py`
- `dataset/_sources/__init__.py`
- `dataset/_sources/csv.py`
- `dataset/_sources/example.py`
- `dataset/_sources/file.py`
- `dataset/_sources/hf.py`
- `dataset/_sources/json.py`
- `dataset/_sources/util.py`
- `dataset/_util.py`

## `dataset/__init__.py`

```python
# ruff: noqa: F403 F405

from ._dataset import (
    Dataset,
    FieldSpec,
    MemoryDataset,
    RecordToSample,
    Sample,
)
from ._sources.csv import csv_dataset
from ._sources.example import example_dataset
from ._sources.file import file_dataset
from ._sources.hf import hf_dataset
from ._sources.json import json_dataset

__all__ = [
    "Dataset",
    "Sample",
    "FieldSpec",
    "RecordToSample",
    "MemoryDataset",
    "file_dataset",
    "csv_dataset",
    "hf_dataset",
    "json_dataset",
    "example_dataset",
]
```

## `dataset/_dataset.py`

```python
import abc
import random
from dataclasses import dataclass, field
from typing import (
    TYPE_CHECKING,
    Any,
    Callable,
    Iterator,
    Sequence,
    Type,
    Union,
    overload,
)

from pydantic import BaseModel, Field
from typing_extensions import override

from inspect_ai._util.answer import answer_character, answer_index
from inspect_ai._util.metadata import MT, metadata_as
from inspect_ai.model import ChatMessage
from inspect_ai.util import SandboxEnvironmentSpec, SandboxEnvironmentType
from inspect_ai.util._sandbox.environment import resolve_sandbox_environment

if TYPE_CHECKING:
    from _typeshed import SupportsRichComparison


class Sample(BaseModel):
    r"""Sample for an evaluation task."""

    def __init__(
        self,
        input: str | list[ChatMessage],
        choices: list[str] | None = None,
        target: str | list[str] = "",
        id: int | str | None = None,
        metadata: dict[str, Any] | None = None,
        sandbox: SandboxEnvironmentType | None = None,
        files: dict[str, str] | None = None,
        setup: str | None = None,
    ) -> None:
        r"""Create a Sample.

        Args:
            input: The input to be submitted to the model.
            choices: Optional. List of available answer choices
                (used only for multiple-choice evals).
            target: Optional. Ideal target output. May be a literal value
                or narrative text to be used by a model grader.
            id: Optional. Unique identifier for sample.
            metadata: Optional. Arbitrary metadata associated with the sample.
            sandbox: Optional. Sandbox specification for this sample.
            files: Optional. Files that go along with the sample (copied to
                SandboxEnvironment). Files can be paths, inline text, or inline binary (base64 encoded data URL).
            setup: Optional. Setup script to run for sample (run
                within default SandboxEnvironment).
        """
        super().__init__(
            input=input,
            choices=choices,
            target=target,
            id=id,
            metadata=metadata,
            sandbox=resolve_sandbox_environment(sandbox),
            files=files,
            setup=setup,
        )

    input: str | list[ChatMessage]
    """The input to be submitted to the model."""

    choices: list[str] | None = Field(default=None)
    """List of available answer choices (used only for multiple-choice evals)."""

    target: str | list[str] = Field(default_factory=str)
    """Ideal target output. May be a literal value or narrative text to be used by a model grader."""

    id: int | str | None = Field(default=None)
    """Unique identifier for sample."""

    metadata: dict[str, Any] | None = Field(default=None)
    """Arbitrary metadata associated with the sample."""

    def metadata_as(self, metadata_cls: Type[MT]) -> MT:
        """Metadata as a Pydantic model.

        Args:
           metadata_cls: BaseModel derived class.

        Returns:
           BaseModel: Instance of metadata_cls.
        """
        if self.metadata is None:
            raise ValueError("Sample does not have metadata")

        return metadata_as(self.metadata, metadata_cls)

    sandbox: SandboxEnvironmentSpec | None = Field(default=None)
    """Sandbox environment type and optional config file."""

    files: dict[str, str] | None = Field(default=None)
    """Files that go along with the sample (copied to SandboxEnvironment)"""

    setup: str | None = Field(default=None)
    """Setup script to run for sample (run within default SandboxEnvironment)."""


def sample_input_len(sample: Sample) -> int:
    """Measures the length of a samples `input` field.

    The default length function use in `Dataset.sort()`.

    Args:
        sample (Sample): A Sample to be used in an evaluation task.
    """
    return (
        len(sample.input)
        if isinstance(sample.input, str)
        else sum(len(inp.text) for inp in sample.input)
    )


DatasetRecord = dict[str, Any]

DatasetReader = Iterator[DatasetRecord]


class Dataset(Sequence[Sample], abc.ABC):
    r"""A sequence of Sample objects.

    Datasets provide sequential access (via conventional indexes or slicing)
    to a collection of Sample objects.
    """

    @property
    @abc.abstractmethod
    def name(self) -> str | None: ...

    @property
    @abc.abstractmethod
    def location(self) -> str | None: ...

    @property
    @abc.abstractmethod
    def shuffled(self) -> bool: ...

    @overload
    def __getitem__(self, index: int) -> Sample: ...

    @overload
    def __getitem__(self, index: slice) -> "Dataset": ...

    @abc.abstractmethod
    def __getitem__(self, index: Union[int, slice]) -> Union[Sample, "Dataset"]: ...

    @abc.abstractmethod
    def __len__(self) -> int: ...

    @abc.abstractmethod
    def sort(
        self,
        reverse: bool = False,
        key: Callable[[Sample], "SupportsRichComparison"] = sample_input_len,
    ) -> None:
        """Sort the dataset (in place) in ascending order and return None.

        If a key function is given, apply it once to each list item and sort them, ascending or descending, according to their function values.

        The key function defaults to measuring the length of the sample's input field.

        Args:
            reverse: If `Treu`, sort in descending order. Defaults to False.
            key: a callable mapping each item to a numeric value (optional, defaults to sample_input_len).
        """

    @abc.abstractmethod
    def filter(
        self, predicate: Callable[[Sample], bool], name: str | None = None
    ) -> "Dataset":
        """Filter the dataset using a predicate.

        Args:
          predicate: Filtering function.
          name: Name for filtered dataset (optional).

        Returns:
          Filtered dataset.
        """

    @abc.abstractmethod
    def shuffle(self, seed: int | None = None) -> None:
        """Shuffle the order of the dataset (in place).

        Args:
           seed: Random seed for shuffling (optional).
        """

    @abc.abstractmethod
    def shuffle_choices(self, seed: int | None = None) -> None:
        """Shuffle the order of the choices with each sample.

        Args:
           seed: Random seed for shuffling (optional).
        """


@dataclass
class FieldSpec:
    r"""Specification for mapping data source fields to sample fields."""

    input: str = field(default="input")
    """Name of the field containing the sample input."""

    target: str = field(default="target")
    """Name of the field containing the sample target."""

    choices: str = field(default="choices")
    """Name of field containing the list of answer choices."""

    id: str = field(default="id")
    """ Unique identifier for the sample."""

    metadata: list[str] | Type[BaseModel] | None = field(default=None)
    """List of additional field names that should be read as metadata."""

    sandbox: str = field(default="sandbox")
    """Sandbox type along with optional config file."""

    files: str = field(default="files")
    """Files that go along wtih the sample."""

    setup: str = field(default="setup")
    """Setup script to run for sample (run within default SandboxEnvironment)."""


RecordToSample = Callable[[DatasetRecord], Sample | list[Sample]]
r"""Callable that maps raw dictionary record to a Sample."""


class MemoryDataset(Dataset):
    r"""A Dataset stored in memory."""

    def __init__(
        self,
        samples: list[Sample],
        name: str | None = None,
        location: str | None = None,
        shuffled: bool = False,
    ) -> None:
        r"""A dataset of samples held in an in-memory list.

        Datasets provide sequential access (via conventional indexes or slicing)
        to a collection of Sample objects. The ListDataset is explicitly
        initialized with a list that is held in memory.

        Args:
            samples (list[Sample]): The list of sample objects.
            name (str | None): Optional name for dataset.
            location (str | None): Optional location for dataset.
            shuffled (bool): Was the dataset shuffled after reading.
        """
        self.samples = samples
        self._name = name
        self._location = location
        self._shuffled = shuffled

    @override
    @property
    def name(self) -> str | None:
        """Dataset name."""
        return self._name

    @override
    @property
    def location(self) -> str | None:
        """Dataset location."""
        return self._location

    @override
    @property
    def shuffled(self) -> bool:
        """Was the dataset shuffled."""
        return self._shuffled

    @overload
    def __getitem__(self, index: int) -> Sample: ...

    @overload
    def __getitem__(self, index: slice) -> Dataset: ...

    @override
    def __getitem__(self, index: Union[int, slice]) -> Union[Sample, Dataset]:
        if isinstance(index, int):
            return self.samples[index]
        else:
            return MemoryDataset(
                samples=self.samples[index],
                name=self.name,
                location=self.location,
                shuffled=self.shuffled,
            )

    @override
    def __len__(self) -> int:
        return len(self.samples)

    @override
    def shuffle(self, seed: int | None = None) -> None:
        if seed is not None:
            random.Random(seed).shuffle(self.samples)
        else:
            random.shuffle(self.samples)
        self._shuffled = True

    @override
    def shuffle_choices(self, seed: int | None = None) -> None:
        rand = random.Random(seed)
        for sample in self.samples:
            if not sample.choices:
                continue
            # The original positions
            positions = list(range(len(sample.choices)))

            # Shuffle the choices
            rand.shuffle(positions)
            shuffled_choices = [sample.choices[i] for i in positions]

            # Map of original position / target letter
            position_map = {
                i: answer_character(new_i) for new_i, i in enumerate(positions)
            }

            # Update to the shuffled choices and target
            sample.choices = shuffled_choices
            sample.target = self._remap_target(sample.target, position_map=position_map)

    def _remap_target(
        self, target: str | list[str], position_map: dict[int, str]
    ) -> str | list[str]:
        if isinstance(target, list):
            return [position_map[answer_index(t)] for t in target]
        else:
            return position_map[answer_index(target)]

    @override
    def sort(
        self,
        reverse: bool = False,
        key: Callable[[Sample], "SupportsRichComparison"] = sample_input_len,
    ) -> None:
        self.samples.sort(reverse=reverse, key=key)

    @override
    def filter(
        self, predicate: Callable[[Sample], bool], name: str | None = None
    ) -> "MemoryDataset":
        return MemoryDataset(
            name=name or self.name,
            location=self.location,
            samples=[sample for sample in self if predicate(sample)],
            shuffled=self.shuffled,
        )
```

## `dataset/_sources/__init__.py`

```python

```

## `dataset/_sources/csv.py`

```python
import csv
import os
from io import TextIOWrapper
from pathlib import Path
from typing import Any

from inspect_ai._util.asyncfiles import is_s3_filename
from inspect_ai._util.file import file
from inspect_ai.dataset._sources.util import resolve_sample_files

from .._dataset import (
    Dataset,
    DatasetReader,
    FieldSpec,
    MemoryDataset,
    RecordToSample,
)
from .._util import data_to_samples, record_to_sample_fn, shuffle_choices_if_requested


def csv_dataset(
    csv_file: str,
    sample_fields: FieldSpec | RecordToSample | None = None,
    auto_id: bool = False,
    shuffle: bool = False,
    seed: int | None = None,
    shuffle_choices: bool | int | None = None,
    limit: int | None = None,
    dialect: str = "unix",
    encoding: str = "utf-8",
    name: str | None = None,
    fs_options: dict[str, Any] | None = None,
    fieldnames: list[str] | None = None,
    delimiter: str = ",",
) -> Dataset:
    r"""Read dataset from CSV file.

    Args:
        csv_file: Path to CSV file. Can be a local filesystem path,
            a path to an S3 bucket (e.g. "s3://my-bucket"), or an HTTPS URL.
            Use `fs_options` to pass arguments through to the `S3FileSystem` constructor.
        sample_fields: Method of mapping underlying
            fields in the data source to Sample objects. Pass `None` if the data is already
            stored in `Sample` form (i.e. has "input" and "target" columns.); Pass a
            `FieldSpec` to specify mapping fields by name; Pass a `RecordToSample` to
            handle mapping with a custom function that returns one or more samples.
        auto_id: Assign an auto-incrementing ID for each sample.
        shuffle: Randomly shuffle the dataset order.
        seed: Seed used for random shuffle.
        shuffle_choices: Whether to shuffle the choices. If an int is passed, this will be used as the seed when shuffling.
        limit: Limit the number of records to read.
        dialect: CSV dialect ("unix", "excel" or"excel-tab"). Defaults to "unix". See https://docs.python.org/3/library/csv.html#dialects-and-formatting-parameters for more details
        encoding: Text encoding for file (defaults to "utf-8").
        name: Optional name for dataset (for logging). If not specified,
            defaults to the stem of the filename
        fs_options: Optional. Additional arguments to pass through
            to the filesystem provider (e.g. `S3FileSystem`). Use `{"anon": True }`
            if you are accessing a public S3 bucket with no credentials.
        fieldnames: Optional. A list of fieldnames to use for the CSV.
            If None, the values in the first row of the file will be used as the fieldnames.
            Useful for files without a header.
        delimiter: Optional. The delimiter to use when parsing the file. Defaults to ",".

    Returns:
        Dataset read from CSV file.
    """
    # resolve data_to_sample function
    data_to_sample = record_to_sample_fn(sample_fields)

    # use readahead cache by default for s3
    if fs_options is None and is_s3_filename(csv_file):
        fs_options = dict(default_fill_cache=True, default_cache_type="readahead")

    # read and convert samples
    with file(csv_file, "r", encoding=encoding, fs_options=fs_options or {}) as f:
        # filter out rows with empty values
        valid_data = [
            data
            for data in csv_dataset_reader(f, dialect, fieldnames, delimiter)
            if data and any(value.strip() for value in data.values())
        ]
        name = name if name else Path(csv_file).stem
        dataset = MemoryDataset(
            samples=data_to_samples(valid_data, data_to_sample, auto_id),
            name=name,
            location=os.path.abspath(csv_file),
        )

        # resolve relative file paths
        resolve_sample_files(dataset)

        # shuffle if requested
        if shuffle:
            dataset.shuffle(seed=seed)

        shuffle_choices_if_requested(dataset, shuffle_choices)

        # limit if requested
        if limit:
            return dataset[0:limit]

        return dataset


def csv_dataset_reader(
    file: TextIOWrapper,
    dialect: str = "unix",
    fieldnames: list[str] | None = None,
    delimiter: str = ",",
) -> DatasetReader:
    return csv.DictReader(
        file, dialect=dialect, fieldnames=fieldnames, delimiter=delimiter
    )
```

## `dataset/_sources/example.py`

```python
from pathlib import Path
from typing import Callable

from .._dataset import Dataset, FieldSpec, MemoryDataset, RecordToSample
from .csv import csv_dataset
from .json import json_dataset

EXAMPLES_PATH = Path(__file__).parent.parent / "_examples"


def example_dataset(
    name: str,
    sample_fields: FieldSpec | RecordToSample | None = None,
) -> Dataset:
    """Read a dataset from inspect_ai package examples.

    This is primarily used for sharing runnable example
    snippets that don't need to read an external dataset.

    Args:
      name (str): Example dataset name. One of 'security_guide', 'theory_of_mind', 'popularity', or 'biology_qa'.
      sample_fields (FieldSpec | RecordToSample): Method of mapping underlying
        fields in the data source to `Sample` objects. Pass `None` if the data is already
        stored in `Sample` form (i.e. object with "input" and "target" fields); Pass a
        `FieldSpec` to specify mapping fields by name; Pass a `RecordToSample` to
        handle mapping with a custom function that returns one or more samples.


    Returns:
      Dataset read from example file.
    """

    def get_dataset(
        file_path: Path,
        dataset_func: Callable[[str, FieldSpec | RecordToSample | None], Dataset],
    ) -> Dataset | None:
        if file_path.exists():
            return dataset_func(str(file_path), sample_fields)
        return None

    json_file = EXAMPLES_PATH / f"{name}.jsonl"
    csv_file = EXAMPLES_PATH / f"{name}.csv"

    dataset = get_dataset(json_file, json_dataset) or get_dataset(csv_file, csv_dataset)

    if dataset is None:
        available_datasets = [
            file.stem for file in EXAMPLES_PATH.iterdir() if file.is_file()
        ]
        raise ValueError(
            f"Sample dataset {name} not found. Available datasets: {available_datasets}"
        )

    return MemoryDataset(samples=list(dataset), name=name, location=f"example://{name}")
```

## `dataset/_sources/file.py`

```python
import os
from typing import Any

from .._dataset import (
    Dataset,
    FieldSpec,
    RecordToSample,
)
from .csv import csv_dataset
from .json import json_dataset


def file_dataset(
    file: str,
    sample_fields: FieldSpec | RecordToSample | None = None,
    auto_id: bool = False,
    shuffle: bool = False,
    seed: int | None = None,
    shuffle_choices: bool | int | None = None,
    limit: int | None = None,
    dialect: str = "unix",
    encoding: str = "utf-8",
    name: str | None = None,
    fs_options: dict[str, Any] = {},
    fieldnames: list[str] | None = None,
) -> Dataset:
    """Dataset read from a JSON or CSV file.

    The `file_dataset` function supports reading from CSV and JSON files
    (and automatically delegates to the appropriate function to do so)

    Args:
        file (str): Path to JSON or CSV file. Can be a local filesystem path or
            a path to an S3 bucket (e.g. "s3://my-bucket"). Use `fs_options`
            to pass arguments through to the `S3FileSystem` constructor.
        sample_fields (FieldSpec | RecordToSample): Method of mapping underlying
            fields in the data source to Sample objects. Pass `None` if the data is already
            stored in `Sample` form (i.e. has "input" and "target" columns.); Pass a
            `FieldSpec` to specify mapping fields by name; Pass a `RecordToSample` to
            handle mapping with a custom function that returns one or more samples.
        auto_id (bool): Assign an auto-incrementing ID for each sample.
        shuffle (bool): Randomly shuffle the dataset order.
        seed: (int | None): Seed used for random shuffle.
        shuffle_choices: (bool | int | None): Whether to shuffle the choices. If an int is passed, this will be used as the seed when shuffling.
        limit (int | None): Limit the number of records to read.
        dialect (str): CSV dialect ("unix" or "excel", defaults to "unix"). Only
            applies to reading CSV files.
        encoding (str): Text encoding for file (defaults to "utf-8").
        name (str): Optional name for dataset (for logging). If not specified,
            defaults to the stem of the filename
        fs_options (dict[str, Any]): Optional. Additional arguments to pass through
            to the filesystem provider (e.g. `S3FileSystem`). Use `{"anon": True }`
            if you are accessing a public S3 bucket with no credentials.
        fieldnames (list[str] | None): Optional. A list of fieldnames to use for the CSV.
            If None, the values in the first row of the file will be used as the fieldnames.
            Useful for files without a header. Only applies to reading CSV files.

    Returns:
        Dataset read from JSON or CSV file.
    """
    ext = os.path.splitext(file)[1].lower()

    match ext:
        case ".json" | ".jsonl":
            return json_dataset(
                json_file=file,
                sample_fields=sample_fields,
                auto_id=auto_id,
                shuffle=shuffle,
                seed=seed,
                shuffle_choices=shuffle_choices,
                limit=limit,
                encoding=encoding,
                name=name,
                fs_options=fs_options,
            )
        case ".csv":
            return csv_dataset(
                csv_file=file,
                sample_fields=sample_fields,
                auto_id=auto_id,
                shuffle=shuffle,
                seed=seed,
                shuffle_choices=shuffle_choices,
                limit=limit,
                dialect=dialect,
                encoding=encoding,
                name=name,
                fs_options=fs_options,
                fieldnames=fieldnames,
            )
        case _:
            raise ValueError(f"No dataset reader for file with extension {ext}")
```

## `dataset/_sources/hf.py`

```python
# mypy: disable-error-code="unused-ignore"

import os
from pathlib import Path
from typing import Any

from inspect_ai._util.appdirs import inspect_cache_dir
from inspect_ai._util.error import pip_dependency_error
from inspect_ai._util.file import safe_filename
from inspect_ai._util.hash import mm3_hash
from inspect_ai._util.version import verify_required_version

from .._dataset import (
    Dataset,
    FieldSpec,
    MemoryDataset,
    RecordToSample,
)
from .._util import data_to_samples, record_to_sample_fn, shuffle_choices_if_requested


def hf_dataset(
    path: str,
    split: str,
    name: str | None = None,
    data_dir: str | None = None,
    revision: str | None = None,
    sample_fields: FieldSpec | RecordToSample | None = None,
    auto_id: bool = False,
    shuffle: bool = False,
    seed: int | None = None,
    shuffle_choices: bool | int | None = None,
    limit: int | None = None,
    trust: bool = False,
    cached: bool = True,
    **kwargs: Any,
) -> Dataset:
    """Datasets read using the Hugging Face `datasets` package.

    The `hf_dataset` function supports reading datasets using the Hugging Face
    `datasets` package, including remote datasets on Hugging Face Hub.

    Args:
      path: Path or name of the dataset. Depending on path, the dataset
        builder that is used comes from a generic dataset script (JSON, CSV,
        Parquet, text etc.) or from the dataset script (a python file) inside
        the dataset directory.
      split: Which split of the data to load.
      name: Name of the dataset configuration.
      data_dir: data_dir of the dataset configuration
        to read data from.
      revision: Specific revision to load (e.g. "main", a branch
        name, or a specific commit SHA). When using `revision` the `cached` option
        is ignored and datasets are revalidated on Hugging Face before loading.
      sample_fields: Method of mapping underlying
        fields in the data source to Sample objects. Pass `None` if the data is already
        stored in `Sample` form (i.e. has "input" and "target" columns.); Pass a
        `FieldSpec` to specify mapping fields by name; Pass a `RecordToSample` to
          handle mapping with a custom function that returns one or more samples.
      auto_id: Assign an auto-incrementing ID for each sample.
      shuffle: Randomly shuffle the dataset order.
      seed: Seed used for random shuffle.
      shuffle_choices: Whether to shuffle the choices. If an int is passed, this will be used as the seed when shuffling.
      limit: Limit the number of records to read.
      trust: Whether or not to allow for datasets defined on the Hub
        using a dataset script. This option should only be set to True for
        repositories you trust and in which you have read the code, as it
        will execute code present on the Hub on your local machine.
      cached: By default, datasets are read once from HuggingFace
        Hub and then cached for future reads. Pass `cached=False` to force
        re-reading the dataset from Hugging Face. Ignored when the `revision`
        option is specified.
      **kwargs (dict[str, Any]): Additional arguments to pass through to the
          `load_dataset` function of the `datasets` package.

    Returns:
        Dataset read from Hugging Face
    """
    # ensure we have the datasets package (>= v2.16, which supports trust_remote_code)
    FEATURE = "Hugging Face Datasets"
    PACKAGE = "datasets"
    VERSION = "2.16.0"
    try:
        import datasets  # type: ignore
    except ImportError:
        raise pip_dependency_error(FEATURE, [PACKAGE])
    verify_required_version(FEATURE, PACKAGE, VERSION)

    # resolve data_to_sample function
    data_to_sample = record_to_sample_fn(sample_fields)

    # generate a unique cache dir for this dataset
    dataset_hash = mm3_hash(f"{path}{name}{data_dir}{split}{kwargs}")
    datasets_cache_dir = inspect_cache_dir("hf_datasets")
    dataset_cache_dir = os.path.join(
        datasets_cache_dir, f"{safe_filename(path)}-{dataset_hash}"
    )
    if os.path.exists(dataset_cache_dir) and cached and revision is None:
        dataset = datasets.load_from_disk(dataset_cache_dir)
    else:
        print(f"Loading dataset {path} from Hugging Face...")
        dataset = datasets.load_dataset(  # type: ignore
            path=path,
            name=name,
            data_dir=data_dir,
            split=split,
            revision=revision,
            trust_remote_code=trust,
            **kwargs,
        )
        dataset.save_to_disk(dataset_cache_dir)

    # shuffle if requested
    if shuffle:
        dataset = dataset.shuffle(seed=seed)

    # limit if requested
    if limit:
        dataset = dataset.select(range(limit))

    # return the dataset
    memory_dataset = MemoryDataset(
        samples=data_to_samples(dataset.to_list(), data_to_sample, auto_id),
        name=Path(path).stem if Path(path).exists() else path,
        location=path,
    )

    shuffle_choices_if_requested(memory_dataset, shuffle_choices)

    return memory_dataset
```

## `dataset/_sources/json.py`

```python
import json
import os
from io import TextIOWrapper
from pathlib import Path
from typing import Any

import jsonlines

from inspect_ai._util.asyncfiles import is_s3_filename
from inspect_ai._util.file import file

from .._dataset import (
    Dataset,
    DatasetReader,
    FieldSpec,
    MemoryDataset,
    RecordToSample,
)
from .._util import data_to_samples, record_to_sample_fn, shuffle_choices_if_requested
from .util import resolve_sample_files


def json_dataset(
    json_file: str,
    sample_fields: FieldSpec | RecordToSample | None = None,
    auto_id: bool = False,
    shuffle: bool = False,
    seed: int | None = None,
    shuffle_choices: bool | int | None = None,
    limit: int | None = None,
    encoding: str = "utf-8",
    name: str | None = None,
    fs_options: dict[str, Any] | None = None,
    **reader_kwargs: Any,
) -> Dataset:
    r"""Read dataset from a JSON file.

    Read a dataset from a JSON file containing an array of objects, or
    from a JSON Lines file containing one object per line. These objects may
    already be formatted as `Sample` instances, or may require some mapping using
    the `sample_fields` argument.

    Args:
      json_file: Path to JSON file. Can be a local filesystem path or
        a path to an S3 bucket (e.g. "s3://my-bucket"). Use `fs_options`
        to pass arguments through to the `S3FileSystem` constructor.
      sample_fields: Method of mapping underlying
        fields in the data source to `Sample` objects. Pass `None` if the data is already
        stored in `Sample` form (i.e. object with "input" and "target" fields); Pass a
        `FieldSpec` to specify mapping fields by name; Pass a `RecordToSample` to
        handle mapping with a custom function that returns one or more samples.
      auto_id: Assign an auto-incrementing ID for each sample.
      shuffle: Randomly shuffle the dataset order.
      seed: Seed used for random shuffle.
      shuffle_choices: Whether to shuffle the choices. If an int is passed, this will be used as the seed when shuffling.
      limit: Limit the number of records to read.
      encoding: Text encoding for file (defaults to "utf-8").
      name: Optional name for dataset (for logging). If not specified,
        defaults to the stem of the filename.
      fs_options: Optional. Additional arguments to pass through
        to the filesystem provider (e.g. `S3FileSystem`). Use `{"anon": True }`
        if you are accessing a public S3 bucket with no credentials.
      **reader_kwargs: Optional JSON reader options.

    Returns:
        Dataset read from JSON file.
    """
    # resolve data_to_sample function
    data_to_sample = record_to_sample_fn(sample_fields)

    # pick the right reader for the file extension
    dataset_reader = (
        jsonlines_dataset_reader
        if json_file.lower().endswith(".jsonl")
        else json_dataset_reader
    )

    # use readahead cache by default for s3
    if fs_options is None and is_s3_filename(json_file):
        fs_options = dict(default_fill_cache=True, default_cache_type="readahead")

    # read and convert samples
    with file(json_file, "r", encoding=encoding, fs_options=fs_options or {}) as f:
        name = name if name else Path(json_file).stem
        dataset = MemoryDataset(
            samples=data_to_samples(
                dataset_reader(f, **reader_kwargs), data_to_sample, auto_id
            ),
            name=name,
            location=os.path.abspath(json_file),
        )

        # resolve relative file paths
        resolve_sample_files(dataset)

        # shuffle if requested
        if shuffle:
            dataset.shuffle(seed=seed)

        shuffle_choices_if_requested(dataset, shuffle_choices)

        # limit if requested
        if limit:
            return dataset[0:limit]

    return dataset


def jsonlines_dataset_reader(file: TextIOWrapper, **kwargs: Any) -> DatasetReader:
    jsonlines_reader = jsonlines.Reader(file, **kwargs)
    return jsonlines_reader.iter(type=dict)


def json_dataset_reader(file: TextIOWrapper, **kwargs: Any) -> DatasetReader:
    data = json.load(file, **kwargs)
    if isinstance(data, list):
        return iter(data)

    if isinstance(data, dict):
        return iter([data])

    raise ValueError(f"Could not read json into a supported type, found: {type(data)=}")
```

## `dataset/_sources/util.py`

```python
from typing import Callable

from inspect_ai._util.content import (
    Content,
    ContentAudio,
    ContentDocument,
    ContentImage,
    ContentVideo,
)
from inspect_ai._util.file import filesystem
from inspect_ai.model._chat_message import ChatMessage, ChatMessageUser
from inspect_ai.util._sandbox.environment import SandboxEnvironmentSpec

from .._dataset import Dataset


def resolve_sample_files(dataset: Dataset) -> None:
    """Resolve relative file paths to absolute (using the input file path)"""
    # bail if the dataset has no location
    if not dataset.location:
        return

    # filesystem and parent for resolving paths
    fs = filesystem(dataset.location)
    parent_dir = fs.sep.join(dataset.location.split(fs.sep)[:-1])

    # resolve file locations
    def resolve_file(file: str) -> str:
        # try/except (and ignore) to tolerate 'paths' that are actually
        # file contents (so will trip OS name too long constraints)
        try:
            target_file = f"{parent_dir}{fs.sep}{file}"
            if fs.exists(target_file):
                return target_file
            else:
                return file
        except OSError:
            return file

    # for each sample
    for sample in dataset:
        # check for sandbox config file
        if sample.sandbox and isinstance(sample.sandbox.config, str):
            sample.sandbox = SandboxEnvironmentSpec(
                sample.sandbox.type, resolve_file(sample.sandbox.config)
            )

        # check for files
        if sample.files is not None:
            for path in sample.files.keys():
                sample.files[path] = resolve_file(sample.files[path])

        # check for setup script
        if sample.setup is not None:
            sample.setup = resolve_file(sample.setup)

        # check for image paths
        if not isinstance(sample.input, str):
            sample.input = messages_with_resolved_content(sample.input, resolve_file)


def messages_with_resolved_content(
    messages: list[ChatMessage], resolver: Callable[[str], str]
) -> list[ChatMessage]:
    return [message_with_resolved_content(message, resolver) for message in messages]


def message_with_resolved_content(
    message: ChatMessage, resolver: Callable[[str], str]
) -> ChatMessage:
    if isinstance(message, ChatMessageUser) and not isinstance(message.content, str):
        return message.model_copy(
            update=dict(
                content=[
                    chat_content_with_resolved_content(content, resolver)
                    for content in message.content
                ],
            )
        )
    else:
        return message


def chat_content_with_resolved_content(
    content: Content, resolver: Callable[[str], str]
) -> Content:
    if isinstance(content, ContentImage):
        return ContentImage(
            image=resolver(content.image),
            detail=content.detail,
        )
    elif isinstance(content, ContentAudio):
        return ContentAudio(audio=resolver(content.audio), format=content.format)
    elif isinstance(content, ContentVideo):
        return ContentVideo(video=resolver(content.video), format=content.format)
    elif isinstance(content, ContentDocument):
        return content.model_copy(update=dict(document=resolver(content.document)))
    else:
        return content
```

## `dataset/_util.py`

```python
import json
from typing import Any, Iterable, cast

from pydantic import ValidationError

from inspect_ai.model import (
    ChatMessage,
    ChatMessageAssistant,
    ChatMessageSystem,
    ChatMessageTool,
    ChatMessageUser,
)
from inspect_ai.util._sandbox.environment import SandboxEnvironmentSpec

from ._dataset import (
    Dataset,
    DatasetRecord,
    FieldSpec,
    RecordToSample,
    Sample,
)


def normalise_sample_id(id: str | int | None) -> str:
    if isinstance(id, str) and id.isdigit():
        id = int(id)
    return id if isinstance(id, str) else str(id).zfill(20)


# determine how we will go from file records to samples. if there is
# no field spec, we assume the column names "input" and "target",
# otherwise use the provided field spec or custom converter function
def record_to_sample_fn(
    sample_fields: FieldSpec | RecordToSample | None,
) -> RecordToSample:
    if sample_fields is None:
        sample_fields = FieldSpec()

    if isinstance(sample_fields, FieldSpec):

        def record_to_sample(record: DatasetRecord) -> Sample:
            # collect metadata if specified
            metadata: dict[str, Any] | None = None
            if sample_fields.metadata:
                if isinstance(sample_fields.metadata, list):
                    metadata = {}
                    for name in sample_fields.metadata:
                        metadata[name] = record.get(name)
                else:
                    # must be frozen
                    if not sample_fields.metadata.model_config.get("frozen", False):
                        raise ValueError(
                            f"Metadata model {sample_fields.metadata.__name__} must have frozen=True"
                        )

                    # filter to only fields in the model
                    model_fields = record.get("metadata", None)
                    if isinstance(model_fields, str):
                        model_fields = json.loads(model_fields)
                    elif model_fields is None:
                        model_fields = {
                            k: v
                            for k, v in record.items()
                            if k in sample_fields.metadata.__pydantic_fields__.keys()
                        }

                    # parse and return metadata
                    try:
                        metadata = sample_fields.metadata(**model_fields).model_dump()
                    except ValidationError as ex:
                        raise ValueError(
                            f"Could not parse metadata into {sample_fields.metadata.__name__}: {ex}"
                        )
            elif "metadata" in record:
                metadata_field = record.get("metadata")
                if isinstance(metadata_field, str):
                    metadata = json.loads(metadata_field)
                elif isinstance(metadata_field, dict):
                    metadata = metadata_field
                else:
                    raise ValueError(
                        f"Unexpected type for 'metadata' field: {type(metadata_field)}"
                    )

            # return sample
            return Sample(
                input=read_input(record.get(sample_fields.input)),
                target=read_target(record.get(sample_fields.target)),
                choices=read_choices(record.get(sample_fields.choices)),
                id=record.get(sample_fields.id, None),
                metadata=metadata,
                sandbox=read_sandbox(record.get(sample_fields.sandbox)),
                files=read_files(record.get(sample_fields.files)),
                setup=read_setup(record.get(sample_fields.setup)),
            )

        return record_to_sample

    else:
        return sample_fields


def data_to_samples(
    data: Iterable[DatasetRecord], data_to_sample: RecordToSample, auto_id: bool
) -> list[Sample]:
    next_id = 1
    samples: list[Sample] = []
    for record in data:
        record_samples = as_sample_list(data_to_sample(record))
        if auto_id:
            for record_sample in record_samples:
                record_sample.id = next_id
                next_id += 1
        samples.extend(record_samples)
    return samples


def as_sample_list(samples: Sample | list[Sample]) -> list[Sample]:
    if isinstance(samples, list):
        return samples
    else:
        return [samples]


def read_input(input: Any | None) -> str | list[ChatMessage]:
    if not input:
        raise ValueError("No input in dataset")
    if not isinstance(input, str):
        return read_messages(input)
    else:
        return input


def read_messages(messages: list[dict[str, Any]]) -> list[ChatMessage]:
    chat_messages: list[ChatMessage] = []
    for message in messages:
        role = message.get("role", None)

        content = message.get("content", None)
        if content is None:
            raise ValueError("content not specified for chat input in dataset")

        match role:
            case "system":
                chat_messages.append(ChatMessageSystem(content=content, source="input"))
            case "user":
                chat_messages.append(ChatMessageUser(content=content, source="input"))
            case "assistant":
                chat_messages.append(
                    ChatMessageAssistant(
                        content=content,
                        source="input",
                        tool_calls=message.get("tool_calls", None),
                    )
                )
            case "tool":
                chat_messages.append(
                    ChatMessageTool(
                        content=content,
                        source="input",
                        tool_call_id=message.get("tool_call_id", None),
                        function=message.get("function", None),
                        error=message.get("error", None),
                    )
                )
            case _:
                raise ValueError("role not specified for chat input in dataset")

    return chat_messages


def read_target(obj: Any | None) -> str | list[str]:
    if obj is not None:
        return [str(item) for item in obj] if isinstance(obj, list) else str(obj)
    else:
        return ""


def read_choices(obj: Any | None) -> list[str] | None:
    if obj is not None:
        if isinstance(obj, list):
            return [str(choice) for choice in obj]
        elif isinstance(obj, str):
            choices = obj.split(",")
            if len(choices) == 1:
                choices = obj.split()
            return [choice.strip() for choice in choices]
        else:
            return [str(obj)]
    else:
        return None


def read_setup(setup: Any | None) -> str | None:
    if setup is not None:
        return str(setup)
    else:
        return None


def read_sandbox(sandbox: Any | None) -> SandboxEnvironmentSpec | None:
    if sandbox is not None:
        if isinstance(sandbox, str):
            if sandbox.strip().startswith("["):
                sandbox = json.loads(sandbox)
            else:
                return SandboxEnvironmentSpec(sandbox)

        if isinstance(sandbox, list):
            if len(sandbox) == 2:
                return SandboxEnvironmentSpec(str(sandbox[0]), str(sandbox[1]))
            else:
                raise ValueError(
                    f"Invalid 'sandbox' value: '{str(sandbox)}'. Sandbox must be string or 2-item list"
                )

        # didn't find the right type
        raise ValueError(f"Unexpected type for 'sandbox' field: {type(sandbox)}")
    else:
        return None


def read_files(files: Any | None) -> dict[str, str] | None:
    if files is not None:
        if isinstance(files, str):
            files = json.loads(files)
        if isinstance(files, dict):
            if all(isinstance(v, str) for v in files.values()):
                return cast(dict[str, str], files)

        # didn't find the right type
        raise ValueError(f"Unexpected type for 'files' field: {type(files)}")
    else:
        return None


def shuffle_choices_if_requested(
    dataset: Dataset, shuffle_choices: bool | int | None
) -> None:
    """
    Shuffle the choices in the dataset if requested.

    The `shuffle_choices` parameter passed to `json_dataset`, `csv_dataset`,
    and `hf_dataset` can be a boolean, an integer, or `None` (default).
    If it is a boolean, it will shuffle the choices if the value is `True`,
    and do nothing if it is `False`.
    If it is an integer, it will shuffle the choices using the integer as the seed.
    """
    # Note that `isinstance(x, int)` returns True if x is True or False,
    # so we need to check for both explicitly
    if shuffle_choices is True:
        dataset.shuffle_choices()
    elif shuffle_choices is False:
        pass
    elif isinstance(shuffle_choices, int):
        dataset.shuffle_choices(seed=shuffle_choices)
```
