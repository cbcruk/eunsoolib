import dayjs from 'dayjs'

export class DateNavigator {
  private format: string
  private current: dayjs.Dayjs

  constructor(initialDate: string, format = 'YYYY-MM-DD') {
    this.format = format
    this.current = dayjs(initialDate, format)
  }

  toString() {
    return this.current.format(this.format)
  }

  next() {
    this.current = this.current.add(1, 'day')

    return this.toString()
  }

  previous() {
    this.current = this.current.subtract(1, 'day')

    return this.toString()
  }

  set(date: string) {
    this.current = dayjs(date, this.format)
  }

  get() {
    return this.toString()
  }
}
