"""Store a Gemini API key locally without showing it in the terminal."""

from getpass import getpass
from pathlib import Path
import os


project_root = Path(__file__).resolve().parent.parent
env_path = project_root / ".env.local"
api_key = getpass("Gemini API 키를 붙여넣고 Enter를 누르세요 (화면에는 보이지 않음): ").strip()
if api_key.startswith("GEMINI_API_KEY="):
    api_key = api_key.split("=", 1)[1].strip().strip("\"'")

if len(api_key) < 16 or any(character.isspace() for character in api_key):
    raise SystemExit("저장하지 않았습니다. Google AI Studio에서 만든 Gemini API 키를 확인해주세요.")

source_path = env_path if env_path.exists() else project_root / ".env.local.example"
lines = [
    line
    for line in source_path.read_text().splitlines()
    if line.split("=", 1)[0].strip() not in {"GEMINI_API_KEY", "GEMINI_MODEL"}
]
lines.extend(["GEMINI_API_KEY=" + api_key, "GEMINI_MODEL=gemini-3.5-flash-lite"])

descriptor = os.open(env_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(descriptor, "w") as output:
    output.write("\n".join(lines) + "\n")
env_path.chmod(0o600)
print("완료! Gemini 설정을 저장했습니다. 개발 서버를 다시 시작하면 적용됩니다.")
