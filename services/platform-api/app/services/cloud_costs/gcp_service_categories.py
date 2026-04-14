from __future__ import annotations

from typing import Iterable

OTHER_GCP_SERVICE_CATEGORY = "Other"

_CATEGORY_TO_SERVICES: dict[str, tuple[str, ...]] = {
    "Compute": (
        "App Engine",
        "Bare Metal Solution",
        "Batch",
        "Cloud Functions",
        "Cloud Run",
        "Cloud Run functions",
        "Compute Engine",
        "VMware Engine",
    ),
    "Containers": (
        "Anthos",
        "Google Kubernetes Engine",
        "GKE Enterprise",
    ),
    "Storage": (
        "Backup and DR Service",
        "Cloud Storage",
        "Filestore",
        "NetApp Volumes",
    ),
    "Databases": (
        "AlloyDB for PostgreSQL",
        "Bigtable",
        "Cloud SQL",
        "Cloud Spanner",
        "Database Migration Service",
        "Firestore",
        "Memorystore for Redis",
        "Managed Service for Microsoft Active Directory",
        "Spanner",
    ),
    "Analytics": (
        "BigQuery",
        "Cloud Composer",
        "Cloud Data Fusion",
        "Dataflow",
        "Dataplex",
        "Dataproc",
        "Looker",
        "Managed Service for Apache Spark Metastore",
    ),
    "AI/ML": (
        "AI Platform",
        "AutoML",
        "Document AI",
        "Speech-to-Text",
        "Text-to-Speech",
        "Translation",
        "Vertex AI",
        "Vision AI",
    ),
    "Networking": (
        "Cloud CDN",
        "Cloud DNS",
        "Cloud Interconnect",
        "Cloud Load Balancing",
        "Cloud NAT",
        "Cloud VPN",
        "Network Connectivity Center",
        "Network Intelligence Center",
        "Traffic Director",
        "Virtual Private Cloud",
    ),
    "Security": (
        "Certificate Authority Service",
        "Certificate Manager",
        "Cloud Armor",
        "Cloud Identity",
        "Cloud Identity and Access Management",
        "Identity Platform",
        "Key Management Service",
        "Secret Manager",
        "Security Command Center",
        "Web Security Scanner",
    ),
    "Observability": (
        "Cloud Logging",
        "Cloud Monitoring",
        "Cloud Profiler",
        "Cloud Trace",
        "Error Reporting",
    ),
    "Developer Tools": (
        "Artifact Registry",
        "Cloud Build",
        "Cloud Deploy",
        "Cloud Source Repositories",
        "Container Registry",
        "Firebase",
    ),
    "Integration": (
        "API Gateway",
        "Apigee",
        "Cloud Scheduler",
        "Cloud Tasks",
        "Eventarc",
        "Pub/Sub",
        "Workflows",
    ),
}

GCP_SERVICE_CATEGORY_BY_SERVICE: dict[str, str] = {
    service.casefold(): category
    for category, services in _CATEGORY_TO_SERVICES.items()
    for service in services
}


def iter_gcp_service_category_pairs() -> Iterable[tuple[str, tuple[str, ...]]]:
    return _CATEGORY_TO_SERVICES.items()


def categorize_gcp_service(service: str | None) -> str:
    if service is None:
        return OTHER_GCP_SERVICE_CATEGORY
    normalized = service.strip()
    if not normalized:
        return OTHER_GCP_SERVICE_CATEGORY
    return GCP_SERVICE_CATEGORY_BY_SERVICE.get(
        normalized.casefold(),
        OTHER_GCP_SERVICE_CATEGORY,
    )


def build_gcp_service_category_case_sql(
    service_expression: str = "service.description",
) -> str:
    when_clauses: list[str] = []
    for category, services in iter_gcp_service_category_pairs():
        literals = ", ".join(_quote_casefolded_sql_literal(service) for service in services)
        when_clauses.append(
            f"WHEN LOWER(TRIM(COALESCE({service_expression}, ''))) IN ({literals}) THEN {_quote_sql_literal(category)}"
        )
    return "CASE " + " ".join(when_clauses) + f" ELSE {_quote_sql_literal(OTHER_GCP_SERVICE_CATEGORY)} END"


def _quote_sql_literal(value: str) -> str:
    return "'" + value.strip().replace("'", "''") + "'"


def _quote_casefolded_sql_literal(value: str) -> str:
    return "'" + value.strip().casefold().replace("'", "''") + "'"
