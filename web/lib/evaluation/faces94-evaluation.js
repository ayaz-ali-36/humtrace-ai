const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const DATASET_VERSION = "faces94-humantrace-100-v1";
const SCORING_VERSION = "faces94-face-only-1";
const SPLITS = ["development", "validation", "final_evaluation"];
const REQUIRED_COLUMNS = [
  "record_id",
  "identity_code",
  "report_type",
  "image_path",
  "split",
  "person_alias",
  "report_date",
  "last_seen_date",
  "last_seen_city",
  "last_seen_country",
  "age_years",
  "gender",
  "synthetic_metadata",
  "visibility",
  "reporter_email",
  "match_group_id",
  "expected_match_record_id"
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error("EVALUATION_CSV_UNTERMINATED_QUOTE");
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    if (row.some((value) => value !== "")) rows.push(row);
  }
  if (rows.length < 2) throw new Error("EVALUATION_CSV_EMPTY");
  const headers = rows[0];
  if (new Set(headers).size !== headers.length) throw new Error("EVALUATION_CSV_DUPLICATE_HEADER");
  return rows.slice(1).map((values, rowIndex) => {
    if (values.length !== headers.length) throw new Error(`EVALUATION_CSV_COLUMN_COUNT_ROW_${rowIndex + 2}`);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function insideRoot(root, candidate) {
  return candidate === root || candidate.startsWith(root + path.sep);
}

function normalizedRecord(row, datasetRoot, imageAbsolutePath, imageHash, imageSizeBytes) {
  return {
    ...row,
    report_type: row.report_type.toLowerCase(),
    type: row.report_type.toUpperCase(),
    age_years: Number(row.age_years),
    synthetic_metadata: row.synthetic_metadata.toLowerCase() === "true",
    dataset_root: datasetRoot,
    image_absolute_path: imageAbsolutePath,
    image_sha256: imageHash,
    image_size_bytes: imageSizeBytes,
    database_report_id: `eval_faces94_${row.record_id.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    database_photo_id: `eval_faces94_photo_${row.record_id.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    public_id: `EVAL-F94-${row.record_id}`
  };
}

async function validateFaces94Dataset(datasetPath) {
  const datasetRoot = path.resolve(datasetPath);
  const csvPath = path.join(datasetRoot, "humantrace_faces94_100.csv");
  const readmePath = path.join(datasetRoot, "README.md");
  const mappingPath = path.join(datasetRoot, "source_mapping_EVALUATION_ONLY.json");
  const [csvText, readme, mappingText] = await Promise.all([
    fs.readFile(csvPath, "utf8"),
    fs.readFile(readmePath, "utf8"),
    fs.readFile(mappingPath, "utf8")
  ]);
  const rawRows = parseCsv(csvText);
  const headers = Object.keys(rawRows[0] || {});
  for (const column of REQUIRED_COLUMNS) assert(headers.includes(column), `EVALUATION_COLUMN_MISSING_${column.toUpperCase()}`);
  assert(rawRows.length === 200, "EVALUATION_EXPECTED_200_RECORDS");
  assert(/real people/i.test(readme) && /evaluation/i.test(readme), "EVALUATION_README_SAFETY_NOTICE_MISSING");

  const mapping = JSON.parse(mappingText);
  assert(Array.isArray(mapping.identities) && mapping.identities.length === 100, "EVALUATION_PROVENANCE_EXPECTED_100_IDENTITIES");
  assert(/do not publish/i.test(String(mapping.warning || "")), "EVALUATION_PROVENANCE_WARNING_MISSING");

  const recordIds = new Set();
  const imageHashes = new Set();
  const identities = new Map();
  const rows = [];
  for (const row of rawRows) {
    assert(row.record_id && !recordIds.has(row.record_id), "EVALUATION_RECORD_ID_DUPLICATE");
    recordIds.add(row.record_id);
    assert(["missing", "unidentified"].includes(row.report_type.toLowerCase()), "EVALUATION_REPORT_TYPE_INVALID");
    assert(SPLITS.includes(row.split), "EVALUATION_SPLIT_INVALID");
    assert(row.synthetic_metadata.toLowerCase() === "true", "EVALUATION_METADATA_MUST_BE_SYNTHETIC");
    assert(row.visibility === "evaluation_only", "EVALUATION_VISIBILITY_MUST_BE_EVALUATION_ONLY");
    assert(row.reporter_email.endsWith("@example.invalid"), "EVALUATION_REPORTER_EMAIL_MUST_BE_NONDELIVERABLE");
    assert(/^\d{4}-\d{2}-\d{2}$/.test(row.report_date) && /^\d{4}-\d{2}-\d{2}$/.test(row.last_seen_date), "EVALUATION_DATE_INVALID");
    assert(Number.isInteger(Number(row.age_years)) && Number(row.age_years) >= 0 && Number(row.age_years) <= 120, "EVALUATION_AGE_INVALID");
    const relativeImagePath = row.image_path.replaceAll("/", path.sep);
    assert(row.image_path.startsWith("images/"), "EVALUATION_IMAGE_PATH_PREFIX_INVALID");
    const imageAbsolutePath = path.resolve(datasetRoot, relativeImagePath);
    assert(insideRoot(datasetRoot, imageAbsolutePath), "EVALUATION_IMAGE_PATH_ESCAPE");
    const imageBytes = await fs.readFile(imageAbsolutePath);
    assert(imageBytes.length > 3 && imageBytes[0] === 0xff && imageBytes[1] === 0xd8 && imageBytes[2] === 0xff, "EVALUATION_IMAGE_NOT_JPEG");
    const imageHash = sha256(imageBytes);
    assert(!imageHashes.has(imageHash), "EVALUATION_IMAGE_CONTENT_DUPLICATE");
    imageHashes.add(imageHash);
    const record = normalizedRecord(row, datasetRoot, imageAbsolutePath, imageHash, imageBytes.length);
    rows.push(record);
    if (!identities.has(row.identity_code)) identities.set(row.identity_code, []);
    identities.get(row.identity_code).push(record);
  }

  assert(identities.size === 100, "EVALUATION_EXPECTED_100_IDENTITIES");
  for (const [identityCode, identityRows] of identities) {
    assert(identityRows.length === 2, `EVALUATION_IDENTITY_PAIR_COUNT_${identityCode}`);
    assert(new Set(identityRows.map((row) => row.report_type)).size === 2, `EVALUATION_IDENTITY_TYPES_${identityCode}`);
    assert(new Set(identityRows.map((row) => row.split)).size === 1, `EVALUATION_IDENTITY_SPLIT_${identityCode}`);
    assert(identityRows.every((row) => row.match_group_id === identityRows[0].match_group_id), `EVALUATION_MATCH_GROUP_${identityCode}`);
    for (const row of identityRows) {
      const expected = identityRows.find((candidate) => candidate.record_id !== row.record_id);
      assert(row.expected_match_record_id === expected.record_id, `EVALUATION_EXPECTED_MATCH_${row.record_id}`);
    }
  }

  const splitIdentityCounts = Object.fromEntries(SPLITS.map((split) => [
    split,
    new Set(rows.filter((row) => row.split === split).map((row) => row.identity_code)).size
  ]));
  assert(splitIdentityCounts.development === 70, "EVALUATION_DEVELOPMENT_EXPECTED_70_IDENTITIES");
  assert(splitIdentityCounts.validation === 15, "EVALUATION_VALIDATION_EXPECTED_15_IDENTITIES");
  assert(splitIdentityCounts.final_evaluation === 15, "EVALUATION_FINAL_EXPECTED_15_IDENTITIES");

  return {
    datasetRoot,
    datasetVersion: DATASET_VERSION,
    rows,
    summary: {
      records: rows.length,
      identities: identities.size,
      images: imageHashes.size,
      missing: rows.filter((row) => row.report_type === "missing").length,
      unidentified: rows.filter((row) => row.report_type === "unidentified").length,
      splitIdentityCounts
    }
  };
}

function cosineSimilarity(source, target) {
  assert(Array.isArray(source) && Array.isArray(target) && source.length === target.length && source.length >= 2, "EVALUATION_VECTOR_DIMENSIONS_INVALID");
  let dot = 0;
  let sourceMagnitude = 0;
  let targetMagnitude = 0;
  for (let index = 0; index < source.length; index += 1) {
    const left = Number(source[index]);
    const right = Number(target[index]);
    assert(Number.isFinite(left) && Number.isFinite(right), "EVALUATION_VECTOR_VALUE_INVALID");
    dot += left * right;
    sourceMagnitude += left * left;
    targetMagnitude += right * right;
  }
  if (!sourceMagnitude || !targetMagnitude) return 0;
  const raw = dot / Math.sqrt(sourceMagnitude * targetMagnitude);
  return Math.max(0, Math.min(1, raw)) * 100;
}

function rankSplit(records, vectorsByRecordId) {
  const pairScores = [];
  const rankings = [];
  for (const source of records) {
    const sourceVector = vectorsByRecordId.get(source.record_id);
    if (!sourceVector) continue;
    const candidates = records
      .filter((candidate) => candidate.record_id !== source.record_id && vectorsByRecordId.has(candidate.record_id))
      .map((candidate) => ({
        source_record_id: source.record_id,
        source_type: source.report_type,
        candidate_record_id: candidate.record_id,
        candidate_type: candidate.report_type,
        identity_match: source.identity_code === candidate.identity_code,
        score: cosineSimilarity(sourceVector, vectorsByRecordId.get(candidate.record_id))
      }))
      .sort((left, right) => right.score - left.score || left.candidate_record_id.localeCompare(right.candidate_record_id));
    candidates.forEach((item, index) => {
      item.rank = index + 1;
      pairScores.push(item);
    });
    const expected = candidates.find((item) => item.candidate_record_id === source.expected_match_record_id);
    rankings.push({
      source_record_id: source.record_id,
      source_type: source.report_type,
      expected_match_record_id: source.expected_match_record_id,
      expected_match_rank: expected?.rank || null,
      expected_match_score: expected?.score ?? null,
      candidate_count: candidates.length,
      searched_missing_collection: candidates.some((item) => item.candidate_type === "missing"),
      searched_unidentified_collection: candidates.some((item) => item.candidate_type === "unidentified"),
      top: candidates.slice(0, 10)
    });
  }
  return { pairScores, rankings };
}

function retrievalMetrics(rankings) {
  const usable = rankings.filter((item) => Number.isInteger(item.expected_match_rank));
  const rateAt = (limit) => usable.length ? usable.filter((item) => item.expected_match_rank <= limit).length / usable.length : 0;
  return {
    evaluatedQueries: usable.length,
    recallAt1: rateAt(1),
    recallAt5: rateAt(5),
    recallAt10: rateAt(10),
    meanReciprocalRank: usable.length ? usable.reduce((sum, item) => sum + 1 / item.expected_match_rank, 0) / usable.length : 0,
    bothCollectionsSearched: usable.every((item) => item.searched_missing_collection && item.searched_unidentified_collection)
  };
}

function classificationMetrics(pairScores, threshold) {
  let truePositive = 0;
  let falsePositive = 0;
  let trueNegative = 0;
  let falseNegative = 0;
  for (const pair of pairScores) {
    const predicted = pair.score >= threshold;
    if (predicted && pair.identity_match) truePositive += 1;
    else if (predicted) falsePositive += 1;
    else if (pair.identity_match) falseNegative += 1;
    else trueNegative += 1;
  }
  const precision = truePositive + falsePositive ? truePositive / (truePositive + falsePositive) : 0;
  const recall = truePositive + falseNegative ? truePositive / (truePositive + falseNegative) : 0;
  const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
  return {
    threshold,
    truePositive,
    falsePositive,
    trueNegative,
    falseNegative,
    precision,
    recall,
    f1,
    falseMatchRate: falsePositive + trueNegative ? falsePositive / (falsePositive + trueNegative) : 0,
    falseNonMatchRate: falseNegative + truePositive ? falseNegative / (falseNegative + truePositive) : 0
  };
}

function chooseDevelopmentThreshold(pairScores) {
  let best = null;
  for (let threshold = 0; threshold <= 100; threshold += 1) {
    const metrics = classificationMetrics(pairScores, threshold);
    if (!best || metrics.f1 > best.f1 || (metrics.f1 === best.f1 && metrics.falsePositive < best.falsePositive) || (metrics.f1 === best.f1 && metrics.falsePositive === best.falsePositive && threshold > best.threshold)) best = metrics;
  }
  return best;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows, headers) {
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\r\n") + "\r\n";
}

module.exports = {
  DATASET_VERSION,
  SCORING_VERSION,
  SPLITS,
  chooseDevelopmentThreshold,
  classificationMetrics,
  cosineSimilarity,
  rankSplit,
  retrievalMetrics,
  toCsv,
  validateFaces94Dataset
};
