import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Wordle } from './wordle'
import {
  ANSWER_MAX_LENGTH,
  GAME_RESULT,
  GAME_STATUS,
  GUESS_MAX_LENGTH,
  GUESS_STATUS,
  MAX_GUESSES,
  MESSAGES,
  WORD_LENGTH,
} from './wordle.constants'
import type { DictionaryValidator } from './wordle.types'

const VALID_WORD = 'apple'

describe('Wordle', () => {
  let mockValidator: DictionaryValidator

  beforeEach(() => {
    mockValidator = vi.fn(async () => true)
  })

  describe('create()', () => {
    it('유효한 단어로 인스턴스를 생성할 수 있어야 한다', async () => {
      const game = await Wordle.create(VALID_WORD, mockValidator)
      expect(game).toBeInstanceOf(Wordle)
    })

    it('단어가 없으면 예외를 던져야 한다', async () => {
      await expect(() =>
        Wordle.create(undefined, mockValidator),
      ).rejects.toThrow(MESSAGES.REQUIRED_ERROR)
    })

    it('5글자가 아닌 경우 예외를 던져야 한다', async () => {
      await expect(() => Wordle.create('app', mockValidator)).rejects.toThrow(
        MESSAGES.LENGTH_ERROR,
      )
    })

    it('유효하지 않은 단어일 경우 예외를 던져야 한다', async () => {
      mockValidator = vi.fn(async () => false)

      await expect(() => Wordle.create('zxcvb', mockValidator)).rejects.toThrow(
        MESSAGES.DEFINITION_ERROR,
      )
    })
  })

  describe('addGuessItem() & getGuessListWithStatus()', () => {
    it('입력한 단어에 대해 올바르게 판정할 수 있어야 한다', async () => {
      const game = await Wordle.create('apple', mockValidator)
      game.addGuessItem('allee')

      const statuses = game.getGuessListWithStatus()
      expect(statuses.length).toBe(1)

      expect(statuses[0]).toEqual([
        { char: 'a', status: GUESS_STATUS.Correct },
        { char: 'l', status: GUESS_STATUS.Partial },
        { char: 'l', status: GUESS_STATUS.Incorrect },
        { char: 'e', status: GUESS_STATUS.Incorrect },
        { char: 'e', status: GUESS_STATUS.Correct },
      ])
    })

    it('5글자가 아닌 단어를 입력하면 예외를 던져야 한다', async () => {
      const game = await Wordle.create(VALID_WORD, mockValidator)
      expect(() => game.addGuessItem('nope')).toThrow(MESSAGES.LENGTH_ERROR)
    })

    it('입력 횟수가 6회를 초과하면 예외를 던져야 한다', async () => {
      const game = await Wordle.create(VALID_WORD, mockValidator)

      for (let i = 0; i < 6; i++) {
        game.addGuessItem('guess')
      }

      expect(() => game.addGuessItem('again')).toThrow(
        '더 이상 입력할 수 없습니다.',
      )
    })

    it('정답을 맞힌 뒤에는 추측을 추가할 수 없어야 한다', async () => {
      const game = await Wordle.create(VALID_WORD, mockValidator)
      game.addGuessItem('grape')
      game.addGuessItem('apple')

      expect(() => game.addGuessItem('lemon')).toThrow(MESSAGES.GAME_OVER_ERROR)
      expect(game.guessList).toEqual(['grape', 'apple'])
      expect(game.getGuessListWithStatus()).toHaveLength(2)
    })

    it('guessList를 외부에서 바꿔도 게임 상태는 바뀌지 않아야 한다', async () => {
      const game = await Wordle.create(VALID_WORD, mockValidator)
      game.addGuessItem('grape')

      const list = game.guessList as string[]
      list.push('apple')

      expect(() => {
        ;(game as unknown as { guessList: string[] }).guessList = ['apple']
      }).toThrow(TypeError)
      expect(game.guessList).toEqual(['grape'])
      expect(game.getGameStatus()).toBe(GAME_STATUS.Playing)
    })
  })

  describe('getGameStatus()', () => {
    it('정답을 맞추지 못했고, 시도 횟수가 6회 미만이면 Playing 상태여야 한다', async () => {
      const game = await Wordle.create(VALID_WORD, mockValidator)
      game.addGuessItem('grape')

      expect(game.getGameStatus()).toBe(GAME_STATUS.Playing)
    })

    it('정답을 맞춘 경우 Over 상태여야 한다', async () => {
      const game = await Wordle.create(VALID_WORD, mockValidator)
      game.addGuessItem('apple')

      expect(game.getGameStatus()).toBe(GAME_STATUS.Over)
    })

    it('정답을 맞추지 못했지만 6회를 모두 사용한 경우 Over 상태여야 한다', async () => {
      const game = await Wordle.create(VALID_WORD, mockValidator)

      for (let i = 0; i < 6; i++) {
        game.addGuessItem('grape')
      }

      expect(game.getGameStatus()).toBe(GAME_STATUS.Over)
    })
  })

  describe('getGameResult()', () => {
    it('진행 중이면 null이어야 한다', async () => {
      const game = await Wordle.create(VALID_WORD, mockValidator)
      game.addGuessItem('grape')

      expect(game.getGameResult()).toBeNull()
    })

    it('정답을 맞히면 Won이어야 한다', async () => {
      const game = await Wordle.create(VALID_WORD, mockValidator)

      for (let i = 0; i < 5; i++) {
        game.addGuessItem('grape')
      }
      game.addGuessItem('apple')

      expect(game.getGameResult()).toBe(GAME_RESULT.Won)
    })

    it('6회를 모두 틀리면 Lost여야 한다', async () => {
      const game = await Wordle.create(VALID_WORD, mockValidator)

      for (let i = 0; i < 6; i++) {
        game.addGuessItem('grape')
      }

      expect(game.getGameResult()).toBe(GAME_RESULT.Lost)
    })
  })

  describe('상수', () => {
    it('이전 상수 이름은 새 이름과 같은 값을 가져야 한다', () => {
      expect(WORD_LENGTH).toBe(5)
      expect(MAX_GUESSES).toBe(6)
      expect(ANSWER_MAX_LENGTH).toBe(WORD_LENGTH)
      expect(GUESS_MAX_LENGTH).toBe(MAX_GUESSES)
    })
  })
})
