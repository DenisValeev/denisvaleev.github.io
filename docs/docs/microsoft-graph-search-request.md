# Microsoft Graph SearchRequest inspection

This note captures the results of scanning the latest `Microsoft.Graph` NuGet package for types related to `SearchRequest`.

## Version scanned

- NuGet index listed version `5.94.0` as the most recent release when the package metadata was fetched.

## Search term coverage

| Search term | Result |
| --- | --- |
| `SearchRequestInner` | Not present in metadata, source, or binaries. |
| `SearchRequestObject` | Not present in metadata, source, or binaries. |
| `SearchRequest` | Present in the compiled assemblies and the generated XML documentation. |

## Located definitions

The package ships an XML documentation file describing the `Microsoft.Graph.Models.SearchRequest` model. Key members include aggregation filters, entity type selection, and serialization helpers:

> ```xml
> <member name="P:Microsoft.Graph.Models.SearchRequest.AggregationFilters">
>   <summary>Contains one or more filters to obtain search results aggregated and filtered to a specific value of a field. Optional.</summary>
> </member>
> <member name="P:Microsoft.Graph.Models.SearchRequest.EntityTypes">
>   <summary>One or more types of resources expected in the response. ... Required.</summary>
> </member>
> <member name="M:Microsoft.Graph.Models.SearchRequest.Serialize(Microsoft.Kiota.Abstractions.Serialization.ISerializationWriter)">
>   <summary>Serializes information the current object</summary>
> </member>
> ```

Request builders also expose `SearchRequest`-related operations. Two notable examples are shipped:

- `Microsoft.Graph.Search.SearchRequestBuilder`, which manages the `searchEntity` singleton and supports `GetAsync`, `PatchAsync`, and query-parameter configuration helpers.
- `Microsoft.Graph.Solutions.BackupRestore.RestorePoints.Search.SearchRequestBuilder`, which targets the backup-restore surface for restore point searches and exposes `PostAsync` plus helper configuration classes.

These entries only reference the `SearchRequest` type—no `SearchRequestInner` or `SearchRequestObject` classes exist in the current package build.
