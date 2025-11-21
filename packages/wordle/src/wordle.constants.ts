export const MESSAGES = {
  REQUIRED_ERROR: '단어를 입력해 주세요',
  LENGTH_ERROR: '5글자를 입력해 주세요',
  DEFINITION_ERROR: '단어를 찾을 수 없습니다.',
} as const

export const GUESS_STATUS = {
  Correct: 'Correct',
  Partial: 'Partial',
  Incorrect: 'Incorrect',
  Typing: 'Typing',
} as const

export const GAME_STATUS = {
  Over: 'Over',
  Playing: 'Playing',
} as const

export const ANSWER_MAX_LENGTH = 5
export const GUESS_MAX_LENGTH = 6
