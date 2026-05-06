# MyGenie POS · Menu Import — Dataset Inventory v0.1.0-PROPOSED

**Dataset version:** `v0.1.0-PROPOSED` (NOT frozen)
**Generated:** 2026-05-06T16:49:04+00:00
**Generator:** Phase 0C Dataset Deliverables Reconstruction Agent (read-only)
**Source:** `/app/datasets/menus_raw/v0.1.0-PROPOSED/`
**Method:** filesystem walk + SHA-256 hashing + filename / size heuristics. **No PDF content was parsed.** Tools `pdftotext` / `pdfinfo` are not installed in this environment, so PDF text-layer presence (PDF_TEXT_MENU vs PDF_SCANNED_MENU) cannot be probed; classification confidence is therefore **LOW** for that axis and requires Sunil's review.

> **Disclaimer.** No category, item, rate, or row-level content has been inferred. The reviewer (Sunil) is the sole source of truth for those fields per `MENU_EXPECTED_OUTPUT_TEMPLATE.json` rules.

## 1. Headline counts

| Metric | Value |
|---|---|
| Total files found | **33** |
| Unique by SHA-256 | **32** |
| Duplicates flagged | **1** |
| Accepted (non-duplicate, supported) | **32** |
| File-type distribution | 100% PDF |
| Image files (jpg/png) | **0** |
| Total bytes on disk | 193,690,881 (~193.7 MB) |
| Smallest file | 64,936 bytes |
| Largest file | 42,047,352 bytes |
| 30-menu target met? | **YES** (32 accepted ≥ 30 target per H-3) |

## 2. Per-file inventory

Stable IDs are assigned in deterministic sorted-path order. The duplicate row keeps its own ID and references its origin via `duplicate_of`.

### 2.1 Compact view (one row per file)

| dataset_id | original_file_name | rel_path | size_bytes | sha256 (head) | dup? | classification | OCR diff. | recommended use |
|---|---|---|---:|---|:---:|---|---|---|
| `MENU-v0.1.0-0001` | `Shree Krishna.pdf` | `batch-01/Shree Krishna.pdf` | 2,734,778 | `b34e7d09053aac24…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | medium | Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0002` | `Sushi Cafe_update menu.pdf` | `batch-01/Sushi Cafe_update menu.pdf` | 5,740,261 | `729d3ffb642ebc75…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | medium | Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0003` | `Thirumalai.pdf` | `batch-01/Thirumalai.pdf` | 2,139,745 | `87609792ebbb9e36…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | medium | Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0004` | `tamil.pdf` | `batch-01/tamil.pdf` | 6,480,886 | `09e655c522ad97c7…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | medium | Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0005` | `the-mill-final.pdf` | `batch-01/the-mill-final.pdf` | 13,520,317 | `e4626a5636b14773…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_LARGE | medium-high | Stress Set candidate (large); Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0006` | `Forkfuel Menu.pdf` | `batch-02/Forkfuel Menu.pdf` | 6,410,421 | `dba8ec1a939a652d…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | medium | Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0007` | `Ghatkesar family dhaba.pdf` | `batch-02/Ghatkesar family dhaba.pdf` | 64,936 | `e57e64a2fd9b8c2e…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_TINY | low (small file — likely few pages) | Smoke Set candidate (small, simple-likely); Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0008` | `Green Way 2025.pdf` | `batch-02/Green Way 2025.pdf` | 1,470,440 | `3ee0a2c73ef16c6f…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | low-medium | Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0009` | `Henchu_Cafe_Menu_8th August_14th August.pdf` | `batch-02/Henchu_Cafe_Menu_8th August_14th August.pdf` | 705,477 | `697acd02fb3f5843…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | low-medium | Smoke Set candidate (small, simple-likely); Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0010` | `the Tasty table_update price.pdf` | `batch-02/the Tasty table_update price.pdf` | 3,144,705 | `ca3d9f8649c6a8cb…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | medium | Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0011` | `,,THE SINGHS MANU 2025-3.pdf` | `batch-03/,,THE SINGHS MANU 2025-3.pdf` | 42,047,352 | `9e2b4d938bbfd846…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_LARGE | high (very large file — may be high-DPI scan or many pages) | Stress Set candidate (large); Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0012` | `11 CAFE.pdf` | `batch-03/11 CAFE.pdf` | 6,877,655 | `d02ff705003f9168…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | medium | Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0013` | `Akula Organics.pdf` | `batch-03/Akula Organics.pdf` | 255,378 | `7d4233768d832e69…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_TINY | low (small file — likely few pages) | Smoke Set candidate (small, simple-likely); Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0014` | `Andhra Bhojanam.pdf` | `batch-03/Andhra Bhojanam.pdf` | 1,659,902 | `2cf6b52fecc5ee94…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | low-medium | Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0015` | `annavaya.pdf` | `batch-03/annavaya.pdf` | 2,993,182 | `19f86df1c8bb1d84…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | medium | Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0016` | `M.R SINGH_20250130_160537_0000.pdf` | `batch-04/M.R SINGH_20250130_160537_0000.pdf` | 9,709,848 | `67a08f13eab4c742…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, LIKELY_SCANNED_PDF_HEURISTIC, SIZE_BUCKET_MEDIUM | medium-high | Stress Set candidate (large); Stress Set candidate (likely scanned); Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0017` | `MASALA KITCHEN-MENU-PRICE UPDATE.pdf` | `batch-04/MASALA KITCHEN-MENU-PRICE UPDATE.pdf` | 4,294,195 | `3bc3e2ebd104096a…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | medium | Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0018` | `MD Green Food.pdf` | `batch-04/MD Green Food.pdf` | 5,585,390 | `5e439a4fdbe13b0c…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, SIZE_BUCKET_MEDIUM | medium | Phase 1 Golden candidate |
| `MENU-v0.1.0-0019` | `Madhu-Menu-1.pdf` | `batch-04/Madhu-Menu-1.pdf` | 13,963,346 | `3a7234f05e2382d9…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_LARGE | medium-high | Stress Set candidate (large); Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0020` | `Makhna_menu.pdf` | `batch-04/Makhna_menu.pdf` | 10,314,531 | `b49703c29066d255…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_LARGE | medium-high | Stress Set candidate (large); Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0021` | `Rhino.pdf` | `batch-05/Rhino.pdf` | 3,295,264 | `648cd6ec9d7fef67…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | medium | Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0022` | `simla menu.pdf` | `batch-05/simla menu.pdf` | 505,917 | `1924c405d49a1227…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | low-medium | Smoke Set candidate (small, simple-likely); Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0023` | `sona chadi.pdf` | `batch-05/sona chadi.pdf` | 133,899 | `93e7d0f5c8fe9c22…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_TINY | low (small file — likely few pages) | Smoke Set candidate (small, simple-likely); Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0024` | `south indian dishes.pdf` | `batch-05/south indian dishes.pdf` | 317,191 | `c7f66065388f2848…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_TINY | low (small file — likely few pages) | Smoke Set candidate (small, simple-likely); Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0025` | `spicy.pdf` | `batch-05/spicy.pdf` | 319,522 | `e870f7a8567841e3…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_TINY | low (small file — likely few pages) | Smoke Set candidate (small, simple-likely); Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0026` | `ECOZEN NATURAL RHINO MENU 2024-1.pdf` | `batch-06/ECOZEN NATURAL RHINO MENU 2024-1.pdf` | 441,882 | `7a94fbdb2ec2679e…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_TINY | low (small file — likely few pages) | Smoke Set candidate (small, simple-likely); Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0027` | `fish house.pdf` | `batch-06/fish house.pdf` | 3,050,157 | `17e6b7deea83aeb8…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | medium | Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0028` | `food fusion menu 2025 a3_compressed.pdf` | `batch-06/food fusion menu 2025 a3_compressed.pdf` | 6,157,427 | `1b73392dcad9175e…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | medium | Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0029` | `tribe gate.pdf` | `batch-06/tribe gate.pdf` | 15,893,258 | `6c8f30efc12747cd…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_LARGE | high (very large file — may be high-DPI scan or many pages) | Stress Set candidate (large); Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0030` | `vatika.pdf` | `batch-06/vatika.pdf` | 1,249,259 | `bf8d676d87efe069…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | low-medium | Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0031` | `Makhna_menu.pdf` | `batch-07/Makhna_menu.pdf` | 10,314,531 | `b49703c29066d255…` | 🔁 dup | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_LARGE | medium-high | EXCLUDE (duplicate of batch-04/Makhna_menu.pdf) |
| `MENU-v0.1.0-0032` | `Militia eatery.pdf` | `batch-07/Militia eatery.pdf` | 1,254,235 | `bf8fc083561a862f…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | low-medium | Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian) |
| `MENU-v0.1.0-0033` | `menu tandoori lab [Recovered] copy.pdf` | `batch-07/menu tandoori lab [Recovered] copy.pdf` | 10,645,594 | `235a7a67daaec675…` | — | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, LIKELY_SCANNED_PDF_HEURISTIC, SIZE_BUCKET_LARGE | medium-high | Stress Set candidate (large); Stress Set candidate (likely scanned); Learning Memory Set candidate (regional Indian) |

### 2.2 Detailed records

```
dataset_id:        MENU-v0.1.0-0001
original_file_name:Shree Krishna.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-01/Shree Krishna.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        2,734,778
sha256:            b34e7d09053aac2455efd004a0bbb78a8e445203a90c2de8a7ba7ace376f54d8
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_SMALL']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium
recommended_use:   Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0002
original_file_name:Sushi Cafe_update menu.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-01/Sushi Cafe_update menu.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        5,740,261
sha256:            729d3ffb642ebc75d18b9ff7266cefaf7a43b80f79421176edbe9a2f812f3f9d
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_MEDIUM']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium
recommended_use:   Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0003
original_file_name:Thirumalai.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-01/Thirumalai.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        2,139,745
sha256:            87609792ebbb9e365b079bcf5f7c83e41e022dccb1b2cc237891a3d9fd60b157
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_SMALL']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium
recommended_use:   Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0004
original_file_name:tamil.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-01/tamil.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        6,480,886
sha256:            09e655c522ad97c7bc072a602eba9397077a6174aafe9f9a2e14555d7993d2a7
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_MEDIUM']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium
recommended_use:   Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0005
original_file_name:the-mill-final.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-01/the-mill-final.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        13,520,317
sha256:            e4626a5636b14773de2af1d8a3ece6823cd1c54ffa1f9e5e510e6faa481d1e5d
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_LARGE']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium-high
recommended_use:   Stress Set candidate (large); Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0006
original_file_name:Forkfuel Menu.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-02/Forkfuel Menu.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        6,410,421
sha256:            dba8ec1a939a652dcfe90cbc49ac7c95a967ce1a9447a861d7ea49ae4e00dd57
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_MEDIUM']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium
recommended_use:   Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0007
original_file_name:Ghatkesar family dhaba.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-02/Ghatkesar family dhaba.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        64,936
sha256:            e57e64a2fd9b8c2e69774eef7011aef78baef1f29189210e9e4d25f9200831a6
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_TINY']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    low (small file — likely few pages)
recommended_use:   Smoke Set candidate (small, simple-likely); Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0008
original_file_name:Green Way 2025.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-02/Green Way 2025.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        1,470,440
sha256:            3ee0a2c73ef16c6f933806348d67a0eb5bffeb42723fd7f9583f5905f9e03f83
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_SMALL']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    low-medium
recommended_use:   Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0009
original_file_name:Henchu_Cafe_Menu_8th August_14th August.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-02/Henchu_Cafe_Menu_8th August_14th August.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        705,477
sha256:            697acd02fb3f584321f309d4dc008459310a0e131c0d760d688bc835cd93c29b
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_SMALL']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    low-medium
recommended_use:   Smoke Set candidate (small, simple-likely); Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0010
original_file_name:the Tasty table_update price.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-02/the Tasty table_update price.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        3,144,705
sha256:            ca3d9f8649c6a8cb0d2f282f64d4f9ff0c1903d8123f160e9173ded6258b34fa
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_MEDIUM']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium
recommended_use:   Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0011
original_file_name:,,THE SINGHS MANU 2025-3.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-03/,,THE SINGHS MANU 2025-3.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        42,047,352
sha256:            9e2b4d938bbfd846b855efc90afd380e3304bb798e41d703bde04e491cf50cdc
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_LARGE']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    high (very large file — may be high-DPI scan or many pages)
recommended_use:   Stress Set candidate (large); Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0012
original_file_name:11 CAFE.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-03/11 CAFE.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        6,877,655
sha256:            d02ff705003f91680a87526faf827f5575f65236bc74a3a450df7981a3b03113
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_MEDIUM']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium
recommended_use:   Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0013
original_file_name:Akula Organics.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-03/Akula Organics.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        255,378
sha256:            7d4233768d832e696ec6800f9b0827fa3b7de0630e3ffe9b6d0ef024929a5d90
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_TINY']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    low (small file — likely few pages)
recommended_use:   Smoke Set candidate (small, simple-likely); Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0014
original_file_name:Andhra Bhojanam.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-03/Andhra Bhojanam.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        1,659,902
sha256:            2cf6b52fecc5ee94bc8450dc53f05ab2014b90d1adb9b7e33746a37d23e91b35
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_SMALL']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    low-medium
recommended_use:   Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0015
original_file_name:annavaya.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-03/annavaya.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        2,993,182
sha256:            19f86df1c8bb1d8440830b906e6762c99c4ea803981aa51594e530fc20d53d92
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_SMALL']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium
recommended_use:   Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0016
original_file_name:M.R SINGH_20250130_160537_0000.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-04/M.R SINGH_20250130_160537_0000.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        9,709,848
sha256:            67a08f13eab4c742a1730da380957cc76fd741bef6fa9a64957bce688c304d82
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'LIKELY_SCANNED_PDF_HEURISTIC', 'SIZE_BUCKET_MEDIUM']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium-high
recommended_use:   Stress Set candidate (large); Stress Set candidate (likely scanned); Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0017
original_file_name:MASALA KITCHEN-MENU-PRICE UPDATE.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-04/MASALA KITCHEN-MENU-PRICE UPDATE.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        4,294,195
sha256:            3bc3e2ebd104096a28250227c06b01e7bf630d0e03099daf75570d074a3470d7
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_MEDIUM']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium
recommended_use:   Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0018
original_file_name:MD Green Food.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-04/MD Green Food.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        5,585,390
sha256:            5e439a4fdbe13b0c807da4967f27659fbd7a4b2933471abf422dbe20a41f93ce
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'SIZE_BUCKET_MEDIUM']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium
recommended_use:   Phase 1 Golden candidate
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0019
original_file_name:Madhu-Menu-1.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-04/Madhu-Menu-1.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        13,963,346
sha256:            3a7234f05e2382d912d5389506947fba8fffa71c4ade32feb63c674b30f284ea
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_LARGE']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium-high
recommended_use:   Stress Set candidate (large); Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0020
original_file_name:Makhna_menu.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-04/Makhna_menu.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        10,314,531
sha256:            b49703c29066d255d69dfcfd0f3acb1db0abcb9e210acf93c6d9ffa7890f1006
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_LARGE']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium-high
recommended_use:   Stress Set candidate (large); Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0021
original_file_name:Rhino.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-05/Rhino.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        3,295,264
sha256:            648cd6ec9d7fef67a87b387ce92a91d183e891427ad82169d29c5ccbb2067759
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_MEDIUM']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium
recommended_use:   Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0022
original_file_name:simla menu.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-05/simla menu.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        505,917
sha256:            1924c405d49a12278ab28180608c73900ab869c78e94d41858f2181266649539
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_SMALL']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    low-medium
recommended_use:   Smoke Set candidate (small, simple-likely); Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0023
original_file_name:sona chadi.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-05/sona chadi.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        133,899
sha256:            93e7d0f5c8fe9c2280e6cc5af292dbfd63eb68ecd544a369367af2c4d8bdf09f
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_TINY']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    low (small file — likely few pages)
recommended_use:   Smoke Set candidate (small, simple-likely); Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0024
original_file_name:south indian dishes.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-05/south indian dishes.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        317,191
sha256:            c7f66065388f2848ed4fa8f7ceee35083dd42f0418af30acd64f4b9a09162a27
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_TINY']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    low (small file — likely few pages)
recommended_use:   Smoke Set candidate (small, simple-likely); Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0025
original_file_name:spicy.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-05/spicy.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        319,522
sha256:            e870f7a8567841e3d0cc52f7805b3826df582dc4b002e15ff17068ffd6ff0be8
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_TINY']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    low (small file — likely few pages)
recommended_use:   Smoke Set candidate (small, simple-likely); Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0026
original_file_name:ECOZEN NATURAL RHINO MENU 2024-1.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-06/ECOZEN NATURAL RHINO MENU 2024-1.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        441,882
sha256:            7a94fbdb2ec2679ec22da4fff6a243c986744f69213c4819a907e6ee1c6f4827
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_TINY']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    low (small file — likely few pages)
recommended_use:   Smoke Set candidate (small, simple-likely); Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0027
original_file_name:fish house.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-06/fish house.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        3,050,157
sha256:            17e6b7deea83aeb8163c79c8f1aa387a659385209bc0b5b39fecf1a3a1cd4bfb
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_MEDIUM']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium
recommended_use:   Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0028
original_file_name:food fusion menu 2025 a3_compressed.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-06/food fusion menu 2025 a3_compressed.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        6,157,427
sha256:            1b73392dcad9175ec1eb92113f62053fab11de1c24928ebae9c5a94e2961599a
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_MEDIUM']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium
recommended_use:   Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0029
original_file_name:tribe gate.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-06/tribe gate.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        15,893,258
sha256:            6c8f30efc12747cde5cce803e85fa6c114b56a3859d61c409eec0f55df6bc4a0
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_LARGE']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    high (very large file — may be high-DPI scan or many pages)
recommended_use:   Stress Set candidate (large); Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0030
original_file_name:vatika.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-06/vatika.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        1,249,259
sha256:            bf8d676d87efe06960cc73586cc63b45d52aea6f1b241b9c4feb59892d21d6eb
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_SMALL']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    low-medium
recommended_use:   Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0031
original_file_name:Makhna_menu.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-07/Makhna_menu.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        10,314,531
sha256:            b49703c29066d255d69dfcfd0f3acb1db0abcb9e210acf93c6d9ffa7890f1006
supported:         true
duplicate:         true
duplicate_of:      batch-04/Makhna_menu.pdf
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_LARGE']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium-high
recommended_use:   EXCLUDE (duplicate of batch-04/Makhna_menu.pdf)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0032
original_file_name:Militia eatery.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-07/Militia eatery.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        1,254,235
sha256:            bf8fc083561a862fec65396168a2f51f65990c8b96e5ee2452a26fdad955538a
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'SIZE_BUCKET_SMALL']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    low-medium
recommended_use:   Phase 1 Golden candidate; Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

dataset_id:        MENU-v0.1.0-0033
original_file_name:menu tandoori lab [Recovered] copy.pdf
rel_path:          datasets/menus_raw/v0.1.0-PROPOSED/batch-07/menu tandoori lab [Recovered] copy.pdf
file_type:         pdf
mime_type:         application/pdf
size_bytes:        10,645,594
sha256:            235a7a67daaec675157ccc7b36c7a119c779a85623ecb6f81d4e5244e4c9947b
supported:         true
duplicate:         false
classification:    ['PDF_TEXT_OR_SCANNED_UNKNOWN', 'REGIONAL_INDIAN_MENU', 'LIKELY_SCANNED_PDF_HEURISTIC', 'SIZE_BUCKET_LARGE']
quality:           unknown (cannot probe without text-layer tools or extraction)
ocr_difficulty:    medium-high
recommended_use:   Stress Set candidate (large); Stress Set candidate (likely scanned); Learning Memory Set candidate (regional Indian)
notes:             classification confidence LOW for SIMPLE/MEDIUM/COMPLEX axis (cannot probe text layer); REGIONAL_INDIAN_MENU inferred from filename only; awaiting Sunil's confirmation.

```

## 3. Duplicate report

| Duplicate dataset_id | Of original | SHA-256 | Action |
|---|---|---|---|
| `MENU-v0.1.0-0031` (batch-07/Makhna_menu.pdf) | `MENU-v0.1.0-0020` (batch-04/Makhna_menu.pdf) | `b49703c29066d255d69dfcfd0f3acb1db0abcb9e210acf93c6d9ffa7890f1006` | Mark `duplicate=true`. Do **not** delete. Excluded from accepted-set counts. |

## 4. Classification confidence

| Axis | Confidence | Source |
|---|---|---|
| `file_type` / `mime_type` | HIGH | filesystem extension + magic-byte assumption (all .pdf) |
| `size_bytes` / `sha256` | HIGH | direct measurement |
| `supported` | HIGH | PDF is in `MENU_DATASET_ALLOWED_MIME_TYPES` default per ingestion spec |
| `duplicate` | HIGH | SHA-256 collision detection |
| `REGIONAL_INDIAN_MENU` | MEDIUM | filename hint match (deterministic regex) |
| `TAX_NOTE_MENU` | MEDIUM (no hits) | filename hint match (no `gst|tax|vat` token found) |
| `LIKELY_SCANNED_PDF_HEURISTIC` | LOW | filename pattern (timestamps, `Recovered`, `copy`) — Sunil to confirm |
| `PDF_TEXT_MENU` vs `PDF_SCANNED_MENU` | **NOT MEASURED** | requires `pdftotext` (not installed) — Sunil or a follow-up agent must determine |
| `SIMPLE` / `MEDIUM` / `COMPLEX` | LOW | size buckets only (TINY < 500 KB, SMALL < 3 MB, MEDIUM < 10 MB, LARGE ≥ 10 MB) |
| `VARIANT_MENU` / `ADDON_MENU` | NONE (cannot infer) | requires reading file content |
| `quality` (page clarity) | NONE | requires reading file content |

## 5. What's NOT in this inventory (gap log)

- ❌ **Page counts** — `pdfinfo` is not available in this env.
- ❌ **Text-layer detection** — `pdftotext` is not available; cannot distinguish PDF_TEXT vs PDF_SCANNED.
- ❌ **Item / category / rate rows** — explicitly out of scope for this agent. Only the human reviewer fills them via `MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json`.
- ❌ **Coverage of image-format menus** — there are zero `image/jpeg` or `image/png` files in this dataset. Image-set classifications (`IMAGE_CLEAR_MENU`, `IMAGE_POOR_QUALITY_MENU`) are **not represented** in v0.1.0. Coverage deferred to **v0.1.1** unless owner directs otherwise.
- ❌ **Drive metadata** — H-1/H-2 deferred (zip-via-chat path); `drive_file_id` and `modifiedTime` are unavailable. The manifest fields `drive_file_id` and `modifiedTime` are recorded as `null` for v0.1.0.

## 6. Status

| Field | Value |
|---|---|
| `dataset_version` | `v0.1.0-PROPOSED` |
| `frozen_at` | `null` |
| `human_review_status` | `HUMAN_REVIEW_REQUIRED` |
| Reviewer | **Sunil** (primary) |
| Second reviewer | **PENDING NOMINATION** (not waived) |
| Inventory written by | Phase 0C Dataset Deliverables Reconstruction Agent |

— END —