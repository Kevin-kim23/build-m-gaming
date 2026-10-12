# 전투·보상 밸런스 실험실

게임 규칙 코드를 **그대로 불러와서** 전투를 컴퓨터로 돌려 보는 도구입니다. 사용자 저장에는 접근하지 않고, 메모리 안에서만 계산합니다. 게임 코드는 바꾸지 않습니다.
분석 결과와 해석은 [docs/balance/BALANCE_ANALYSIS_2026-10-12.md](../../docs/balance/BALANCE_ANALYSIS_2026-10-12.md)에 있습니다.

기준 군대는 `tools/campaign-sim.mjs`의 `referenceArmy`(스테이지 권장 전력, 해금된 모든 장비를 같은 강화 단계로)를 씁니다.

| 명령 | 확인하는 것 |
|---|---|
| `node tools/balance-lab/level-tolerance.mjs` | 권장 강화 -10 ~ +10, 50강일 때 승패·시간 |
| `node tools/balance-lab/min-level.mjs` | 스테이지 구간별로 이기는 최소 강화 단계와 여유 |
| `node tools/balance-lab/deck-diversity.mjs` | 출전 6칸의 모든 조합을 돌려 어떤 장비가 승리에 쓰이는지 |
| `node tools/balance-lab/old-gear-share.mjs` | 오래된 장비를 50강까지 키워도 후반 덱 화력에서 차지하는 비율 |
| `node tools/balance-lab/policies.mjs` | 플레이 방식(안 함 / 싼 것 / 센 것 / 상성 / 마나 아끼기)별 결과 |
| `node tools/balance-lab/enemy-impact.mjs` | 적 부대를 없앴을 때 결과가 얼마나 달라지는지 |
| `node tools/balance-lab/power-effect.mjs` | 군대 규모(전력)와 방치·약한 조건의 영향 |
| `node tools/balance-lab/effort-mana.mjs` | 3별 조건, 보상 대 터치 수입, 기본 덱 이탈, 마나 흐름 |
| `node tools/balance-lab/reward-economy.mjs` | 보상 대 수입·강화비 |
| `node tools/balance-lab/cap-analysis.mjs` | 마지막 스테이지(181~200)에 필요한 전투력 배수 |
| `node tools/balance-lab/extended-levels.mjs` | 강화를 50강 이후로 늘렸을 때 비용·시간·전투력 |

## 한계
- 사람이 아닌 단순한 규칙으로 플레이합니다(0.5초마다 한 번 판단). 실제 사람은 더 잘하거나 더 못할 수 있습니다.
- 수입은 군대+장비만 계산합니다. 시설·물약·개인 장비는 빠져 있어서 실제 수입은 더 높습니다.
- 모든 장비를 같은 강화 단계로 가정합니다.
- 대안 규칙(장비 가치 평준화, 적 강화) 실험은 저장소 코드를 복사한 별도 폴더에서만 했고 저장소에는 넣지 않았습니다. 방법은 분석 문서 6장에 적었습니다.
