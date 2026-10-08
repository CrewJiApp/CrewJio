"""Cross-check a list-view roster against roster-codes.json and classify each day for matching."""
import json, sys, datetime as dt
codes = json.load(open(sys.argv[1]))["codes"]
roster = json.load(open(sys.argv[2]))
LONG_HAUL_MIN = 8 * 60  # flights longer than this count as long-haul for tiredness

def hhmm(s): return int(s[:2]) * 60 + int(s[2:])
rows = roster["rows"]; days = {}
for r in rows: days.setdefault(r["date"], []).append(r)
unknown = sorted({r["duty"] for r in rows if r["duty"] not in codes})
print("Codes not in list:", unknown or "none")
print("Not in code list (column values):", sorted({r.get("actingRank") for r in rows if r.get("actingRank")} - {"FS"}), "\n")

out = []; last_longhaul_landing = None
for date in sorted(days):
    rs = days[date]; duties = {r["duty"] for r in rs}
    cats = {codes[d]["category"] for d in duties if d in codes}
    flights = [r for r in rs if r["duty"] == "FLY"]
    away = any(r["sector"] != "SIN" and "-" not in r["sector"] for r in rs if r["duty"] in ("LO", "STBY"))
    d = dt.date.fromisoformat(date)
    status, note = None, ""
    if cats & {"national_service", "leave", "private"}:
        status, note = "Blocked", "Reservist (untouchable)" if "national_service" in cats else "Leave"
    elif flights:
        dep = [f for f in flights if f["sector"].startswith("SIN-") and f.get("std")]
        arr = [f for f in flights if f["sector"].endswith("-SIN") and f.get("sta")]
        if dep and arr and dep[0]["date"] == arr[-1]["date"] and dep[0].get("rpt"):
            status, note = "Evening", f"Turnaround, back {arr[-1]['sta']}"
            if hhmm(arr[-1]["sta"]) >= 20 * 60: status, note = "Busy", f"Turnaround, back {arr[-1]['sta']}"
        elif arr:
            t = hhmm(arr[-1]["sta"])
            sector = arr[-1]["sector"]
            long_haul = sector.split("-")[0] in {"SFO", "MAN", "LHR", "JFK", "LAX", "FRA", "CDG"}
            if long_haul: last_longhaul_landing = d
            status, note = ("Tired", f"Lands {arr[-1]['sta']} from {sector.split('-')[0]}") if long_haul or t < 12 * 60 else ("Evening", f"Lands {arr[-1]['sta']}")
        elif dep:
            rpt = dep[0].get("rpt", dep[0]["std"])
            status, note = ("Morning", f"Reports {rpt}") if hhmm(rpt) >= 11 * 60 else ("Away", f"Departs {dep[0]['std']}")
        else:
            status, note = "Away", ""
    elif away or "layover" in cats:
        status, note = "Away", f"Layover {rs[0]['sector']}"
    elif cats <= {"off", "part_off"}:
        status, note = "Great", "Off"
        if last_longhaul_landing and (d - last_longhaul_landing).days == 1: status, note = "Tired", "Off, day after long-haul"
        nxt = days.get((d + dt.timedelta(days=1)).isoformat(), [])
        early = [r for r in nxt if r.get("rpt") and hhmm(r["rpt"]) < 4 * 60]
        if early: status, note = "Daytime", f"Off, but reports {early[0]['rpt']} next morning"
    else:
        status, note = "Busy", ", ".join(sorted(cats))
    out.append({"date": date, "day": d.strftime("%a"), "status": status, "note": note})
for o in out: print(f"{o['date']} {o['day']}  {o['status']:<8} {o['note']}")
json.dump(out, open(sys.argv[3], "w"), indent=1)
