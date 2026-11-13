import { describe, expect, it } from 'vitest'
import { errMessage, isMissingSchema } from './repo'

describe('isMissingSchema', () => {
  const cases = [
    { name: 'undefined column', err: { code: '42703', message: 'column expenses.is_paid does not exist' }, want: true },
    { name: 'undefined table', err: { code: '42P01', message: 'relation "public.clothes" does not exist' }, want: true },
    { name: 'PostgREST unknown column on insert', err: { code: 'PGRST204', message: "Could not find the 'is_paid' column" }, want: true },
    { name: 'PostgREST unknown table', err: { code: 'PGRST205', message: "Could not find the table 'public.clothes'" }, want: true },
    { name: 'check violation is not schema', err: { code: '23514', message: 'violates check constraint' }, want: false },
    { name: 'network error', err: new TypeError('Failed to fetch'), want: false },
    { name: 'null', err: null, want: false },
  ]
  for (const c of cases) it(c.name, () => expect(isMissingSchema(c.err)).toBe(c.want))
})

describe('errMessage', () => {
  it.each([
    [new Error('boom'), 'boom'],
    [{ message: 'new row for relation "clothes" violates check constraint "clothes_kind_check"' }, 'หมวดนี้ยังใช้ไม่ได้ ต้องรัน SQL 007 (หมวดชุดนอน/ชุดสนามบิน) ใน Supabase ก่อน'],
    [null, 'เกิดข้อผิดพลาด'],
    ['text', 'เกิดข้อผิดพลาด'],
  ])('%o', (e, want) => {
    expect(errMessage(e)).toBe(want)
  })
})
