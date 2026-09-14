/** 검증 실패 시 던지는 `Error`의 메시지. */
export const MESSAGES = {
  REQUIRED_ERROR: '단어를 입력해 주세요',
  LENGTH_ERROR: '5글자를 입력해 주세요',
  DEFINITION_ERROR: '단어를 찾을 수 없습니다.',
} as const

/**
 * 추측한 글자의 판정 상태.
 *
 * `Typing`은 `Wordle`의 판정 결과로는 나오지 않는다.
 */
export const GUESS_STATUS = {
  Correct: 'Correct',
  Partial: 'Partial',
  Incorrect: 'Incorrect',
  Typing: 'Typing',
} as const

/** 게임 진행 상태. 승리와 패배를 구분하지 않고 끝나면 `Over`다. */
export const GAME_STATUS = {
  Over: 'Over',
  Playing: 'Playing',
} as const

/** 정답·추측 단어의 글자 수. */
export const ANSWER_MAX_LENGTH = 5
/** 추측할 수 있는 최대 횟수. */
export const GUESS_MAX_LENGTH = 6
