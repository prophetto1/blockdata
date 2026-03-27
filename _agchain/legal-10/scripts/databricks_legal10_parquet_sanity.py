# Databricks notebook source
# COMMAND ----------
# Legal-10 Parquet sanity check + starter exploration.
#
# Data location (uploaded):
#   dbfs:/Volumes/workspace/default/legal10_parquet/2026-02-05_095022_duckdb_export/

base = "dbfs:/Volumes/workspace/default/legal10_parquet/2026-02-05_095022_duckdb_export"

# COMMAND ----------
print("Tables (first 20):")
display(dbutils.fs.ls(base + "/tables")[:20])

print("Views (first 20):")
display(dbutils.fs.ls(base + "/views")[:20])

# COMMAND ----------
# Read one known table and show schema + row count
scdb_path = base + "/tables/main.scdb_cases.parquet"
scdb = spark.read.parquet(scdb_path)
scdb.printSchema()
print("scdb_cases rows:", scdb.count())
display(scdb.limit(20))

# COMMAND ----------
# Register every parquet file under tables/ and views/ as a temp view
import re

def safe_view_name(filename: str) -> str:
    name = filename.removesuffix(".parquet").replace("main.", "")
    name = re.sub(r"[^A-Za-z0-9_]", "_", name)
    return f"legal10_{name}"

for folder in ["tables", "views"]:
    for f in dbutils.fs.ls(f"{base}/{folder}"):
        if f.path.endswith(".parquet"):
            spark.read.parquet(f.path).createOrReplaceTempView(safe_view_name(f.name))

print("Created temp views. Example query:")
display(spark.sql("SELECT count(*) AS n FROM legal10_scdb_cases"))

# COMMAND ----------
# Example SQL exploration (edit as needed)
display(spark.sql("""
SELECT term, count(*) AS cases
FROM legal10_scdb_cases
GROUP BY term
ORDER BY term DESC
LIMIT 20
"""))

