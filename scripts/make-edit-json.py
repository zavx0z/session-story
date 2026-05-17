#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(input("Абсолютный путь к проекту: ").strip()).expanduser().resolve()
OUT = ROOT / ".ai" / "edit.json"

OUT.parent.mkdir(parents=True, exist_ok=True)

patch = {
    "description": "Пустой шаблон AI edit patch. Заполни operations.",
    "operations": []
}

OUT.write_text(json.dumps(patch, ensure_ascii=False, indent=2) + "\n")
print(f"Создано: {OUT}")
