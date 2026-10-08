"""Build shared/roster-codes.json from the airline's roster code PDF (text extracted with pdftotext -layout)."""
import json, re, sys

src, out = sys.argv[1], sys.argv[2]
lines = open(src, encoding="utf-8", errors="ignore").read().replace("Â", "").splitlines()

codes, order = {}, []
for l in lines:
    m = re.match(r"^\s*([A-Z0-9]{2,10})\s+(.+?)\s*$", l)
    if not m or m.group(1) == "Code":
        continue
    code, desc = m.group(1), re.sub(r"\s+", " ", m.group(2))
    if code not in codes:
        codes[code] = desc
        order.append(code)

def idx(c): return order.index(c)
misc_start, leave_start = idx("5F99"), idx("AALV")

OFF = {"ATDO", "OFFD", "BOFF", "OFF", "LV99", "OD99", "RQ91", "RQ99", "RQPR", "RX99", "DILP", "SOFF", "VL99",
       "CQ99", "FF99", "GF99", "NDCP", "NDFC", "QF99", "RF99", "MM99", "WK99", "EXDO", "RST"}
PART_OFF = {"OFFA": "Off morning (until 12:00)", "OFFP": "Off afternoon (from 12:01)"}
NS = {"NTSV", "NR99"}
LAYOVER = {"LO", "MCLO"}
RESERVE = {"RD"}
# Private: friends only ever see "Unavailable" for these
SENSITIVE_WORDS = ["MEDICAL", "MEDICAL", "SUSPENSION", "INTERVIEW", "WRITTEN TEST", "MISSES FLT", "RESIGNATION",
                   "QURANTINE", "QUARANTINE", "SWAB", "STEPPED DOWN", "GROUNDED", "NO PAY", "NPL", "MATERNITY",
                   "MATNITY", "CHILDCARE", "ADOPTION", "COMPASSIONATE", "MATRIMONIAL", "PARENT CARE", "CONTRACT RENEWAL",
                   "PCT TEST", "MED LEAVE", "UNION"]

def classify(code, desc, i):
    d = desc.upper()
    if code in LAYOVER:
        return "layover", "Away (layover)", True, False
    if code in NS:
        return "national_service", "Away", True, False
    if code in PART_OFF:
        return "part_off", PART_OFF[code], False, False
    if code in OFF:
        return "off", "Off", False, False
    if code in RESERVE:
        return "reserve", "Reserve", True, False
    if any(w in d for w in SENSITIVE_WORDS) or code in {"MC", "MH", "MB", "MB01", "MB02", "SDFP", "HQO", "SHN", "LOA"}:
        return "private", "Unavailable", True, False
    if i >= leave_start:
        return "leave", "Away", True, False
    if i < idx("STBY") + 1 or code.startswith(("SS", "SN", "STAB")):
        return "standby", "Standby", True, True
    if i >= misc_start:
        return "busy", "Busy", True, False
    return "training", "Training", True, True

result = {}
for i, code in enumerate(order):
    cat, friends, blocks, swappable = classify(code, codes[code], i)
    result[code] = {"description": codes[code], "category": cat, "friendsSee": friends,
                    "blocksMatching": blocks, "swappable": swappable}

# Duty values that appear on the roster but not in the code list
result["FLY"] = {"description": "Flying duty (flight number + sector on the same row)", "category": "flight",
                 "friendsSee": "Flying", "blocksMatching": True, "swappable": True}

meta = {"source": "CM_ROSTER_CODES_24JUN21.pdf", "count": len(result),
        "categories": sorted({v["category"] for v in result.values()}),
        "notes": ["Unknown codes must be flagged 'needs a look' in import, never guessed.",
                  "category 'private' (medical, suspension, interviews, tests, family leave) is never shown to friends: they see 'Unavailable'.",
                  "national_service, leave and private always block matching (untouchable)."]}
json.dump({"meta": meta, "codes": result}, open(out, "w"), indent=1, ensure_ascii=False)
from collections import Counter
print(meta["count"], Counter(v["category"] for v in result.values()))
