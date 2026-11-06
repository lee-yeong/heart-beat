"""교양 편람 PDF → data/courses.json 변환.

사용법: python scripts/convert_courses.py
필요: pip install pypdf
없는 값은 추측하지 않고 null로 둔다. 과목 설명은 원본에 없으므로 모두 null.
"""
import json
import re
import sys
from pathlib import Path

import pypdf

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "courses-source" / "핵심심화교양_260818.pdf"
OUT = ROOT / "data" / "courses.json"
SEMESTER = "2026학년도 2학기"

# 수업교시기준.md 기준 (60분 단위 교시와 90분 단위 교시)
P60 = {
    "0": ("08:00", "08:50"), "1": ("09:00", "09:50"), "2": ("10:00", "10:50"),
    "3": ("11:00", "11:50"), "4": ("12:00", "12:50"), "5": ("13:00", "13:50"),
    "6": ("14:00", "14:50"), "7": ("15:00", "15:50"), "8": ("16:00", "16:50"),
    "9": ("17:00", "17:50"), "야1": ("18:00", "18:50"), "야2": ("18:55", "19:45"),
    "야3": ("19:50", "20:40"), "야4": ("20:45", "21:35"), "야5": ("21:40", "22:30"),
}
P90 = {
    "0A-0": ("07:30", "08:45"), "1-2A": ("09:00", "10:15"), "2B-3": ("10:30", "11:45"),
    "4-5A": ("12:00", "13:15"), "5B-6": ("13:30", "14:45"), "7-8A": ("15:00", "16:15"),
    "8B-9": ("16:30", "17:45"), "야1-2A": ("18:00", "19:15"), "야2B-3": ("19:25", "20:40"),
    "야4-5A": ("20:50", "22:05"),
}

ROW = re.compile(r"^(?:\d\s+)?(핵교|심교)\s+([0-9A-Z]{10})\s+(.+?)\s+(\d)\s+(\S+)\s*(.*)$")
SEG = re.compile(r"([월화수목금토일])\s+([^()]+?)\s*\(([^)]+)\)")
HEADER = re.compile(r"^(\(핵심\))?(\S+)\s+2026학년도2학기$")


def period_range(tokens):
    times = []
    for t in tokens:
        if t in P60:
            times.append(P60[t])
        elif t in P90:
            times.append(P90[t])
        else:
            return None
    if not times:
        return None
    return f"{min(s for s, _ in times)}~{max(e for _, e in times)}"


def split_room(raw):
    """'12-103' → ('12호관', '103'), 'ZC-102' → ('ZC', '102')."""
    if "-" not in raw:
        return None, raw or None
    b, r = raw.split("-", 1)
    building = f"{int(b)}호관" if b.isdigit() else b
    return building, r


def main():
    reader = pypdf.PdfReader(str(SRC))
    courses, unmatched = [], []
    area = None
    for page in reader.pages:
        for line in (page.extract_text() or "").splitlines():
            line = line.strip()
            h = HEADER.match(line)
            if h:
                area = ("핵심교양" if h.group(1) else "심화교양") + "·" + h.group(2)
                continue
            m = ROW.match(line)
            if not m:
                if re.search(r"(핵교|심교)\s+[0-9A-Z]{10}", line):
                    unmatched.append(line)
                continue
            _, code, name, credits, prof, rest = m.groups()
            online = "온라인" in rest
            segs = SEG.findall(rest) if not online else []
            schedule = []
            for day, periods, room in segs:
                building, room_no = split_room(room.strip())
                schedule.append({
                    "day": day,
                    "periods": periods.split(),
                    "time": period_range(periods.split()),
                    "building": building,
                    "room": room_no,
                })
            first = schedule[0] if schedule else None
            days = "·".join(dict.fromkeys(s["day"] for s in schedule)) or None
            times = list(dict.fromkeys(s["time"] for s in schedule if s["time"]))
            courses.append({
                "id": code,
                "name": name.strip(),
                "category": area,
                "description": None,
                "professor": prof,
                "day": days,
                "time": times[0] if len(times) == 1 else (" / ".join(times) if times else None),
                "building": first["building"] if first else None,
                "room": first["room"] if first else None,
                "credits": int(credits),
                "online": online,
                "schedule": schedule,
            })

    OUT.write_text(json.dumps({
        "source": "인천대학교 2026학년도 2학기 수강신청편람 (핵심·심화교양)",
        "semester": SEMESTER,
        "is_sample": False,
        "courses": courses,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"courses: {len(courses)}  online: {sum(c['online'] for c in courses)}  unmatched: {len(unmatched)}")
    for u in unmatched:
        print("  UNMATCHED:", u, file=sys.stderr)


if __name__ == "__main__":
    main()
