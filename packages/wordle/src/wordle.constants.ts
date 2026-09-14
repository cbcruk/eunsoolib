/** 검증 실패 시 던지는 `Error`의 메시지. */
export const MESSAGES = {
  REQUIRED_ERROR: '단어를 입력해 주세요',
  LENGTH_ERROR: '5글자를 입력해 주세요',
  DEFINITION_ERROR: '단어를 찾을 수 없습니다.',
  GAME_OVER_ERROR: '더 이상 입력할 수 없습니다.',
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

/**
 * 게임 진행 상태. 끝나면 승패와 무관하게 `Over`다.
 *
 * 승패는 {@link GAME_RESULT}와 `Wordle.getGameResult()`로 구분한다.
 */
export const GAME_STATUS = {
  Over: 'Over',
  Playing: 'Playing',
} as const

/** 끝난 게임의 결과. 정답을 맞혔으면 `Won`, 맞히지 못하고 추측 횟수를 다 썼으면 `Lost`다. */
export const GAME_RESULT = {
  Won: 'Won',
  Lost: 'Lost',
} as const

/** 정답·추측 단어의 글자 수. */
export const WORD_LENGTH = 5
/** 추측할 수 있는 최대 횟수. */
export const MAX_GUESSES = 6

/**
 * 정답·추측 단어의 글자 수. 최대값이 아니라 정확한 길이다.
 *
 * @deprecated {@link WORD_LENGTH}를 사용한다.
 */
export const ANSWER_MAX_LENGTH = WORD_LENGTH
/**
 * 추측할 수 있는 최대 횟수. 단어 길이가 아니다.
 *
 * @deprecated {@link MAX_GUESSES}를 사용한다.
 */
export const GUESS_MAX_LENGTH = MAX_GUESSES
