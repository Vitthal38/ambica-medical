"""
Import medicines_500.csv into src/data/medicines.json using the taxonomy
defined in src/lib/taxonomy.ts.

The Python mapping table below is a direct mirror of PHARMA_CLASS_MAP in
taxonomy.ts. Keep them in sync — when you add a new pharmacology class to
taxonomy.ts, also add it here.

Run:
    python scripts/import_medicines.py
"""

from __future__ import annotations

import csv
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "medicines_500.csv"
OUT_PATH = ROOT / "src" / "data" / "medicines.json"
CURATED_PATH = ROOT / "src" / "data" / "products.json"


# ---------------------------------------------------------------------------
# Dedupe helpers
# ---------------------------------------------------------------------------

def _norm_strength(s: str) -> str:
    """Normalize '500mg' / '500 mg' / '500 MG' → '500mg'."""
    return re.sub(r"\s+", "", (s or "").lower())


def load_curated_fingerprints() -> set[tuple[str, str, str]]:
    """Return set of (brand, generic_first_word, normalized_strength) tuples
    for every curated product. CSV rows matching any of these are skipped so
    the catalog doesn't show two cards for, e.g. Crocin Paracetamol 500mg."""
    if not CURATED_PATH.exists():
        return set()
    out: set[tuple[str, str, str]] = set()
    with CURATED_PATH.open(encoding="utf-8") as f:
        for prod in json.load(f):
            brand = prod.get("brand", "").strip().lower()
            # name is "Paracetamol 500mg" → first word "paracetamol"
            name_first = (prod.get("name", "").split() or [""])[0].lower()
            dose = _norm_strength(prod.get("dosage", ""))
            if brand and name_first:
                out.add((brand, name_first, dose))
    return out


def csv_fingerprint(row: dict) -> tuple[str, str, str]:
    brand = row["brand_examples"].split(";")[0].strip().lower()
    generic_first = (row["generic_name"].split() or [""])[0].lower()
    dose = _norm_strength(row.get("strength", ""))
    return (brand, generic_first, dose)


def csv_internal_key(row: dict) -> tuple[str, str, str, str]:
    """Used to dedupe rows that are identical SKUs within the CSV itself."""
    brand = row["brand_examples"].split(";")[0].strip().lower()
    generic = row["generic_name"].strip().lower()
    dose = _norm_strength(row.get("strength", ""))
    form = row.get("dosage_form", "").strip().lower()
    return (brand, generic, dose, form)

# ---------------------------------------------------------------------------
# 1. Pharma → User mapping (mirror of src/lib/taxonomy.ts PHARMA_CLASS_MAP)
# ---------------------------------------------------------------------------

# Each tuple is (user_category, subcategory, internal_class, conditions, rx)
PHARMA_MAP: dict[str, tuple[str, str, str, list[str], bool]] = {
    # PAIN
    "Analgesic":                       ("fever-and-pain-relief", "body-pain",            "Analgesic",       ["pain", "body-pain"],                                              False),
    "Analgesic / Anti-inflammatory":   ("fever-and-pain-relief", "body-pain",            "NSAID",           ["pain", "inflammation", "body-pain", "sprain"],                    False),
    "Analgesic / Antipyretic":         ("fever-and-pain-relief", "fever-reducers",       "Antipyretic",     ["fever", "headache", "body-pain"],                                 False),
    "Opioid analgesic":                ("fever-and-pain-relief", "severe-pain",          "Opioid",          ["severe-pain", "post-surgery-pain"],                               True),
    "Topical analgesic":               ("fever-and-pain-relief", "topical-pain-relief",  "Topical Analgesic",["sprain", "muscle-pain", "back-pain"],                            False),
    "Antimigraine":                    ("fever-and-pain-relief", "headache-and-migraine","Triptan",         ["migraine", "severe-headache"],                                    True),
    "Migraine prophylaxis":            ("fever-and-pain-relief", "headache-and-migraine","Migraine Prophylaxis", ["migraine", "migraine-prevention"],                          True),
    # COLD/COUGH
    "Mucolytic":                       ("cold-cough-and-flu",    "cough-syrups",         "Mucolytic",       ["cough", "phlegm", "congestion"],                                  False),
    "Decongestant":                    ("cold-cough-and-flu",    "decongestants",        "Decongestant",    ["nasal-congestion", "blocked-nose", "cold"],                       False),
    "Cough":                           ("cold-cough-and-flu",    "cough-syrups",         "Cough Suppressant",["cough", "dry-cough"],                                            False),
    "Cough / Cold":                    ("cold-cough-and-flu",    "cold-and-flu",         "Cough-Cold Combo",["cough", "cold", "sore-throat"],                                   False),
    "Cold / Flu":                      ("cold-cough-and-flu",    "cold-and-flu",         "Cold-Flu Combo",  ["cold", "flu", "runny-nose"],                                      False),
    # ALLERGY
    "Antihistamine":                   ("allergy-relief",        "antihistamines",       "Antihistamine",   ["allergy", "sneezing", "runny-nose", "itching", "hives", "hay-fever"], False),
    # DIGESTIVE
    "Antacid":                         ("digestive-care",        "acidity-and-ulcer",    "Antacid",         ["acidity", "heartburn", "gas"],                                    False),
    "Anti-ulcer":                      ("digestive-care",        "acidity-and-ulcer",    "PPI",             ["acidity", "gerd", "stomach-ulcer", "heartburn"],                  False),
    "Antiemetic":                      ("digestive-care",        "nausea-and-vomiting",  "Antiemetic",      ["nausea", "vomiting", "motion-sickness"],                          False),
    "Antispasmodic":                   ("digestive-care",        "stomach-cramps",       "Antispasmodic",   ["stomach-cramps", "period-cramps", "ibs"],                         False),
    "Antidiarrheal":                   ("digestive-care",        "diarrhea",             "Antidiarrheal",   ["diarrhea", "loose-motion"],                                       False),
    "Laxative":                        ("digestive-care",        "constipation",         "Laxative",        ["constipation"],                                                   False),
    "Prokinetic":                      ("digestive-care",        "acidity-and-ulcer",    "Prokinetic",      ["gerd", "bloating", "slow-digestion"],                             False),
    "Hepatoprotective":                ("digestive-care",        "liver-and-gut-health", "Hepatoprotective",["liver-health", "fatty-liver", "hepatitis"],                       False),
    "Probiotic":                       ("digestive-care",        "liver-and-gut-health", "Probiotic",       ["gut-health", "diarrhea-prevention", "antibiotic-recovery"],       False),
    "GI anti-inflammatory":            ("digestive-care",        "liver-and-gut-health", "GI Anti-inflammatory", ["ulcerative-colitis", "crohns", "ibd"],                       True),
    # HEART & BP
    "Antihypertensive":                ("heart-and-bp",          "blood-pressure",       "Antihypertensive",["high-blood-pressure", "hypertension"],                            True),
    "Antihypertensive / Antianginal":  ("heart-and-bp",          "blood-pressure",       "CCB / Beta-blocker", ["high-blood-pressure", "angina", "chest-pain"],                 True),
    "Antihypertensive / Diuretic":     ("heart-and-bp",          "blood-pressure",       "BP + Diuretic",   ["high-blood-pressure", "water-retention"],                         True),
    "Antianginal":                     ("heart-and-bp",          "angina",               "Antianginal",     ["angina", "chest-pain"],                                           True),
    "Antiarrhythmic":                  ("heart-and-bp",          "heart-rhythm",         "Antiarrhythmic",  ["arrhythmia", "irregular-heartbeat"],                              True),
    "Anticoagulant":                   ("heart-and-bp",          "blood-thinners",       "Anticoagulant",   ["blood-clot", "dvt", "stroke-prevention"],                         True),
    "Antiplatelet":                    ("heart-and-bp",          "blood-thinners",       "Antiplatelet",    ["stroke-prevention", "heart-attack-prevention"],                   True),
    "Antihyperlipidemic":              ("heart-and-bp",          "cholesterol",          "Statin",          ["high-cholesterol", "ldl", "triglycerides"],                       True),
    "Diuretic":                        ("heart-and-bp",          "water-retention",      "Diuretic",        ["water-retention", "edema", "high-blood-pressure"],                True),
    "Pulmonary hypertension":          ("heart-and-bp",          "blood-pressure",       "PAH Therapy",     ["pulmonary-hypertension"],                                         True),
    # DIABETES
    "Antidiabetic":                    ("diabetes-care",         "oral-tablets",         "Antidiabetic",    ["diabetes", "type-2-diabetes", "blood-sugar"],                     True),
    # BONE / JOINT / MUSCLE
    "Muscle relaxant":                 ("bone-joint-and-muscle", "muscle-relaxants",     "Muscle Relaxant", ["muscle-spasm", "back-pain", "stiff-neck"],                        False),
    "Antirheumatic":                   ("bone-joint-and-muscle", "arthritis-and-rheumatism", "DMARD",       ["rheumatoid-arthritis", "arthritis"],                              True),
    "Antigout":                        ("bone-joint-and-muscle", "gout",                 "Antigout",        ["gout", "high-uric-acid"],                                         True),
    "Immunosuppressant":               ("bone-joint-and-muscle", "inflammation",         "Immunosuppressant", ["autoimmune", "transplant-rejection"],                          True),
    "Corticosteroid":                  ("bone-joint-and-muscle", "inflammation",         "Corticosteroid",  ["inflammation", "autoimmune", "severe-allergy", "asthma-flare"],   True),
    "Neuropathic pain":                ("bone-joint-and-muscle", "nerve-pain",           "Neuropathic Pain",["nerve-pain", "diabetic-neuropathy"],                              True),
    "Anticonvulsant / Neuropathic pain": ("bone-joint-and-muscle", "nerve-pain",         "Gabapentinoid",   ["nerve-pain", "neuropathy", "seizures"],                           True),
    # SKIN
    "Topical antibiotic":              ("skin-care",             "antibacterial-creams", "Topical Antibiotic", ["skin-infection", "wound-infection"],                          False),
    "Topical steroid":                 ("skin-care",             "steroid-creams",       "Topical Steroid", ["eczema", "dermatitis", "itching", "psoriasis"],                  False),
    "Topical anti-acne":               ("skin-care",             "acne-treatment",       "Topical Acne",    ["acne", "pimples"],                                                False),
    "Antiscabies":                     ("skin-care",             "parasite-treatment",   "Antiscabies",     ["scabies", "lice", "itching"],                                     False),
    # EYE & EAR
    "Ophthalmic":                      ("eye-and-ear-care",      "eye-drops",            "Ophthalmic",      ["red-eye", "dry-eye", "eye-allergy", "eye-infection"],             False),
    "Otic":                            ("eye-and-ear-care",      "ear-drops",            "Otic",            ["ear-pain", "ear-infection", "ear-wax"],                           False),
    # RESPIRATORY
    "Anti-asthmatic":                  ("respiratory-and-asthma","asthma-and-copd",      "Bronchodilator",  ["asthma", "wheezing", "breathing-difficulty", "copd"],             True),
    # MENTAL
    "Antipsychotic":                   ("mental-wellness",       "serious-mental-illness", "Antipsychotic",["schizophrenia", "bipolar", "psychosis"],                          True),
    "Antidepressant":                  ("mental-wellness",       "depression",           "SSRI / SNRI",     ["depression", "low-mood", "anxiety"],                              True),
    "Anxiolytic":                      ("mental-wellness",       "anxiety",              "Benzodiazepine",  ["anxiety", "stress", "panic-attack"],                              True),
    "Anxiolytic / Anticonvulsant":     ("mental-wellness",       "anxiety",              "Benzodiazepine",  ["anxiety", "seizures"],                                            True),
    "Anticonvulsant":                  ("mental-wellness",       "epilepsy",             "Anticonvulsant",  ["epilepsy", "seizures"],                                           True),
    "Antiparkinsonian":                ("mental-wellness",       "parkinson-and-dementia","Antiparkinsonian",["parkinson", "tremor"],                                          True),
    "Anti-dementia":                   ("mental-wellness",       "parkinson-and-dementia","Anti-dementia",   ["dementia", "alzheimer"],                                         True),
    "Antivertigo":                     ("mental-wellness",       "vertigo-and-dizziness","Antivertigo",     ["vertigo", "dizziness", "motion-sickness"],                        False),
    # WOMEN'S
    "Contraceptive":                   ("womens-health",         "contraception",        "Contraceptive",   ["birth-control", "contraception"],                                 True),
    "Sex hormone":                     ("womens-health",         "hormonal-health",      "Sex Hormone",     ["hormone-replacement", "menopause"],                               True),
    "Anti-estrogen":                   ("womens-health",         "breast-cancer",        "Anti-estrogen",   ["breast-cancer"],                                                  True),
    "Antithyroid":                     ("womens-health",         "thyroid",              "Antithyroid",     ["hyperthyroidism", "thyroid"],                                     True),
    "Urology":                         ("womens-health",         "urinary-care",         "Urology",         ["overactive-bladder", "urinary-issues", "enlarged-prostate"],     True),
    # INFECTION
    "Antibiotic":                      ("infection-care",        "antibiotics",          "Antibiotic",      ["bacterial-infection", "infection"],                               True),
    "Antibiotic / Antiprotozoal":      ("infection-care",        "antibiotics",          "Antibiotic + Antiprotozoal", ["bacterial-infection", "amoebiasis", "giardiasis"],    True),
    "Antiviral":                       ("infection-care",        "antivirals",           "Antiviral",       ["viral-infection", "hiv", "herpes", "hepatitis"],                  True),
    "Antifungal":                      ("infection-care",        "antifungals",          "Antifungal",      ["fungal-infection", "ringworm", "candidiasis"],                    True),
    "Anti-tubercular":                 ("infection-care",        "tuberculosis",         "Anti-TB",         ["tuberculosis", "tb"],                                             True),
    "Antimalarial":                    ("infection-care",        "malaria-and-parasites","Antimalarial",    ["malaria"],                                                        True),
    "Anthelmintic":                    ("infection-care",        "malaria-and-parasites","Anthelmintic",    ["intestinal-worms", "deworming"],                                  False),
    "Anti-cancer":                     ("infection-care",        "anti-cancer",          "Anti-cancer",     ["cancer"],                                                         True),
    "Anti-cancer / Immunosuppressant": ("infection-care",        "anti-cancer",          "Anti-cancer / Immunosuppressant", ["cancer", "autoimmune"],                          True),
    "Vaccine":                         ("infection-care",        "vaccines",             "Vaccine",         ["immunization", "prevention"],                                     True),
    "IV fluid":                        ("infection-care",        "iv-fluids",            "IV Fluid",        ["dehydration", "fluid-replacement"],                               True),
    # VITAMINS
    "Vitamin":                         ("vitamins-and-supplements","multivitamins",      "Vitamin",         ["nutrition", "deficiency", "immunity"],                            False),
    "Mineral":                         ("vitamins-and-supplements","minerals",           "Mineral",         ["nutrition", "deficiency"],                                        False),
    "Vitamin / Mineral":               ("vitamins-and-supplements","multivitamins",      "Multivitamin",    ["nutrition", "deficiency", "energy"],                              False),
    # FIRST AID
    "Antiseptic":                      ("first-aid-and-personal-care", "antiseptics",    "Antiseptic",      ["cuts", "wounds", "disinfection"],                                 False),
    "Adsorbent":                       ("first-aid-and-personal-care", "emergency",      "Adsorbent",       ["poisoning", "gas", "overdose"],                                   False),
    "Hemostatic":                      ("first-aid-and-personal-care", "wound-care",     "Hemostatic",      ["bleeding", "wound-care"],                                         True),

    # --- Long tail (1-2 items each) ----------------------------------------
    "Thyroid":                         ("womens-health",         "thyroid",              "Thyroid Hormone", ["hypothyroidism", "thyroid"],                                      True),
    "Topical retinoid":                ("skin-care",             "acne-treatment",       "Topical Retinoid",["acne", "wrinkles", "anti-aging"],                                 False),
    "Analgesic / Antiplatelet":        ("heart-and-bp",          "blood-thinners",       "Aspirin",         ["pain", "stroke-prevention", "heart-attack-prevention"],           False),
    "Anorectal":                       ("digestive-care",        "constipation",         "Anorectal",       ["piles", "haemorrhoids", "anal-fissure"],                          False),
    "Anti-COPD":                       ("respiratory-and-asthma","asthma-and-copd",      "Anti-COPD",       ["copd", "breathing-difficulty"],                                   True),
    "Antibiotic combination":          ("infection-care",        "antibiotics",          "Antibiotic Combo",["bacterial-infection", "infection"],                               True),
    "Antidote":                        ("first-aid-and-personal-care", "emergency",      "Antidote",        ["poisoning", "overdose", "emergency"],                             True),
    "Antidote / Cardiac":              ("heart-and-bp",          "heart-rhythm",         "Cardiac Antidote",["overdose", "cardiac-emergency"],                                  True),
    "Antidote / Mucolytic":            ("first-aid-and-personal-care", "emergency",      "Antidote",        ["paracetamol-overdose", "poisoning"],                              True),
    "Antilice":                        ("skin-care",             "parasite-treatment",   "Antilice",        ["lice", "head-lice"],                                              False),
    "Antiplatelet + Antihyperlipidemic": ("heart-and-bp",        "blood-thinners",       "Combo Heart Med", ["stroke-prevention", "high-cholesterol"],                          True),
    "Antirheumatic / GI":              ("bone-joint-and-muscle", "arthritis-and-rheumatism", "DMARD",       ["rheumatoid-arthritis", "ulcerative-colitis"],                     True),
    "Antiscabies / Antilice":          ("skin-care",             "parasite-treatment",   "Antiparasitic",   ["scabies", "lice", "itching"],                                     False),
    "Antivertigo / Antiemetic":        ("mental-wellness",       "vertigo-and-dizziness","Antivertigo",     ["vertigo", "nausea", "motion-sickness"],                           False),
    "CNS stimulant":                   ("mental-wellness",       "depression",           "CNS Stimulant",   ["adhd", "narcolepsy"],                                             True),
    "Cardiac glycoside":               ("heart-and-bp",          "heart-rhythm",         "Cardiac Glycoside",["heart-failure", "arrhythmia"],                                   True),
    "Dermatology":                     ("skin-care",             "antifungal-creams",    "Dermatology",     ["skin-condition"],                                                 False),
    "Electrolyte":                     ("digestive-care",        "diarrhea",             "Electrolyte",     ["dehydration", "loose-motion"],                                    False),
    "Emergency":                       ("first-aid-and-personal-care", "emergency",      "Emergency",       ["emergency", "first-aid"],                                         True),
    "Expectorant":                     ("cold-cough-and-flu",    "cough-syrups",         "Expectorant",     ["cough", "phlegm", "chest-congestion"],                            False),
    "Fertility":                       ("womens-health",         "hormonal-health",      "Fertility",       ["fertility", "infertility", "ovulation"],                          True),
    "Hematinic":                       ("vitamins-and-supplements","minerals",           "Iron Supplement", ["anaemia", "iron-deficiency", "low-haemoglobin"],                  False),
    "Mineral / Vitamin":               ("vitamins-and-supplements","multivitamins",      "Multivitamin",    ["nutrition", "deficiency", "energy"],                              False),
    "Mood stabilizer":                 ("mental-wellness",       "serious-mental-illness","Mood Stabilizer",["bipolar", "mood-swings"],                                         True),
    "Muscle relaxant + NSAID":         ("bone-joint-and-muscle", "muscle-relaxants",     "Muscle Relaxant + NSAID", ["muscle-spasm", "back-pain", "body-pain"],                False),
    "Nasal hygiene":                   ("cold-cough-and-flu",    "decongestants",        "Nasal Hygiene",   ["nasal-congestion", "blocked-nose"],                               False),
    "Neuropathic supplement":          ("bone-joint-and-muscle", "nerve-pain",           "Neuropathic Supplement", ["nerve-pain", "neuropathy", "diabetic-neuropathy"],         False),
    "Ophthalmic / Otic":               ("eye-and-ear-care",      "eye-drops",            "Ophthalmic / Otic",["eye-infection", "ear-infection"],                                False),
    "Opioid combination":              ("fever-and-pain-relief", "severe-pain",          "Opioid Combo",    ["severe-pain", "post-surgery-pain"],                               True),
    "Pediatric supplement":            ("baby-and-child-care",   "baby-essentials",      "Pediatric Supplement", ["child-nutrition", "kids-vitamins"],                          False),
    "Topical immunomodulator":         ("skin-care",             "steroid-creams",       "Topical Immunomodulator", ["eczema", "atopic-dermatitis"],                          True),
    "Topical moisturizer":             ("skin-care",             "steroid-creams",       "Moisturizer",     ["dry-skin", "eczema"],                                             False),
    "Topical soothing":                ("skin-care",             "steroid-creams",       "Skin Soothing",   ["irritation", "minor-burns", "skin-soothing"],                     False),
    "Topical steroid + antibiotic":    ("skin-care",             "steroid-creams",       "Steroid + Antibiotic", ["eczema-with-infection", "skin-infection"],                  False),
    "Urology / Dermatology":           ("womens-health",         "urinary-care",         "Urology",         ["urinary-issues", "skin-fungal"],                                  True),
    "Anti-allergic ophthalmic":        ("eye-and-ear-care",      "eye-drops",            "Eye Antihistamine", ["eye-allergy", "red-eye", "itchy-eyes"],                         False),
    "Anti-asthmatic / Antihistamine":  ("respiratory-and-asthma","asthma-and-copd",      "Anti-asthmatic",  ["asthma", "allergy", "wheezing"],                                  True),
    "Anti-asthmatic / COPD":           ("respiratory-and-asthma","asthma-and-copd",      "Anti-COPD",       ["asthma", "copd", "breathing-difficulty"],                         True),
    "Anti-osteoporosis":               ("bone-joint-and-muscle", "arthritis-and-rheumatism", "Bisphosphonate", ["osteoporosis", "low-bone-density"],                            True),
    "Antibiotic (pediatric)":          ("infection-care",        "antibiotics",          "Antibiotic (Pediatric)", ["bacterial-infection", "child-infection"],                  True),
}

FALLBACK = ("fever-and-pain-relief", "body-pain", "General Medicine", ["general"], False)

# ---------------------------------------------------------------------------
# 2. Visual mapping — emoji per user category, tile palette cycle
# ---------------------------------------------------------------------------

CATEGORY_EMOJI = {
    "fever-and-pain-relief":      "🤒",
    "cold-cough-and-flu":         "🤧",
    "allergy-relief":             "🌸",
    "digestive-care":             "🫃",
    "heart-and-bp":               "❤️",
    "diabetes-care":              "🩸",
    "bone-joint-and-muscle":      "🦴",
    "skin-care":                  "🧴",
    "eye-and-ear-care":           "👁️",
    "respiratory-and-asthma":     "🫁",
    "mental-wellness":            "🧘",
    "womens-health":              "🌷",
    "baby-and-child-care":        "🍼",
    "infection-care":             "💉",
    "vitamins-and-supplements":   "🌿",
    "first-aid-and-personal-care":"🩹",
}

DOSAGE_FORM_EMOJI = {
    "Tablet": "💊", "Capsule": "💊", "Injection": "💉", "Syrup": "🍯",
    "Suspension": "🍼", "Solution": "💧", "Drops": "💧",
    "Eye drops": "👁️", "Ear drops": "👂",
    "Cream": "🧴", "Ointment": "🧴", "Gel": "🧴", "Lotion": "🧴",
    "Spray": "🌫️", "Inhaler": "🫁", "Patch": "🩹",
    "Powder": "🥛", "Granules": "🥛", "Sachet": "💧",
    "Suppository": "💊", "Pessary": "💊", "IV": "💧", "Vaccine": "💉",
}

# Per-category emoji wins; otherwise per-dosage-form; otherwise 💊
SHOW_DOSAGE_EMOJI_FOR = {
    "fever-and-pain-relief": False,
    "cold-cough-and-flu": False,
    "allergy-relief": False,
    "digestive-care": False,
    "heart-and-bp": False,
    "diabetes-care": False,
    "skin-care": True,    # creams/sprays vary visually
    "eye-and-ear-care": True,
    "respiratory-and-asthma": True,  # inhaler vs tablet
    "infection-care": True,  # injection vs tablet vs IV
    "first-aid-and-personal-care": True,
    "vitamins-and-supplements": False,
}

TILES = ["green", "blue", "amber", "rose", "violet", "sky", "slate"]

# ---------------------------------------------------------------------------
# 3. Brand alias map — top common medicines (mirrors taxonomy.ts BRAND_ALIASES)
# ---------------------------------------------------------------------------

BRAND_ALIASES: dict[str, list[str]] = {
    "paracetamol":      ["paracitamol", "paracetmol", "pcm", "dolo", "calpol", "metacin", "paracip"],
    "ibuprofen":        ["brufen", "combiflam", "ibugesic", "advil"],
    "aspirin":          ["ecosprin", "disprin", "asprin"],
    "diclofenac":       ["voveran", "voltaren", "diclomol"],
    "ketorolac":        ["ketorol", "ketanov", "toradol"],
    "metformin":        ["glycomet", "glucophage", "gluconorm", "glyciphage", "metformine"],
    "omeprazole":       ["omez", "prilosec", "omeprazol"],
    "pantoprazole":     ["pantop", "pan-d", "pantosec", "pantaprazole"],
    "esomeprazole":     ["nexium", "esomez"],
    "rabeprazole":      ["rabium", "razo"],
    "cetirizine":       ["cetzine", "zyrtec", "alerid", "okacet", "cetrizine"],
    "fexofenadine":     ["allegra", "fexova"],
    "loratadine":       ["claritin"],
    "azithromycin":     ["azithral", "azee", "azithromicin"],
    "amoxicillin":      ["mox", "novamox", "amoxil", "amoxicilin"],
    "cefixime":         ["taxim-o", "cefix", "zifi"],
    "ciprofloxacin":    ["cifran", "ciplox"],
    "ofloxacin":        ["oflox", "zenflox"],
    "metronidazole":    ["flagyl", "metrogyl"],
    "ondansetron":      ["emeset", "ondem", "vomikind"],
    "domperidone":      ["domstal"],
    "ranitidine":       ["rantac", "aciloc", "zinetac"],
    "amlodipine":       ["amlong", "amlokind", "stamlo"],
    "telmisartan":      ["telma", "tazloc"],
    "losartan":         ["losar", "covance"],
    "atorvastatin":     ["atorva", "lipitor"],
    "rosuvastatin":     ["rosuvas", "crestor"],
    "metoprolol":       ["metolar"],
    "glimepiride":      ["amaryl"],
    "salbutamol":       ["asthalin", "levolin"],
    "budesonide":       ["budecort"],
    "montelukast":      ["montair", "montek"],
    "sertraline":       ["zoloft", "serta", "sertima"],
    "escitalopram":     ["lexapro", "cipralex"],
    "alprazolam":       ["restyl", "alpax"],
    "clonazepam":       ["rivotril", "klonopin"],
    "cholecalciferol":  ["vitamin d3", "d-rise", "d3 60k", "d3"],
    "hydroxychloroquine": ["hcqs", "plaquenil"],
    "levothyroxine":    ["thyronorm", "eltroxin", "thyrofit"],
    "prednisolone":     ["wysolone", "omnacortil"],
    "diazepam":         ["valium", "calmpose"],
    "zolpidem":         ["stilnoct", "zolfresh"],
    "fluconazole":      ["forcan", "fluka"],
    "itraconazole":     ["itrahart"],
    "acyclovir":        ["herpex", "zovirax"],
    "oseltamivir":      ["tamiflu"],
}

# ---------------------------------------------------------------------------
# 4. Helpers
# ---------------------------------------------------------------------------

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")[:60] or "item"


def primary_brand(raw: str) -> str:
    return (raw.split(";")[0] or raw.split(",")[0] or "").strip() or "Generic"


def all_brands(raw: str) -> list[str]:
    return [b.strip() for b in re.split(r"[;,]", raw) if b.strip()]


def pick_emoji(category: str, dosage_form: str) -> str:
    if SHOW_DOSAGE_EMOJI_FOR.get(category, False) and dosage_form in DOSAGE_FORM_EMOJI:
        return DOSAGE_FORM_EMOJI[dosage_form]
    return CATEGORY_EMOJI.get(category, "💊")


def build_aliases(generic: str, brand_list: list[str], internal_class: str) -> list[str]:
    """Combine: generic + brand variants + curated misspellings + lowercased internal class."""
    seen: set[str] = set()
    out: list[str] = []

    def push(value: str) -> None:
        v = value.strip().lower()
        if v and v not in seen:
            seen.add(v)
            out.append(v)

    push(generic)
    for b in brand_list:
        push(b)
    # Pull curated typos & alternate brands for the generic
    key = generic.split()[0].lower() if generic else ""
    for alias in BRAND_ALIASES.get(key, []):
        push(alias)
    push(internal_class.lower())
    return out


def humanize_pack(dosage_form: str, pack_size: str) -> str:
    if not pack_size:
        return dosage_form or ""
    if not dosage_form:
        return pack_size
    if dosage_form.lower() in pack_size.lower():
        return pack_size
    return f"{dosage_form} · {pack_size}"


def build_product(idx: int, row: dict) -> dict:
    raw_cat = (row.get("category") or "").strip()
    cat, sub, internal, conditions, default_rx = PHARMA_MAP.get(raw_cat, FALLBACK)

    brand = primary_brand(row.get("brand_examples", ""))
    brand_list = all_brands(row.get("brand_examples", ""))
    generic = (row.get("generic_name") or "").strip()
    dosage_form = (row.get("dosage_form") or "").strip()
    strength = (row.get("strength") or "").strip()
    pack = (row.get("pack_size") or "").strip()
    sub_cat = (row.get("sub_category") or "").strip()

    mrp = int(row["indicative_mrp_inr"])
    if idx % 3 == 0:
        price = mrp
    else:
        discount_pct = 8 + ((idx * 7) % 11)
        price = max(1, round(mrp * (100 - discount_pct) / 100))

    in_stock = (idx % 13) != 0

    name = generic + (f" {strength}" if strength else "")

    # tags = symptom keywords + dosage form + rx-/otc-
    tags = list(conditions)
    if dosage_form:
        tags.append(dosage_form.lower())
    tags.append("rx" if default_rx else "otc")

    return {
        "id": row["id"],
        "slug": slugify(f"{brand}-{generic}-{strength}"),
        "name": name.strip(),
        "brand": brand,
        "manufacturer": brand,  # CSV doesn't include manufacturer; use primary brand
        "dosage": strength or None,
        "dosageForm": dosage_form or None,
        "pack": humanize_pack(dosage_form, pack),
        "category": cat,
        "subcategory": sub,
        "internalClass": internal,
        "tags": list(dict.fromkeys(tags)),
        "conditions": list(dict.fromkeys(conditions)),
        "aliases": build_aliases(generic, brand_list, internal),
        "price": price,
        "mrp": mrp,
        "inStock": in_stock,
        "stockCount": (idx * 7) % 240 if in_stock else 0,
        "rxRequired": default_rx,
        "emoji": pick_emoji(cat, dosage_form),
        "tile": TILES[idx % len(TILES)],
        "imageUrl": f"/medicines/{row['id']}.jpg",
        "description": (
            f"{generic} {strength} {dosage_form}. {raw_cat}"
            + (f" — {sub_cat}." if sub_cat else ".")
        ).strip(),
    }


def main() -> None:
    with CSV_PATH.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    curated_fps = load_curated_fingerprints()

    products: list[dict] = []
    seen_slugs: set[str] = set()
    seen_csv_keys: set[tuple[str, str, str, str]] = set()
    n_curated_dupes = 0
    n_internal_dupes = 0

    for i, row in enumerate(rows):
        # Skip CSV rows that match a curated product (same brand + generic + strength)
        if csv_fingerprint(row) in curated_fps:
            n_curated_dupes += 1
            continue
        # Skip strict internal duplicates (same brand + generic + strength + form)
        ck = csv_internal_key(row)
        if ck in seen_csv_keys:
            n_internal_dupes += 1
            continue
        seen_csv_keys.add(ck)

        p = build_product(i, row)
        # Drop None / empty
        p = {k: v for k, v in p.items() if v not in (None, "", [])}
        # Re-add empty arrays we want to keep as []
        for key in ("tags", "conditions", "aliases"):
            p.setdefault(key, [])
        # Dedupe slugs
        slug = p["slug"]
        if slug in seen_slugs:
            slug = f"{slug}-{p['id'].lower()}"
            p["slug"] = slug
        seen_slugs.add(slug)
        products.append(p)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(products)} products to {OUT_PATH.relative_to(ROOT)}")
    print(f"  (skipped {n_curated_dupes} curated duplicates, {n_internal_dupes} CSV-internal duplicates)")
    print()
    print("DISTRIBUTION BY USER CATEGORY:")
    for cat, n in Counter(p["category"] for p in products).most_common():
        print(f"  {n:4d}  {cat}")
    print()
    print("UNMAPPED PHARMA CLASSES (fell back to default):")
    unmapped = Counter(
        row.get("category", "").strip()
        for row in rows
        if row.get("category", "").strip() not in PHARMA_MAP
    )
    if not unmapped:
        print("  (none — every CSV class is mapped)")
    else:
        for c, n in unmapped.most_common():
            print(f"  {n:4d}  {c}")


if __name__ == "__main__":
    main()
