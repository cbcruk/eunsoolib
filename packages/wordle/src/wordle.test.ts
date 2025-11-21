import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Wordle } from './wordle'
import { GAME_STATUS, GUESS_STATUS, MESSAGES } from './wordle.constants'
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
        Wordle.create(undefined, mockValidator)
      ).rejects.toThrow(MESSAGES.REQUIRED_ERROR)
    })

    it('5글자가 아닌 경우 예외를 던져야 한다', async () => {
      await expect(() => Wordle.create('app', mockValidator)).rejects.toThrow(
        MESSAGES.LENGTH_ERROR
      )
    })

    it('유효하지 않은 단어일 경우 예외를 던져야 한다', async () => {
      mockValidator = vi.fn(async () => false)

      await expect(() => Wordle.create('zxcvb', mockValidator)).rejects.toThrow(
        MESSAGES.DEFINITION_ERROR
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
        '더 이상 입력할 수 없습니다.'
      )
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
})
