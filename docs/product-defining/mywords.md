
Imagine a processs like this.

use docling convert to markdown... use remark... to parse into MDAST... and then using MDAST create the user defined block...

So you have
[immutable data 1: derived from source doc via docling before md conversion]
after converting into mdast
[immutable data 2: block data derived from mdast]
then user-defined metadata for each block
[user-defined metadata]

all 3 of these come together and form one json 
and all blocks = all json files = one jsonl = entire document



 What document types are supported again by docling? and for the immutable, if we want to acquire as much information that is given to us by docling... what would "acquiring all data derivable from docling" mean? currently we have investigated what docling provides as :

**A. Input Document Info (InputDocument)**
- `file` (Required): Original filename/path.
- `format` (Required): Detected format enum (e.g., `InputFormat.PDF`).
- `document_hash` (Computed): SHA-256 of the binary stream.
- `filesize` (Optional, Computed): Size in bytes.
- `page_count` (Default 0): Number of pages (populated for paginated formats like PDF, DOCX, PPTX).

**B. Conversion Assets (ConversionAssets)**
- `status` (Default: Pending): `success`, `failure`, `partial_success`, `skipped`.
- `timestamp` (Optional): ISO timestamp of when the assets were saved (not run).
- `version` (Default: Current): Versions of Docling components used.
- `timings` (Optional): Granular profiling data (e.g., pipeline steps).
- `confidence` (Default: Empty): Quality scores for pages and overall document.
- `errors` (Default: Empty): List of error items if conversion had issues.

**C. Document Origin (DoclingDocument.origin)**
- `mimetype`: Detected MIME type.
- `binary_hash`: Same as `input.document_hash`.
- `filename`: Name of the source file.
- `cloud_storage_url`: (Optional) If processed from a URL.

Our system intends on taking this information 
 
 {
  "immutable": {
    "system_identity": {
      "doc_uid": "",
      "source_uid": "doclin",
      "md_uid": ""
    },
    "system_config": {
      "chunking_strategy": "paragraph",
      "chunking_granularity": 1
    },
    "system_storage": {
      "md_locator": ""
    },
    "docling": {
      "input": { 
        "file": "MyPaper.pdf",
        "format": "pdf",
        "document_hash": "a1b2...",
        "filesize": 1024
      },
      "conversion": {
        "status": "success",
        "timestamp": "2023-10-27T...",
        "timings": { "pipeline_setup": "..." },
        "pages": [
          { "page_no": 1, "size": { "width": 600, "height": 800 }, "predictions": "..." }
        ],
        "origin": {
          "filename": "MyPaper.pdf",
          "mimetype": "application/pdf",
          "binary_hash": "a1b2..."
        }
      } 
    }
  },
  "user_defined": {}
}






 
 Also you should understand that immutable_schema_ref... this is something that I don't feel I thought we no longer need because initially... what this system is going to do is have immutable... immutable document metadata... and then block metadata... and then it's going to show the the block original content of that block... after its conversion to MDAST... whether that be paragraph, a table, a heading... code box, whatever it is... we're going to show the original content. and after that... we are the user is going to be able to define their JSON shape... metadata that it's a user defined metadata that is a lens or overlayed on the content itself so that... the user defined metadata or JSON that the user uploads or uses the wizard on the website the platform to define... and then so the output shape is... the immutable envelope... and then the block immutable data... and then the user defined is where the actual work occurs. So for instance, the user defined metadata which is in the annotation section... I want to change the name to user defined..."

"What I mean to say is that... imagine a long document... a 300 page or a 500 page document... that needs to be edited using Strunk... 18 rules... the elements of style... Now there is no AI that can work on that document by itself... multiple AIs will be necessary to work concurrently... and one of the functionalities that could be possible by... by taking the document and... then chunking them into blocks by paragraphs... after conversion to MDAST... and then having each block... as a row in Postgres... which I've already created on Supabase... each row is equivalent to a block... Now the block can be a paragraph... this is a user defined... it could be one sentence... or a paragraph, or a section, or a chapter... or it could be one page of the original document... that is user defined... Okay? The block unit is user defined... But obviously it has to be derivable deterministically from the metadata that we are able to derive from Docling or whatever... We can't... or we're able to deterministically... derive... even if it's not provided by Docling... if we can deterministically extract that information to provide that option as a means to for the user to... define a unit... a block unit... then that's okay. The immutable... envelope... with the... with all of this that we are talking about... and then the block... immutable data... and then the user defined is where the actual work occurs... So for instance, the user defined metadata... which is in the annotation section... I want to change the name to user defined..."
