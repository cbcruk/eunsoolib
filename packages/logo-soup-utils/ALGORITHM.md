# 로고 정규화 알고리즘

서로 다른 종횡비·밀도·배경을 가진 로고들을 한 줄에 나열할 때, 픽셀 치수가 아니라 **사람이 지각하는 크기**가 균일해 보이도록 맞추는 것이 목표다. 이 문서는 각 단계의 공식과 그 유도·직관을 정리한다.

기호 약속: 원본 이미지 크기를 $w \times h$, 다운샘플 크기를 $s_w \times s_h$로 쓴다. 픽셀의 색은 $(r, g, b, a)$이며 각 채널은 $[0, 255]$ 정수다.

---

## 0. 다운샘플링 — 스캔 비용을 크기와 무관하게 고정

픽셀 스캔은 $O(w h)$다. $5944 \times 752$ 같은 원본을 그대로 훑으면 수백만 픽셀을 돌지만, 바운딩 박스·질량중심·밀도 같은 **통계량**은 저해상도에서도 충분히 정확하다. 그래서 총 픽셀 수를 고정 예산 $B = 2048$ 이하로 줄인 축소본에서 스캔한다.

가로·세로를 같은 비율 $\rho$로 줄이면 면적은 $\rho^2$로 줄어든다. 축소 후 면적을 예산에 맞추려면

$$
(w\rho)(h\rho) = B \;\Longrightarrow\; \rho = \sqrt{\frac{B}{w h}}.
$$

따라서

$$
\rho = \begin{cases} \sqrt{B / (w h)} & w h > B \\ 1 & \text{otherwise} \end{cases},
\qquad
s_w = \max\!\big(1,\ \mathrm{round}(w \rho)\big), \quad
s_h = \max\!\big(1,\ \mathrm{round}(h \rho)\big).
$$

각 차원을 독립적으로 반올림하므로 $s_w s_h$가 $B$를 약간 넘을 수 있지만(예: $4000\times1000 \to 91\times23 = 2093$), 종횡비는 보존된다.

> 구현: `downsampleDimensions(w, h)`

---

## 픽셀 표현 — 리틀엔디언 워드

Canvas `ImageData.data`는 바이트 배열 $[r, g, b, a, r, g, b, a, \dots]$이다. 이를 `Uint32Array`로 보면 픽셀 하나가 32비트 한 워드가 되어 읽기가 빠르다. 리틀엔디언에서 메모리 바이트 순서가 $R, G, B, A$이므로 워드의 비트 배치는 $\texttt{0xAABBGGRR}$가 된다.

$$
p = (a \ll 24) \mathbin{|} (b \ll 16) \mathbin{|} (g \ll 8) \mathbin{|} r,
$$

$$
a = p \ggg 24, \quad
b = (p \ggg 16) \mathbin{\&}\ \texttt{0xff}, \quad
g = (p \ggg 8) \mathbin{\&}\ \texttt{0xff}, \quad
r = p \mathbin{\&}\ \texttt{0xff}.
$$

> 구현: `asUint32(data)` (복사 없이 같은 버퍼를 뷰로 재해석)

---

## 1. 배경색 추정 — 테두리 픽셀의 최빈색

로고는 보통 중앙에 놓이고 가장자리는 배경이다. 테두리 픽셀(맨 윗줄·아랫줄·좌우 끝열)만 표본으로 모으면 배경색을 알 수 있다.

**색 양자화.** JPEG 노이즈·안티앨리어싱이 있어도 같은 버킷에 모이도록, 각 채널의 상위 3비트만 쓴다($\text{SHIFT}=5$, $\text{LEVELS}=2^{8-5}=8$). 색 $(r,g,b)$의 버킷 인덱스는

$$
k(r,g,b) = \Big(\big(r \ggg 5\big)\cdot 8 + \big(g \ggg 5\big)\Big)\cdot 8 + \big(b \ggg 5\big) \in [0,\ 8^3),
$$

즉 $256^3$ 색을 $8^3 = 512$ 버킷으로 줄인다.

**투표.** 테두리 픽셀 중 $a \ge 128$인 것만 불투명 표로 세어 해당 버킷에 색 합을 누적하고, $a < 128$은 투명 표로 따로 센다. 투명 표 비율이 10%를 넘으면 투명 배경 로고로 판단한다.

$$
\text{transparent} \iff N_{\text{trans}} > 0.1\,\big(N_{\text{opaque}} + N_{\text{trans}}\big).
$$

**배경색.** 최빈 버킷 $k^{*} = \arg\max_k \text{count}[k]$의 평균색을 배경으로 본다.

$$
(b_R, b_G, b_B) = \left(
\frac{\textstyle\sum R_{k^{*}}}{\text{count}[k^{*}]},\
\frac{\textstyle\sum G_{k^{*}}}{\text{count}[k^{*}]},\
\frac{\textstyle\sum B_{k^{*}}}{\text{count}[k^{*}]}
\right).
$$

> 구현: `analyzePerimeter(data32, sw, sh)`

---

## 2. 단일 패스 스캔 — bbox·시각중심·밀도·배경휘도

한 번의 순회로 네 통계량을 동시에 구한다. 다운샘플 좌표를 원본으로 되돌리는 배율은 $\sigma_x = w / s_w,\ \sigma_y = h / s_h$.

### 콘텐츠 판별과 가중치

채널 임계 $t$(기본 10)에 대해, 색거리 비교는 제곱끼리 해서 $\sqrt{\cdot}$를 피한다. RGB 3축에 임계를 적용한 제곱거리 문턱은

$$
D_t^2 = 3 t^2.
$$

거의 투명한 픽셀($a \le t$)은 콘텐츠가 아니다. 나머지는 두 모드로 나뉜다.

**투명 로고 (alpha-only).** 알파 자체가 콘텐츠 신호다.

$$
w_i = a^2, \qquad \text{op}_i = a.
$$

**불투명 로고 (color keying).** 배경색과의 제곱거리

$$
d^2 = (r - b_R)^2 + (g - b_G)^2 + (b - b_B)^2
$$

가 문턱 미만($d^2 < D_t^2$)이면 배경으로 간주해 건너뛴다. 콘텐츠 픽셀의 가중치와 불투명도는

$$
w_i = d^2 \cdot a, \qquad \text{op}_i = \min\!\big(a,\ \sqrt{d^2}\big).
$$

> **왜 가중치가 색거리의 제곱인가.** 질량중심은 "잉크가 진하게 몰린 곳"을 잡아야 한다. 색거리를 제곱하면 배경과 또렷이 대비되는 픽셀(진한 글자·아이콘)이 가중치를 압도하고, 배경에 가까운 흐린 안티앨리어싱 픽셀은 거의 무시된다. 즉 "눈에 띄는 부분"이 중심을 지배한다. (원 블로그 글은 $\sqrt{d}$로 서술했지만 출하 코드는 $d^2$이며, $\sqrt{\cdot}$는 여기가 아니라 위 불투명도 $\text{op}_i$ 계산에 쓰인다.)

### 바운딩 박스

콘텐츠 픽셀의 다운샘플 좌표 극값 $(x_{\min}, x_{\max}, y_{\min}, y_{\max})$에서, 시작은 내림·끝은 올림으로 콘텐츠를 깎지 않게 원본 좌표로 환산한다.

$$
\text{box}.x = \lfloor x_{\min}\,\sigma_x \rfloor, \qquad
\text{box}.\text{width} = \min\!\big(\lceil (x_{\max}+1)\,\sigma_x \rceil,\ w\big) - \text{box}.x
$$

($y$도 동일.)

### 시각적 질량중심과 오프셋

픽셀 중심 $(x + 0.5,\ y + 0.5)$를 가중합한 무게중심을 원본 좌표로 환산한다.

$$
g_x = \sigma_x \cdot \frac{\sum_i (x_i + 0.5)\, w_i}{\sum_i w_i}, \qquad
g_y = \sigma_y \cdot \frac{\sum_i (y_i + 0.5)\, w_i}{\sum_i w_i}.
$$

이를 콘텐츠 박스 기하중심과 비교한 오프셋이 정렬에 쓰인다(양수면 시각중심이 오른쪽/아래로 치우침).

$$
\text{offset}_x = (g_x - \text{box}.x) - \frac{\text{box}.\text{width}}{2}, \qquad
\text{offset}_y = (g_y - \text{box}.y) - \frac{\text{box}.\text{height}}{2}.
$$

콘텐츠가 하나도 없으면 전체 이미지를 콘텐츠로 폴백하고 오프셋을 0으로 둔다.

### 배경 휘도 (불투명 이미지만)

ITU-R BT.601 가중치로 $[0,1]$ 정규화. 아래 조사 착시 보정에서 "배경이 얼마나 어두운가"로 쓴다.

$$
L = \frac{299\, b_R + 587\, b_G + 114\, b_B}{255000}.
$$

### 픽셀 밀도

스캔 박스 면적 $A = (x_{\max}-x_{\min}+1)(y_{\max}-y_{\min}+1)$, 콘텐츠 픽셀 수 $N_f$에 대해 채움면적비(얼마나 빽빽한가)와 평균 불투명도(평균 진하기)를 구해 곱한다.

$$
\text{coverage} = \frac{N_f}{A}, \qquad
\overline{\text{op}} = \frac{1}{N_f}\sum_i \frac{\text{op}_i}{255}, \qquad
\rho_{\text{px}} = \text{coverage} \cdot \overline{\text{op}}.
$$

면적도 넓고 진하기도 한 로고일수록 밀도가 높다.

> 구현: `scanPixels(options)`

---

## 3. 정규화 치수 — PINF → 조사 보정 → 밀도 보정

콘텐츠 종횡비 $R = c_w / c_h$에서 출발해 세 보정이 순서대로 곱해진다. ($c_w$ 또는 $c_h$가 0이면 $\text{baseSize}$ 정사각형으로 폴백.)

### (1) 비례 정규화 (PINF)

기준 크기 $S$($=\text{baseSize}$, 기본 48)와 감쇠 지수 $\alpha$($=\text{scaleFactor}$, 기본 0.5)에 대해

$$
W_0 = R^{\alpha} \cdot S, \qquad H_0 = \frac{W_0}{R} = R^{\alpha - 1}\cdot S.
$$

극단을 보면 직관이 잡힌다.

- $\alpha = 0$: $W_0 = S$로 **모든 로고의 너비가 같다** → 와이드 로고가 세로로 거대해짐.
- $\alpha = 1$: $H_0 = S$로 **모든 로고의 높이가 같다** → 와이드 로고가 가로로 거대해짐.

둘 다 한쪽 극단이라 보기 싫다. $\alpha = 0.5$는 그 사이를 거듭제곱으로 보간해, 종횡비를 제곱근으로 "감쇠"시킨다($16{:}1$ 로고도 너비는 4배에 그침). 게다가 이때 면적은 종횡비와 무관하게 일정해진다.

$$
W_0 H_0 = R^{\alpha}S \cdot R^{\alpha-1}S = R^{2\alpha - 1}\,S^2
\;\overset{\alpha = 0.5}{=}\; S^2.
$$

즉 $\alpha = 0.5$는 **모든 로고가 같은 넓이**를 갖게 하는 지점이다.

### (2) 조사 착시 보정 (Helmholtz irradiation)

어두운 배경 위의 밝은 형상은 빛 번짐 때문에 실제보다 커/굵어 보인다. 효과는 배경이 어두울수록, 형상이 빽빽할수록 강하다. 배경 어둡기 $d = 1 - L$, 밀도 $\rho_{\text{px}}$(없으면 0.5)에 대해 최대 8%까지 줄여 지각 크기를 맞춘다. 배경휘도를 아는 불투명 이미지에만 적용한다.

$$
\kappa_{\text{irr}} = 1 - d\,\rho_{\text{px}}\cdot 0.08, \qquad
(W_1, H_1) = \kappa_{\text{irr}}\,(W_0, H_0).
$$

### (3) 밀도 보정

같은 치수라도 빽빽한 로고는 무겁게, 얇은 로고는 가볍게 보인다. 기준 밀도 $\rho_0 = 0.35$보다 진하면 축소, 옅으면 확대한다. 보정 강도 $\beta$($=\text{densityFactor}$, 기본 0이면 이 단계 생략)에 대해

$$
\kappa_{\text{den}} = \mathrm{clamp}\!\left(\left(\frac{\rho_0}{\rho_{\text{px}}}\right)^{\beta / 2},\ 0.5,\ 2\right),
\qquad
(W_2, H_2) = \kappa_{\text{den}}\,(W_1, H_1).
$$

역수 $\rho_0/\rho_{\text{px}}$는 "진할수록 작게"를 만들고, 지수 $\beta/2$는 과보정을 막도록 강도를 감쇠하며, $[0.5, 2]$ 클램프로 극단을 차단한다.

### 최종

$$
W = \mathrm{round}(W_2), \qquad H = \mathrm{round}(H_2).
$$

> 구현: `calculateNormalizedDimensions(m, options?)`

---

## 4. 시각중심 정렬 → CSS transform

측정 때 구한 오프셋(콘텐츠 좌표계)을 렌더 치수 배율로 환산해 `translate`를 만든다. 렌더 크기 $(W, H)$, 콘텐츠 크기 $(c_w, c_h)$에서 배율은 $\tau_x = W / c_w,\ \tau_y = H / c_h$.

**부호 반전.** 오프셋은 "시각중심이 오른쪽/아래로 치우친 정도"이므로, 그만큼 왼쪽/위로 당겨야 시각중심이 레이아웃 슬롯의 가운데에 온다.

$$
T_x = -\,\text{offset}_x \cdot \tau_x \ \ (\text{useX}), \qquad
T_y = -\,\text{offset}_y \cdot \tau_y \ \ (\text{useY}).
$$

정렬 모드 `alignBy`가 어느 축을 쓸지 정한다.

| `alignBy` | useX | useY |
| --- | :---: | :---: |
| `bounds` | — | — (보정 없음) |
| `visual-center` | ✓ | ✓ |
| `visual-center-x` | ✓ | |
| `visual-center-y` (기본) | | ✓ |

0.5px 미만의 미세 이동은 불필요한 리페인트를 막기 위해 무시하고, 그 이상이면 소수 첫째 자리로 반올림해 출력한다.

$$
\text{transform} =
\begin{cases}
\texttt{translate(}\,\frac{\mathrm{round}(10\,T_x)}{10}\,\texttt{px},\ \frac{\mathrm{round}(10\,T_y)}{10}\,\texttt{px}\texttt{)}
& |T_x| > 0.5 \ \lor\ |T_y| > 0.5 \\[4pt]
\text{undefined} & \text{otherwise.}
\end{cases}
$$

> 구현: `getVisualCenterTransform(m, renderWidth, renderHeight, alignBy?)`

---

## 출처

알고리즘은 `react-logo-soup`(sanity-labs)의 출하 코드 `src/core/{measure-pixels, normalize, get-visual-center-transform}.ts`를 환경 비의존 순수 함수로 재구성하고, 위 공식들을 그 코드 기준으로 검증한 것이다. 이 패키지는 코드 자체를 옮긴 것이 아니라 알고리즘의 수학을 정리·재구현한 것이다.
